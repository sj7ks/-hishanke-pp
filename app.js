// app.js - Ühishanke Ultimate Backend v5 (God-Level with Favorites)
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Load products
let products = require('./products.js');

// User sessions: cart, last actions, favorites
const userSessions = {}; // { userId: { cart: [], lastActions: {}, favorites: [] } }

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
  if(!userSessions[userId]) userSessions[userId] = { cart: [], lastActions: {}, favorites: [] };
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

// Toggle favorite
app.post('/favorite', (req,res)=>{
  const { userId, productId } = req.body;
  const session = getSession(userId);
  const idx = session.favorites.indexOf(productId);
  if(idx >= 0) session.favorites.splice(idx,1);
  else session.favorites.push(productId);
  logInfo(`User "${userId}" updated favorites: [${session.favorites.join(', ')}]`);
  res.json({ok:true, favorites: session.favorites});
});

// Check product stock
app.post('/check-product', (req,res)=>{
  const { productId, userId } = req.body;
  const product = products.find(p=>p.id===productId);
  if(!product) return res.status(404).json({error:"Product not found"});

  if(!canAct(userId, `check-${productId}`, 120000)){
    return res.status(429).json({error:"Cooldown: wait before checking again"});
  }

  product.stock = Math.max(product.stock + Math.floor(Math.random()*3),0);
  product.lastChecked = new Date().toLocaleString();

  updateTimestamp(userId, `check-${productId}`);
  sendNotification(`User ${userId} checked "${product.name}" stock.`);

  setTimeout(()=>res.json({ok:true, product}), 180);
});

// Buy product
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

// Get user cart
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

// Get all products (with sorting & favorite flag)
app.get('/products', (req,res)=>{
  const userId = req.query.userId || 'guest';
  const searchQuery = req.query.search || '';
  const session = getSession(userId);

  const pastOrders = session.cart
    .map(c => {
      const prod = products.find(p=>p.id===c.productId);
      if(prod) prod._userQuantity = c.quantity;
      return prod;
    })
    .filter(Boolean);

  const top10 = [...products]
    .filter(p => !pastOrders.includes(p))
    .sort((a,b)=> (b.soldCount||0) - (a.soldCount||0))
    .slice(0,10);

  const remaining = products
    .filter(p => !pastOrders.includes(p) && !top10.includes(p))
    .sort((a,b)=> (b.soldCount||0) - (a.soldCount||0));

  const finalList = [...pastOrders, ...top10, ...remaining];

  finalList.forEach((p,i)=>{
    p._positionIndex = i;
    p._highlight = pastOrders.includes(p) || top10.includes(p);
    p._lowStock = p.stock < 5;
    p._searchMatch = searchQuery ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) : true;
    p._faved = session.favorites.includes(p.id);
  });

  const filteredList = finalList.filter(p => p._searchMatch);

  // Stream in small chunks for frontend animation
  let responsePayload = [];
  let index = 0;
  const chunkSize = 5;
  const sendChunk = () => {
    if(index >= filteredList.length) return res.json(responsePayload);
    const chunk = filteredList.slice(index,index+chunkSize);
    chunk.forEach((p,j)=>{
      logInfo(`Sending product [${index+j+1}/${filteredList.length}] ID:${p.id} Name:"${p.name}" Stock:${p.stock} Sold:${p.soldCount||0} Highlight:${p._highlight} LowStock:${p._lowStock} Faved:${p._faved}`);
    });
    responsePayload.push(...chunk);
    index += chunkSize;
    setTimeout(sendChunk,25);
  };
  sendChunk();
});

// Get user's favorite products
app.get('/favorites/:userId', (req,res)=>{
  const userId = req.params.userId;
  const session = getSession(userId);
  const favedProducts = session.favorites.map(fid => products.find(p=>p.id===fid)).filter(Boolean);
  res.json({favorites: favedProducts});
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
app.listen(PORT,()=>console.log(`\x1b[35mÜhishanke Ultimate Server v5 running on port ${PORT}\x1b[0m`));