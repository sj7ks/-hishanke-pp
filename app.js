// app.js - Ultimate Shop Backend v2 (God Level)
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const axios = require('axios');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Load products
let products = require('./products.js');

// Users database (simple JSON for demo)
let users = {}; // { email: { passwordHash, cart: [], favorites: [], lastActions: {} } }

// Middleware
app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(cookieParser());

// Logger
function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}
app.use((req, res, next) => { log(`${req.method} ${req.url}`); next(); });

// Utils
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}
function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}
function getUserBySession(sessionId) {
  for (const email in users) {
    if (users[email].sessionId === sessionId) return users[email];
  }
  return null;
}
function canAct(user, key, cooldown) {
  const last = user.lastActions[key] || 0;
  return (Date.now() - last) > cooldown;
}
function updateTimestamp(user, key) {
  user.lastActions[key] = Date.now();
}

// Telegram notifier
async function notifyTelegram(message) {
  try {
    await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: message
    });
  } catch (err) {
    console.error("Telegram notify failed:", err.message);
  }
}

// --- AUTHENTICATION --- //
app.post('/register', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing email or password" });
  if (users[email]) return res.status(400).json({ error: "User exists" });

  const passwordHash = hashPassword(password);
  const sessionId = generateSessionId();
  users[email] = { passwordHash, cart: [], favorites: [], lastActions: {}, sessionId };

  res.cookie('sessionId', sessionId, { maxAge: 7*24*60*60*1000, httpOnly: true });
  res.json({ ok: true, message: "Registered & logged in!" });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = users[email];
  if (!user || user.passwordHash !== hashPassword(password)) return res.status(401).json({ error: "Invalid credentials" });

  const sessionId = generateSessionId();
  user.sessionId = sessionId;
  res.cookie('sessionId', sessionId, { maxAge: 7*24*60*60*1000, httpOnly: true });
  res.json({ ok: true, message: "Logged in!" });
});

app.post('/logout', (req, res) => {
  const sessionId = req.cookies.sessionId;
  const user = getUserBySession(sessionId);
  if (user) delete user.sessionId;
  res.clearCookie('sessionId');
  res.json({ ok: true, message: "Logged out" });
});

// --- PRODUCTS --- //
app.get('/products', (req, res) => {
  const sessionId = req.cookies.sessionId;
  const user = getUserBySession(sessionId);

  // Favorites first
  const favorites = user ? user.favorites.map(id => products.find(p => p.id === id)).filter(Boolean) : [];
  // Top 10 most bought
  const top10 = [...products].sort((a,b)=> (b.soldCount||0) - (a.soldCount||0)).slice(0,10).filter(p => !favorites.includes(p));
  // Remaining sorted by popularity
  const remaining = products.filter(p => !favorites.includes(p) && !top10.includes(p))
                            .sort((a,b)=> (b.soldCount||0) - (a.soldCount||0));
  const finalList = [...favorites, ...top10, ...remaining];
  res.json(finalList);
});

app.post('/check-product', async (req,res) => {
  const { productId } = req.body;
  const sessionId = req.cookies.sessionId;
  const user = getUserBySession(sessionId);
  if (!user) return res.status(401).json({ error: "Login required" });

  const product = products.find(p=>p.id===productId);
  if (!product) return res.status(404).json({ error: "Product not found" });

  if (!canAct(user, `check-${productId}`, 120000)) return res.status(429).json({ error: "Cooldown active" });

  product.stock = Math.max(product.stock + Math.floor(Math.random()*3),0);
  updateTimestamp(user, `check-${productId}`);
  await notifyTelegram(`User checked "${product.name}" stock`);

  res.json({ ok: true, product });
});

app.post('/buy-product', async (req,res) => {
  const { productId, quantity } = req.body;
  const sessionId = req.cookies.sessionId;
  const user = getUserBySession(sessionId);
  if (!user) return res.status(401).json({ error: "Login required" });

  const product = products.find(p=>p.id===productId);
  if (!product) return res.status(404).json({ error: "Product not found" });
  if (quantity <=0 || quantity > product.stock) return res.status(400).json({ error: "Invalid quantity" });
  if (!canAct(user, `buy-${productId}`, 5000)) return res.status(429).json({ error: "Cooldown active" });

  product.stock -= quantity;
  product.soldCount = (product.soldCount||0)+quantity;

  const existing = user.cart.find(i=>i.productId===productId);
  if (existing) existing.quantity += quantity;
  else user.cart.push({ productId, quantity });

  updateTimestamp(user, `buy-${productId}`);
  await notifyTelegram(`User bought ${quantity} x "${product.name}"`);

  res.json({ ok: true, cart: user.cart, product });
});

// Favorites toggle
app.post('/favorite-product', (req,res) => {
  const { productId } = req.body;
  const sessionId = req.cookies.sessionId;
  const user = getUserBySession(sessionId);
  if (!user) return res.status(401).json({ error: "Login required" });

  if (user.favorites.includes(productId)) user.favorites = user.favorites.filter(id => id!==productId);
  else user.favorites.push(productId);

  res.json({ ok: true, favorites: user.favorites });
});

// Get cart
app.get('/cart', (req,res) => {
  const sessionId = req.cookies.sessionId;
  const user = getUserBySession(sessionId);
  if (!user) return res.status(401).json({ error: "Login required" });

  const cart = user.cart.map(i => {
    const p = products.find(p=>p.id===i.productId);
    return { name: p.name, price: p.price, quantity: i.quantity, total: p.price*i.quantity };
  });
  const total = cart.reduce((a,b)=>a+b.total,0);
  res.json({ cart, totalPrice: total });
});

// Save products periodically
setInterval(()=>{
  const data = "module.exports = "+JSON.stringify(products,null,2);
  fs.writeFile(path.join(__dirname,'products.js'),data,err=>{
    if(err) console.error("Failed saving products:",err);
    else console.log("Products saved!");
  });
},60000);

// Start server
app.listen(PORT,()=>log(`Ultimate God-Level Shop Server running on port ${PORT}`));