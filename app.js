// app.js - Ühishanke Ultimate God-Level Backend
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Load products
let products = require('./products.js'); // Must be array with 50+ products

// Users & sessions
const userSessions = {}; // { userId: { cart: [], favorites: [], lastActions: {} } }

// Middleware
app.use(express.static(__dirname));
app.use(bodyParser.json());

// Logger helper
function log(msg, type = 'info'){
  const colors = { info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m', reset: '\x1b[0m' };
  console.log(`${colors[type] || colors.info}[${new Date().toLocaleTimeString()}] ${msg}${colors.reset}`);
}

// Session utils
function getSession(userId){
  if(!userSessions[userId]) userSessions[userId] = { cart: [], favorites: [], lastActions: {} };
  return userSessions[userId];
}
function canAct(userId, actionKey, cooldownMs){
  const session = getSession(userId);
  return (Date.now() - (session.lastActions[actionKey] || 0)) > cooldownMs;
}
function updateAction(userId, actionKey){
  const session = getSession(userId);
  session.lastActions[actionKey] = Date.now();
}

// Telegram notifier
async function notifyTelegram(message){
  if(!process.env.TELEGRAM_TOKEN || !process.env.MOM_CHAT_ID) return;
  try{
    await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: process.env.MOM_CHAT_ID,
      text: message
    });
  } catch(e){
    log(`Telegram error: ${e.message}`, 'warn');
  }
}

// API Endpoints

// Check product
app.post('/check-product', async (req,res)=>{
  try{
    const { productId, userId } = req.body;
    const product = products.find(p=>p.id===productId);
    if(!product) return res.status(404).json({error:"Product not found"});

    if(!canAct(userId, `check-${productId}`, 120000)) 
      return res.status(429).json({error:"Cooldown: wait before checking again"});

    // simulate stock fluctuation
    product.stock = Math.max(product.stock + Math.floor(Math.random()*3),0);
    product.lastChecked = new Date().toLocaleString();

    updateAction(userId, `check-${productId}`);
    await notifyTelegram(`User ${userId} checked "${product.name}" stock.`);
    log(`User ${userId} checked ${product.name}`);

    res.json({ok:true, product});
  } catch(e){
    log(`Check error: ${e.message}`, 'error');
    res.status(500).json({error:e.message});
  }
});

// Buy product
app.post('/buy-product', async (req,res)=>{
  try{
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

    updateAction(userId, `buy-${productId}`);
    await notifyTelegram(`User ${userId} bought ${quantity} x "${product.name}"`);
    log(`User ${userId} bought ${quantity} x ${product.name}`);

    res.json({ok:true, product, cart: session.cart});
  } catch(e){
    log(`Buy error: ${e.message}`, 'error');
    res.status(500).json({error:e.message});
  }
});

// Get cart
app.get('/cart/:userId', (req,res)=>{
  try{
    const session = getSession(req.params.userId);
    const cart = session.cart.map(item=>{
      const prod = products.find(p=>p.id===item.productId);
      return { name: prod.name, quantity:item.quantity, price:prod.price, total:prod.price*item.quantity };
    });
    const totalPrice = cart.reduce((a,b)=>a+b.total,0);
    res.json({cart, totalPrice});
  } catch(e){
    log(`Cart error: ${e.message}`, 'error');
    res.status(500).json({error:e.message});
  }
});

// Get all products with favorites & top-sold sorting
app.get('/products', (req,res)=>{
  try{
    const { userId } = req.query;
    const session = getSession(userId || 'guest');

    // Top favorites first
    const favs = products.filter(p => session.favorites.includes(p.id));

    // Top sold globally
    const topSold = products.filter(p => !favs.includes(p))
                            .sort((a,b)=> (b.soldCount||0) - (a.soldCount||0))
                            .slice(0,10);

    const remaining = products.filter(p => !favs.includes(p) && !topSold.includes(p));

    const finalList = [...favs, ...topSold, ...remaining];

    res.json(finalList);
  } catch(e){
    log(`Products error: ${e.message}`, 'error');
    res.status(500).json({error:e.message});
  }
});

// Favorite/unfavorite
app.post('/favorite', (req,res)=>{
  try{
    const { userId, productId } = req.body;
    const session = getSession(userId);
    const index = session.favorites.indexOf(productId);
    if(index===-1) session.favorites.push(productId);
    else session.favorites.splice(index,1);
    res.json({favorites: session.favorites});
  } catch(e){
    log(`Favorite error: ${e.message}`, 'error');
    res.status(500).json({error:e.message});
  }
});

// Save products periodically
setInterval(()=>{
  try{
    const data = "module.exports = "+JSON.stringify(products,null,2);
    fs.writeFile(path.join(__dirname,'products.js'), data, err=>{
      if(err) log(`Failed saving products: ${err.message}`, 'error');
      else log("Products saved successfully!",'info');
    });
  } catch(e){ log(`Save interval error: ${e.message}`, 'error'); }
},60000);

// Global error handling
app.use((err, req, res, next)=>{
  log(`Unhandled error: ${err.message}`, 'error');
  res.status(500).json({error: err.message});
});

// Start server
app.listen(PORT, ()=>log(`Ühishanke Ultimate God-Level Server running on port ${PORT}`, 'info'));