// server.js - Ühishanke Ultimate Server
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Load products
let products = require('./products.js');

// User sessions
const userSessions = {}; // { userId: { cart: [], favorites: [], lastActions: {} } }

// Middleware
app.use(express.static(__dirname));
app.use(bodyParser.json());

// Logger with timestamp
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Utilities
function getSession(userId) {
  if (!userSessions[userId]) userSessions[userId] = { cart: [], favorites: [], lastActions: {} };
  return userSessions[userId];
}

function canAct(userId, key, cooldown) {
  const session = getSession(userId);
  const last = session.lastActions[key] || 0;
  return (Date.now() - last) > cooldown;
}

function updateAction(userId, key) {
  const session = getSession(userId);
  session.lastActions[key] = Date.now();
}

// Simulate Telegram notification
function notifyMom(message) {
  console.log(`[Telegram notification to mom]: ${message}`);
}

// API Endpoints

// Get all products (sorted by soldCount, favorites, top 10)
app.get('/products', (req, res) => {
  const userId = req.query.userId;
  const session = getSession(userId);

  const top10 = [...products].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0)).slice(0, 10);
  const pastFavorites = session.favorites.map(id => products.find(p => p.id === id)).filter(Boolean);
  const remaining = products.filter(p => !pastFavorites.includes(p) && !top10.includes(p))
    .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));

  const finalList = [...pastFavorites, ...top10.filter(p => !pastFavorites.includes(p)), ...remaining];
  setTimeout(() => res.json(finalList), 150);
});

// Check product stock
app.post('/check-product', (req, res) => {
  const { productId, userId } = req.body;
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: "Product not found" });

  if (!canAct(userId, `check-${productId}`, 120000))
    return res.status(429).json({ error: "Cooldown: wait before checking again" });

  product.lastChecked = new Date().toLocaleString();
  updateAction(userId, `check-${productId}`);
  notifyMom(`User ${userId} checked stock for "${product.name}"`);

  res.json({ ok: true, product });
});

// Buy product / add to cart
app.post('/buy-product', (req, res) => {
  const { productId, quantity, userId } = req.body;
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: "Product not found" });
  if (quantity <= 0 || quantity > product.stock) return res.status(400).json({ error: "Invalid quantity" });

  if (!canAct(userId, `buy-${productId}`, 5000))
    return res.status(429).json({ error: "Cooldown: wait before buying again" });

  product.stock -= quantity;
  product.soldCount = (product.soldCount || 0) + quantity;

  const session = getSession(userId);
  const existing = session.cart.find(i => i.productId === productId);
  if (existing) existing.quantity += quantity;
  else session.cart.push({ productId, quantity });

  updateAction(userId, `buy-${productId}`);
  notifyMom(`User ${userId} added ${quantity} x "${product.name}" to cart`);

  res.json({ ok: true, product, cart: session.cart });
});

// Get user cart
app.get('/cart/:userId', (req, res) => {
  const session = getSession(req.params.userId);
  const cartDetails = session.cart.map(item => {
    const prod = products.find(p => p.id === item.productId);
    return { name: prod.name, quantity: item.quantity, price: prod.price, total: prod.price * item.quantity };
  });
  const totalPrice = cartDetails.reduce((a, b) => a + b.total, 0);
  res.json({ cart: cartDetails, totalPrice });
});

// Add / remove favorite
app.post('/favorite', (req, res) => {
  const { userId, productId } = req.body;
  const session = getSession(userId);
  if (!session.favorites.includes(productId)) session.favorites.push(productId);
  else session.favorites = session.favorites.filter(id => id !== productId);
  res.json({ ok: true, favorites: session.favorites });
});

// Report bug
app.post('/report-bug', (req, res) => {
  const { userId, description } = req.body;
  notifyMom(`User ${userId} reported a bug: ${description}`);
  res.json({ ok: true, message: "Bug reported" });
});

// Periodically save products
setInterval(() => {
  const data = "module.exports = " + JSON.stringify(products, null, 2);
  fs.writeFile(path.join(__dirname, 'products.js'), data, err => {
    if (err) console.error("Failed saving products:", err);
    else console.log("Products saved successfully");
  });
}, 60000);

// Start server
app.listen(PORT, () => console.log(`Ühishanke Ultimate Server running on port ${PORT}`));