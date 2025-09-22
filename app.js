// app.js - Professional God-Level Shop Backend
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || "supersecretkey";

// Telegram Bot
const telegramBot = new TelegramBot(process.env.TELEGRAM_TOKEN);
const momId = process.env.MOM_CHAT_ID;

// DB Simulations
const DB_PATH = path.join(__dirname, "db.json");
let db = { users: {}, products: require("./products.js") };

// Load db.json if exists
if (fs.existsSync(DB_PATH)) {
  try {
    db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch (err) {
    console.error("Failed to load DB, using defaults.");
  }
}

// Helpers
function saveDB() {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function sendTelegram(message) {
  if (process.env.TELEGRAM_TOKEN && momId) {
    telegramBot.sendMessage(momId, message).catch(console.error);
  }
}

function generateToken(userId) {
  return jwt.sign({ id: userId }, SECRET, { expiresIn: "7d" });
}

function auth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Not logged in" });
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = db.users[decoded.id];
    if (!req.user) throw new Error("User not found");
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Middleware
app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(cookieParser());

// ============ AUTH ROUTES ============

// Register
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  if (db.users[email])
    return res.status(409).json({ error: "User already exists" });

  const hash = await bcrypt.hash(password, 12);
  db.users[email] = {
    id: email,
    password: hash,
    cart: [],
    favorites: [],
    lang: "en",
  };

  saveDB();
  sendTelegram(`🆕 New user registered: ${email}`);
  res.json({ ok: true });
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = db.users[email];
  if (!user) return res.status(404).json({ error: "User not found" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: "Invalid password" });

  const token = generateToken(user.id);
  res.cookie("token", token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 });
  res.json({ ok: true, lang: user.lang });
});

// ============ PRODUCT ROUTES ============

// Get products
app.get("/products", auth, (req, res) => {
  const user = req.user;

  // Favorites on top, then popular
  const favs = db.products.filter((p) => user.favorites.includes(p.id));
  const top = db.products
    .filter((p) => !user.favorites.includes(p.id))
    .sort((a, b) => (b.sold || 0) - (a.sold || 0));

  res.json([...favs, ...top]);
});

// Favorite toggle
app.post("/favorite", auth, (req, res) => {
  const { productId } = req.body;
  const user = req.user;

  if (user.favorites.includes(productId)) {
    user.favorites = user.favorites.filter((id) => id !== productId);
  } else {
    user.favorites.push(productId);
    const p = db.products.find((p) => p.id === productId);
    if (p) p.favCount = (p.favCount || 0) + 1;
  }

  saveDB();
  res.json({ ok: true, favorites: user.favorites });
});

// ============ CART ROUTES ============

// Add to cart
app.post("/cart/add", auth, (req, res) => {
  const { productId, quantity } = req.body;
  const user = req.user;
  const product = db.products.find((p) => p.id === productId);

  if (!product) return res.status(404).json({ error: "Product not found" });
  if (quantity <= 0 || quantity > product.stock)
    return res.status(400).json({ error: "Invalid quantity" });

  const existing = user.cart.find((c) => c.productId === productId);
  if (existing) existing.quantity += quantity;
  else user.cart.push({ productId, quantity });

  saveDB();
  res.json({ ok: true, cart: user.cart });
});

// Remove from cart
app.post("/cart/remove", auth, (req, res) => {
  const { productId } = req.body;
  const user = req.user;
  user.cart = user.cart.filter((c) => c.productId !== productId);
  saveDB();
  res.json({ ok: true, cart: user.cart });
});

// Checkout
app.post("/cart/checkout", auth, (req, res) => {
  const user = req.user;
  if (!user.cart.length) return res.status(400).json({ error: "Cart empty" });

  let total = 0;
  const summary = [];

  user.cart.forEach((item) => {
    const product = db.products.find((p) => p.id === item.productId);
    if (!product || product.stock < item.quantity) return;
    product.stock -= item.quantity;
    product.sold = (product.sold || 0) + item.quantity;

    const cost = item.quantity * product.price;
    total += cost;
    summary.push(`${item.quantity}x ${product.name} = $${cost.toFixed(2)}`);
  });

  user.cart = [];
  saveDB();

  const msg = `🛒 Purchase by ${user.id}\n\n${summary.join("\n")}\n\n💰 Total: $${total.toFixed(
    2
  )}`;
  sendTelegram(msg);

  res.json({ ok: true, summary, total });
});

// Get cart
app.get("/cart", auth, (req, res) => {
  const user = req.user;
  const details = user.cart.map((item) => {
    const p = db.products.find((pr) => pr.id === item.productId);
    return {
      name: p.name,
      price: p.price,
      quantity: item.quantity,
      total: p.price * item.quantity,
    };
  });
  res.json({ cart: details, total: details.reduce((a, b) => a + b.total, 0) });
});

// ============ BUG REPORTS ============
app.post("/bug", auth, (req, res) => {
  const { message } = req.body;
  sendTelegram(`🐞 Bug report from ${req.user.id}: ${message}`);
  res.json({ ok: true });
});

// Save every minute
setInterval(saveDB, 60000);

// Start server
app.listen(PORT, () =>
  console.log(`🚀 Professional Shop Server running at http://localhost:${PORT}`)
);