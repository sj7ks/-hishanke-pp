// app.js - Ühishanke Ultimate Backend v2
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Load products (products.js exports array)
let products = require('./products.js');

// Store user sessions and cooldowns
const userSessions = {}; // { userId: { cart: [], lastActions: {} } }

// Middleware
app.use(express.static(__dirname));
app.use(bodyParser.json());

// Logger
app.use((req,res,next)=>{
  console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
  next();
});

// Utility functions
function getUserSession(userId){
  if(!userSessions[userId]) userSessions[userId]={ cart:[], lastActions:{} };
  return userSessions[userId];
}
function canPerformAction(userId, actionKey, cooldownMs){
  const session = getUserSession(userId);
  const last = session.lastActions[actionKey] || 0;
  return (Date.now() - last) > cooldownMs;
}
function updateActionTimestamp(userId, actionKey){ 
  const session = getUserSession(userId);
  session.lastActions[actionKey] = Date.now();
}

// Notification placeholder
function sendNotification(msg){
  console.log(`[Notification]: ${msg}`);
}

// Endpoints
app.post('/check-product', (req,res)=>{
  const { productId, userId } = req.body;
  const product = products.find(p=>p.id===productId);
  if(!product) return res.status(404).json({error:"Product not found"});

  if(!canPerformAction(userId, `check-${productId}`, 2*60*1000)){
    return res.status(429).json({error:"Cooldown: wait before checking again"});
  }

  // simulate stock fluctuation
  product.stock = Math.max(product.stock + Math.floor(Math.random()*3),0);
  product.lastChecked = new Date().toLocaleString();

  updateActionTimestamp(userId, `check-${productId}`);
  sendNotification(`User ${userId} checked ${product.name}`);

  res.json({ok:true, product});
});

app.post('/buy-product', (req,res)=>{
  const { productId, quantity, userId } = req.body;
  const product = products.find(p=>p.id===productId);
  if(!product) return res.status(404).json({error:"Product not found"});
  if(quantity<=0 || quantity>product.stock) return res.status(400).json({error:"Invalid quantity"});

  if(!canPerformAction(userId, `buy-${productId}`, 5000)){ // 5s cooldown
    return res.status(429).json({error:"Cooldown: wait before buying again"});
  }

  product.stock -= quantity;
  const session = getUserSession(userId);
  const existingItem = session.cart.find(c=>c.productId===productId);
  if(existingItem) existingItem.quantity += quantity;
  else session.cart.push({ productId, quantity });

  updateActionTimestamp(userId, `buy-${productId}`);
  sendNotification(`User ${userId} bought ${quantity} x ${product.name}`);

  res.json({ok:true, product, cart: session.cart});
});

// Get user cart
app.get('/cart/:userId', (req,res)=>{
  const userId = req.params.userId;
  const session = getUserSession(userId);
  const cartDetails = session.cart.map(item=>{
    const prod = products.find(p=>p.id===item.productId);
    return { name: prod.name, quantity: item.quantity, price: prod.price, total: prod.price*item.quantity };
  });
  const totalPrice = cartDetails.reduce((a,b)=>a+b.total,0);
  res.json({cart: cartDetails, totalPrice});
});

// Get all products
app.get('/products', (req,res)=> res.json(products));

// Save products periodically
setInterval(()=>{
  const data = "module.exports = "+JSON.stringify(products,null,2);
  fs.writeFile(path.join(__dirname,'products.js'),data,err=>{
    if(err) console.error("Failed saving products:",err);
    else console.log("Products saved to disk");
  });
},60000);

// Start server
app.listen(PORT,()=>console.log(`Ühishanke Ultimate Server v2 running on port ${PORT}`));