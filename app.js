// app.js - Ühishanke Ultimate Backend (Mega Advanced)
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Load products
let products = require('./products.js');

// User sessions: { userId: { cart: [], lastActions: {}, favorites: [] } }
const userSessions = {};

// Middleware
app.use(express.static(__dirname));
app.use(bodyParser.json());

// Logger
function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}
app.use((req,res,next) => { log(`${req.method} ${req.url}`); next(); });

// Utilities
function getSession(userId){
  if(!userSessions[userId]) userSessions[userId] = { cart: [], lastActions: {}, favorites: [] };
  return userSessions[userId];
}

function canAct(userId, key, cooldown){
  return Date.now() - (getSession(userId).lastActions[key] || 0) > cooldown;
}

function updateTimestamp(userId,key){ getSession(userId).lastActions[key] = Date.now(); }

// Telegram notification
async function sendTelegram(msg){
  const token = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.MOM_CHAT_ID;
  if(!token || !chatId) return;
  try{
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ chat_id: chatId, text: msg })
    });
  }catch(e){ console.error("Telegram send error:", e);}
}

// API Endpoints

// Check product stock
app.post('/check-product',(req,res)=>{
  const { productId, userId } = req.body;
  const p = products.find(x=>x.id===productId);
  if(!p) return res.status(404).json({error:"Product not found"});
  if(!canAct(userId, `check-${productId}`, 2*60*1000))
    return res.status(429).json({error:"Cooldown: wait before checking again"});

  // simulate stock change
  p.stock = Math.max(p.stock + Math.floor(Math.random()*3)-1,0);
  p.lastChecked = new Date().toLocaleString();

  updateTimestamp(userId, `check-${productId}`);
  sendTelegram(`User ${userId} checked "${p.name}" stock.`);

  res.json({ok:true, product:p});
});

// Buy / Add to cart
app.post('/buy-product',(req,res)=>{
  const { productId, quantity, userId } = req.body;
  const p = products.find(x=>x.id===productId);
  if(!p) return res.status(404).json({error:"Product not found"});
  if(quantity<=0 || quantity>p.stock) return res.status(400).json({error:"Invalid quantity"});
  if(!canAct(userId, `buy-${productId}`, 5000)) return res.status(429).json({error:"Cooldown: wait"});

  p.stock -= quantity;
  p.soldCount = (p.soldCount||0)+quantity;

  const session = getSession(userId);
  const existing = session.cart.find(c=>c.productId===productId);
  if(existing) existing.quantity += quantity;
  else session.cart.push({ productId, quantity });

  updateTimestamp(userId, `buy-${productId}`);
  sendTelegram(`User ${userId} bought ${quantity} x "${p.name}"`);

  res.json({ok:true, product:p, cart: session.cart});
});

// Favorites
app.post('/favorite',(req,res)=>{
  const { productId, userId } = req.body;
  const session = getSession(userId);
  if(!session.favorites.includes(productId)) session.favorites.push(productId);
  res.json({ok:true, favorites: session.favorites});
});

app.post('/unfavorite',(req,res)=>{
  const { productId, userId } = req.body;
  const session = getSession(userId);
  session.favorites = session.favorites.filter(id=>id!==productId);
  res.json({ok:true, favorites: session.favorites});
});

// Get cart
app.get('/cart/:userId',(req,res)=>{
  const session = getSession(req.params.userId);
  const cartDetails = session.cart.map(i=>{
    const prod = products.find(p=>p.id===i.productId);
    return { name: prod.name, quantity:i.quantity, price:prod.price, total:prod.price*i.quantity };
  });
  const total = cartDetails.reduce((a,b)=>a+b.total,0);
  res.json({cart: cartDetails, totalPrice: total});
});

// Get products (sorted by sold count)
app.get('/products',(req,res)=>{
  const userId = req.query.userId;
  const session = getSession(userId);
  const top10 = [...products].sort((a,b)=> (b.soldCount||0)-(a.soldCount||0)).slice(0,10);
  const pastOrders = session.cart.map(i=>products.find(p=>p.id===i.productId)).filter(p=>p);
  const remaining = products.filter(p=>!pastOrders.includes(p) && !top10.includes(p)).sort((a,b)=> (b.soldCount||0)-(a.soldCount||0));
  const finalList = [...pastOrders, ...top10.filter(p=>!pastOrders.includes(p)), ...remaining];
  res.json(finalList);
});

// Bug report
app.post('/report-bug',(req,res)=>{
  const { userId, message } = req.body;
  sendTelegram(`Bug report from ${userId}: ${message}`);
  res.json({ok:true});
});

// Save products periodically
setInterval(()=>{
  fs.writeFile(path.join(__dirname,'products.js'),"module.exports = "+JSON.stringify(products,null,2),err=>{
    if(err) console.error("Save error:",err);
  });
},60000);

// Start server
app.listen(PORT,()=>console.log(`Ühishanke Ultimate Server running on port ${PORT}`));