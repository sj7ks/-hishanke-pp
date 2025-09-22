// server.js - God-Level Hyper Advanced Shopping App
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Load products
let products = require('./products.js'); // Make sure products.js exports array of objects

// Users storage (in-memory, for production use DB)
let users = [];

// Sessions in-memory
const sessions = {}; // { userId: { cart: [], favorites: [], lastActions: {} } }

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Utilities
function getSession(userId) {
  if (!sessions[userId]) sessions[userId] = { cart: [], favorites: [], lastActions: {} };
  return sessions[userId];
}

function canAct(userId, key, cooldownMs) {
  const session = getSession(userId);
  const last = session.lastActions[key] || 0;
  return Date.now() - last > cooldownMs;
}

function updateActionTimestamp(userId, key) {
  getSession(userId).lastActions[key] = Date.now();
}

async function sendTelegram(msg) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg }),
    });
  } catch (err) {
    console.error('Telegram notification error:', err);
  }
}

// Authentication
function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Routes

// Register
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email & password required' });
  if (users.find(u => u.email === email)) return res.status(400).json({ error: 'Email exists' });

  const hashed = await bcrypt.hash(password, 10);
  const id = uuidv4();
  users.push({ id, email, password: hashed });
  const token = generateToken(id);
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 });
  res.json({ ok: true, userId: id });
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: 'Invalid credentials' });
  const token = generateToken(user.id);
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 });
  res.json({ ok: true, userId: user.id });
});

// Get all products (sorted by favorites and purchases)
app.get('/products', authMiddleware, (req, res) => {
  const session = getSession(req.userId);

  const topFavorites = products.filter(p => session.favorites.includes(p.id));
  const topSold = [...products].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
  const remaining = products.filter(p => !session.favorites.includes(p.id));
  const finalList = [...topFavorites, ...topSold.filter(p => !topFavorites.includes(p)), ...remaining];

  res.json(finalList);
});

// Favorite / Unfavorite
app.post('/favorite', authMiddleware, (req, res) => {
  const { productId } = req.body;
  const session = getSession(req.userId);
  if (!session.favorites.includes(productId)) session.favorites.push(productId);
  else session.favorites = session.favorites.filter(id => id !== productId);
  res.json({ ok: true, favorites: session.favorites });
});

// Add to cart
app.post('/cart/add', authMiddleware, (req, res) => {
  const { productId, quantity } = req.body;
  const session = getSession(req.userId);
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (quantity <= 0 || quantity > product.stock) return res.status(400).json({ error: 'Invalid quantity' });

  const existing = session.cart.find(c => c.productId === productId);
  if (existing) existing.quantity += quantity;
  else session.cart.push({ productId, quantity });

  updateActionTimestamp(req.userId, `buy-${productId}`);
  product.stock -= quantity;
  product.soldCount = (product.soldCount || 0) + quantity;

  sendTelegram(`User ${req.userId} bought ${quantity} x ${product.name}`);

  res.json({ ok: true, cart: session.cart });
});

// Get cart
app.get('/cart', authMiddleware, (req, res) => {
  const session = getSession(req.userId);
  const cartDetails = session.cart.map(i => {
    const p = products.find(p => p.id === i.productId);
    return { name: p.name, quantity: i.quantity, price: p.price, total: p.price * i.quantity };
  });
  const totalPrice = cartDetails.reduce((a, b) => a + b.total, 0);
  res.json({ cart: cartDetails, totalPrice });
});

// Check stock
app.post('/check', authMiddleware, (req, res) => {
  const { productId } = req.body;
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  product.lastChecked = new Date().toLocaleString();
  sendTelegram(`User ${req.userId} checked stock for ${product.name}`);
  res.json({ ok: true, product });
});

// Bug report
app.post('/bug', authMiddleware, (req, res) => {
  const { message } = req.body;
  sendTelegram(`Bug Report from ${req.userId}: ${message}`);
  res.json({ ok: true });
});

// Save products periodically
setInterval(() => {
  fs.writeFileSync(path.join(__dirname, 'products.js'), 'module.exports = ' + JSON.stringify(products, null, 2));
}, 60000);

// Start server
app.listen(PORT, () => console.log(`\x1b[36mGod-Level Shop Server running on port ${PORT}\x1b[0m`));