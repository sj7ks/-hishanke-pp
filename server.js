// server.js - Ühishanke Ultimate Server
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Load products
let products = require('./products.js');

// User sessions
const sessions = {}; // { userId: { cart: [], favorites: [], lastActions: {} } }

// Middleware
app.use(express.static(__dirname));
app.use(bodyParser.json());

// Logger
app.use((req,res,next)=>{
  console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
  next();
});

// Utilities
function getSession(userId){
  if(!sessions[userId]) sessions[userId] = { cart: [], favorites: [], lastActions: {} };
  return sessions[userId];
}
function canAct(userId,key,cooldown){
  const last = getSession(userId).lastActions[key] || 0;
  return Date.now() - last > cooldown;
}
function updateTimestamp(userId,key){
  getSession(userId).lastActions[key] = Date.now();
}

// Telegram notification
async function notifyMom(message){
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.MOM_CHAT_ID;
  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: message
    });
  } catch(err){ console.error("Telegram error:", err.message); }
}

// Endpoints
app.get('/products', (req,res)=>{
  const userId = req.query.userId;
  const session = getSession(userId);

  // Top 10 globally sold
  const top10 = [...products].sort((a,b)=> (b.soldCount||0) - (a.soldCount||0)).slice(0,10);

  // Past purchases
  const pastOrders = session.cart.map(i=>products.find(p=>p.id===i.productId)).filter(p=>p);

  // Remaining
  const remaining = products.filter(p=>!pastOrders.includes(p) && !top10.includes(p))
                            .sort((a,b)=> (b.soldCount||0) - (a.soldCount||0));

  const finalList = [...pastOrders, ...top10.filter(p=>!pastOrders.includes(p)), ...remaining];

  setTimeout(()=>res.json(finalList), 150);
});

app.post('/check-product', (req,res)=>{
  const { productId, userId } = req.body;
  const product = products.find(p=>p.id===productId);
  if(!product) return res.status(404).json({error:"Product not found"});
  if(!canAct(userId, `check-${productId}`, 120000)) return res.status(429).json({error:"Cooldown"});
  
  product.stock = Math.max(product.stock + Math.floor(Math.random()*3),0);
  product.lastChecked = new Date().toLocaleString();

  updateTimestamp(userId, `check-${productId}`);
  notifyMom(`User ${userId} checked "${product.name}" stock.`);

  setTimeout(()=>res.json({ok:true, product}), 180);
});

app.post('/buy-product', (req,res)=>{
  const { productId, quantity, userId } = req.body;
  const product = products.find(p=>p.id===productId);
  if(!product) return res.status(404).json({error:"Product not found"});
  if(quantity<=0 || quantity>product.stock) return res.status(400).json({error:"Invalid quantity"});
  if(!canAct(userId, `buy-${productId}`, 5000)) return res.status(429).json({error:"Cooldown"});

  product.stock -= quantity;
  product.soldCount = (product.soldCount||0) + quantity;

  const session = getSession(userId);
  const existing = session.cart.find(c=>c.productId===productId);
  if(existing) existing.quantity += quantity;
  else session.cart.push({ productId, quantity });

  updateTimestamp(userId, `buy-${productId}`);
  notifyMom(`User ${userId} bought ${quantity} x "${product.name}"`);

  setTimeout(()=>res.json({ok:true, product, cart: session.cart}),180);
});

app.get('/cart/:userId', (req,res)=>{
  const session = getSession(req.params.userId);
  const cartDetails = session.cart.map(i=>{
    const p = products.find(p=>p.id===i.productId);
    return { name:p.name, quantity:i.quantity, price:p.price, total:p.price*i.quantity };
  });
  const total = cartDetails.reduce((a,b)=>a+b.total,0);
  res.json({cart: cartDetails, totalPrice: total});
});

// Favorites
app.post('/favorite', (req,res)=>{
  const { productId, userId } = req.body;
  const session = getSession(userId);
  if(!session.favorites.includes(productId)) session.favorites.push(productId);
  res.json({favorites: session.favorites});
});

app.get('/favorites/:userId', (req,res)=>{
  const session = getSession(req.params.userId);
  const favs = session.favorites.map(id=>products.find(p=>p.id===id)).filter(p=>p);
  res.json(favs);
});

// Periodic save
setInterval(()=>{
  const data = "module.exports = "+JSON.stringify(products,null,2);
  fs.writeFile(path.join(__dirname,'products.js'), data, err=>{
    if(err) console.error("Failed to save products:",err);
  });
},60000);

app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));