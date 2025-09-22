// app.js - Ühishanke Ultimate App v1.0
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

// Sessions & favorites
const userSessions = {}; // { userId: { cart: [], favorites: [], lastActions: {}, lang: 'en' } }

// Middleware
app.use(express.static(__dirname));
app.use(bodyParser.json());

// Logger
function log(msg) {
  console.log(`[${new Date().toLocaleString()}] ${msg}`);
}
app.use((req,res,next)=>{ log(`${req.method} ${req.url}`); next(); });

// Utilities
function getSession(userId) {
  if(!userSessions[userId]) userSessions[userId] = { cart: [], favorites: [], lastActions: {}, lang: 'en' };
  return userSessions[userId];
}
function canAct(userId, key, cooldown){
  const last = getSession(userId).lastActions[key] || 0;
  return Date.now() - last > cooldown;
}
function updateTimestamp(userId, key){
  getSession(userId).lastActions[key] = Date.now();
}

// Telegram notification
async function sendTelegramMessage(message){
  try {
    await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      chat_id: process.env.MOM_CHAT_ID,
      text: message
    });
  } catch(err){ console.error("Telegram error:", err.message); }
}

// --- Endpoints ---

// Change language
app.post('/set-lang', (req,res)=>{
  const { userId, lang } = req.body;
  if(!['en','et','ru'].includes(lang)) return res.status(400).json({error:"Invalid language"});
  getSession(userId).lang = lang;
  res.json({ok:true, lang});
});

// Check product stock
app.post('/check-product', (req,res)=>{
  const { productId, userId } = req.body;
  const product = products.find(p=>p.id===productId);
  if(!product) return res.status(404).json({error:"Product not found"});

  if(!canAct(userId, `check-${productId}`, 2*60*1000))
    return res.status(429).json({error:"Cooldown: wait before checking again"});

  product.stock = Math.max(product.stock + Math.floor(Math.random()*3),0);
  product.lastChecked = new Date().toLocaleString();

  updateTimestamp(userId, `check-${productId}`);
  sendTelegramMessage(`User ${userId} checked "${product.name}" stock.`);

  res.json({ok:true, product});
});

// Add to favorites
app.post('/favorite', (req,res)=>{
  const { userId, productId } = req.body;
  const session = getSession(userId);
  if(!session.favorites.includes(productId)) session.favorites.push(productId);
  res.json({ok:true, favorites: session.favorites});
});

// Remove from favorites
app.post('/unfavorite', (req,res)=>{
  const { userId, productId } = req.body;
  const session = getSession(userId);
  session.favorites = session.favorites.filter(id=>id!==productId);
  res.json({ok:true, favorites: session.favorites});
});

// Add to cart / buy
app.post('/buy-product', (req,res)=>{
  const { productId, quantity, userId } = req.body;
  const product = products.find(p=>p.id===productId);
  if(!product) return res.status(404).json({error:"Product not found"});
  if(quantity<=0 || quantity>product.stock) return res.status(400).json({error:"Invalid quantity"});

  if(!canAct(userId, `buy-${productId}`, 5000))
    return res.status(429).json({error:"Cooldown: wait before buying again"});

  product.stock -= quantity;
  product.soldCount = (product.soldCount||0) + quantity;

  const session = getSession(userId);
  const existing = session.cart.find(c=>c.productId===productId);
  if(existing) existing.quantity += quantity;
  else session.cart.push({ productId, quantity });

  updateTimestamp(userId, `buy-${productId}`);
  sendTelegramMessage(`User ${userId} bought ${quantity} x "${product.name}"`);

  res.json({ok:true, product, cart: session.cart});
});

// Get user cart
app.get('/cart/:userId', (req,res)=>{
  const session = getSession(req.params.userId);
  const cart = session.cart.map(item=>{
    const p = products.find(x=>x.id===item.productId);
    return { name: p.name, quantity: item.quantity, price: p.price, total: p.price*item.quantity };
  });
  const total = cart.reduce((a,b)=>a+b.total,0);
  res.json({cart, totalPrice: total});
});

// Get products with top 10 trending and user favorites first
app.get('/products', (req,res)=>{
  const userId = req.query.userId;
  const session = getSession(userId);
  const top10 = [...products].sort((a,b)=> (b.soldCount||0) - (a.soldCount||0)).slice(0,10);
  const favorites = session.favorites.map(id=>products.find(p=>p.id===id)).filter(Boolean);
  const remaining = products.filter(p => !favorites.includes(p) && !top10.includes(p))
                            .sort((a,b)=> (b.soldCount||0) - (a.soldCount||0));
  const finalList = [...favorites, ...top10.filter(p=>!favorites.includes(p)), ...remaining];
  res.json(finalList);
});

// Bug report
app.post('/report-bug', (req,res)=>{
  const { userId, message } = req.body;
  sendTelegramMessage(`Bug report from ${userId}: ${message}`);
  res.json({ok:true});
});

// Periodically save products
setInterval(()=>{
  const data = "module.exports = " + JSON.stringify(products,null,2);
  fs.writeFileSync(path.join(__dirname,'products.js'), data);
  console.log("Products saved!");
},60000);

// Start server
app.listen(PORT, ()=>console.log(`Ühishanke Ultimate App running on port ${PORT}`));