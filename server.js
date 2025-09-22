// server.js - Ühishanke Ultimate Server v1
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Load products
let products = require('./products.js');

// User sessions: { userId: { cart: [], favorites: [], lastActions: {} } }
const sessions = {};

// Middleware
app.use(express.static(__dirname));
app.use(bodyParser.json());

// Utilities
function getSession(userId) {
  if (!sessions[userId]) sessions[userId] = { cart: [], favorites: [], lastActions: {} };
  return sessions[userId];
}

function canAct(userId, key, cooldown) {
  const last = getSession(userId).lastActions[key] || 0;
  return Date.now() - last > cooldown;
}

function updateTimestamp(userId, key) {
  getSession(userId).lastActions[key] = Date.now();
}

// Notification placeholder (e.g., send DM to your mom)
function notify(msg) {
  console.log(`[Notification]: ${msg}`);
}

// Routes

// Get all products, optionally personalized
app.get('/products', (req, res) => {
  const userId = req.query.userId;
  const session = getSession(userId);

  // Top 10 globally
  const top10 = [...products].sort((a,b) => (b.soldCount||0) - (a.soldCount||0)).slice(0,10);

  // User favorites
  const favs = session.favorites.map(id => products.find(p=>p.id===id)).filter(p=>p);

  // Remaining
  const remaining = products.filter(p => !favs.includes(p) && !top10.includes(p))
                            .sort((a,b)=> (b.soldCount||0) - (a.soldCount||0));

  const finalList = [...favs, ...top10.filter(p=>!favs.includes(p)), ...remaining];

  setTimeout(() => res.json(finalList), 100); // simulate slight delay
});

// Check product
app.post('/check-product', (req,res)=>{
  const { userId, productId } = req.body;
  const p = products.find(x=>x.id===productId);
  if(!p) return res.status(404).json({error:"Product not found"});
  
  if(!canAct(userId, `check-${productId}`, 120000)) return res.status(429).json({error:"Cooldown"});

  p.lastChecked = new Date().toLocaleString();
  updateTimestamp(userId, `check-${productId}`);
  notify(`User ${userId} checked ${p.name}`);
  res.json({ok:true, product:p});
});

// Add to cart
app.post('/buy-product', (req,res)=>{
  const { userId, productId, quantity } = req.body;
  const p = products.find(x=>x.id===productId);
  if(!p) return res.status(404).json({error:"Product not found"});
  if(quantity <=0 || quantity > p.stock) return res.status(400).json({error:"Invalid quantity"});

  if(!canAct(userId, `buy-${productId}`, 5000)) return res.status(429).json({error:"Cooldown"});

  p.stock -= quantity;
  p.soldCount = (p.soldCount||0)+quantity;

  const session = getSession(userId);
  const existing = session.cart.find(i=>i.productId===productId);
  if(existing) existing.quantity += quantity;
  else session.cart.push({ productId, quantity });

  updateTimestamp(userId, `buy-${productId}`);
  notify(`User ${userId} bought ${quantity} x ${p.name}`);
  res.json({ok:true, cart: session.cart});
});

// Get user cart
app.get('/cart/:userId', (req,res)=>{
  const session = getSession(req.params.userId);
  const cartDetails = session.cart.map(i=>{
    const p = products.find(x=>x.id===i.productId);
    return { name:p.name, quantity:i.quantity, price:p.price, total:p.price*i.quantity };
  });
  const total = cartDetails.reduce((a,b)=>a+b.total,0);
  res.json({cart: cartDetails, totalPrice: total});
});

// Favorite a product
app.post('/favorite', (req,res)=>{
  const { userId, productId } = req.body;
  const session = getSession(userId);
  if(!session.favorites.includes(productId)) session.favorites.push(productId);

  const p = products.find(x=>x.id===productId);
  if(p) p.favedCount = (p.favedCount||0)+1;

  res.json({ok:true, favorites: session.favorites});
});

// Unfavorite a product
app.post('/unfavorite', (req,res)=>{
  const { userId, productId } = req.body;
  const session = getSession(userId);
  session.favorites = session.favorites.filter(id=>id!==productId);

  const p = products.find(x=>x.id===productId);
  if(p && p.favedCount>0) p.favedCount -= 1;

  res.json({ok:true, favorites: session.favorites});
});

// Periodically save products
setInterval(()=>{
  fs.writeFile(path.join(__dirname,'products.js'),
    "module.exports = "+JSON.stringify(products,null,2),
    err=>{ if(err) console.error("Failed saving products:",err); }
  );
},60000);

app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));