// app.js - Ühishanke Ultimate Backend v4 (God Level)
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Load products
let products = require('./products.js');

// User sessions
const userSessions = {}; // { userId: { cart: [], lastActions: {} } }

// Middleware
app.use(express.static(__dirname));
app.use(bodyParser.json());

// Logger with color & timestamp
function logInfo(msg) {
  console.log(`\x1b[36m[${new Date().toLocaleTimeString()}] ${msg}\x1b[0m`);
}
app.use((req,res,next)=>{ logInfo(`${req.method} ${req.url}`); next(); });

// Utilities
function getSession(userId){
  if(!userSessions[userId]) userSessions[userId] = { cart: [], lastActions: {} };
  return userSessions[userId];
}
function canAct(userId, key, cooldown){ return Date.now() - (getSession(userId).lastActions[key] || 0) > cooldown; }
function updateTimestamp(userId,key){ getSession(userId).lastActions[key] = Date.now(); }

// Notification simulation
function sendNotification(msg){
  let i=0;
  const interval = setInterval(()=>{
    process.stdout.write(msg[i]||'');
    i++;
    if(i>msg.length){ clearInterval(interval); process.stdout.write('\n'); }
  },5);
}

// API Endpoints
app.post('/check-product', (req,res)=>{
  const { productId, userId } = req.body;
  const product = products.find(p=>p.id===productId);
  if(!product) return res.status(404).json({error:"Product not found"});

  if(!canAct(userId, `check-${productId}`, 120000)){
    return res.status(429).json({error:"Cooldown: wait before checking again"});
  }

  // Smooth stock simulation
  product.stock = Math.max(product.stock + Math.floor(Math.random()*3),0);
  product.lastChecked = new Date().toLocaleString();

  updateTimestamp(userId, `check-${productId}`);
  sendNotification(`User ${userId} checked "${product.name}" stock.`);

  setTimeout(()=>res.json({ok:true, product}), 180);
});

app.post('/buy-product', (req,res)=>{
  const { productId, quantity, userId } = req.body;
  const product = products.find(p=>p.id===productId);
  if(!product) return res.status(404).json({error:"Product not found"});
  if(quantity <=0 || quantity > product.stock) return res.status(400).json({error:"Invalid quantity"});

  if(!canAct(userId, `buy-${productId}`, 5000)){
    return res.status(429).json({error:"Cooldown: wait before buying again"});
  }

  product.stock -= quantity;
  product.soldCount = (product.soldCount || 0) + quantity;

  const session = getSession(userId);
  const existing = session.cart.find(i=>i.productId===productId);
  if(existing) existing.quantity += quantity;
  else session.cart.push({ productId, quantity });

  updateTimestamp(userId, `buy-${productId}`);
  sendNotification(`User ${userId} bought ${quantity} x "${product.name}"`);

  setTimeout(()=>res.json({ok:true, product, cart: session.cart}), 180);
});

app.get('/cart/:userId', (req,res)=>{
  const userId = req.params.userId;
  const session = getSession(userId);
  const cart = session.cart.map(i=>{
    const p = products.find(x=>x.id===i.productId);
    return { name: p.name, quantity: i.quantity, price: p.price, total: p.price*i.quantity };
  });
  const total = cart.reduce((a,b)=>a+b.total,0);
  setTimeout(()=>res.json({cart, totalPrice: total}), 150);
});

app.get('/products', (req,res)=>{
  const sorted = [...products].sort((a,b)=> (b.soldCount||0) - (a.soldCount||0));
  setTimeout(()=>res.json(sorted), 150);
});

// Save products periodically
setInterval(()=>{
  const data = "module.exports = "+JSON.stringify(products,null,2);
  fs.writeFile(path.join(__dirname,'products.js'), data, err=>{
    if(err) console.error("Failed saving products:", err);
    else console.log("\x1b[32mProducts saved successfully!\x1b[0m");
  });
},60000);

// Start server
app.listen(PORT,()=>console.log(`\x1b[35mÜhishanke Ultimate Server v4 running on port ${PORT}\x1b[0m`));