// app.js - God Level Backend
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const fetch = require("node-fetch");
const products = require("./products");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // use true with HTTPS
}));

// ===== USERS (simple mock auth for demo) =====
const users = [
    { id: 1, username: "admin", password: "admin123" },
    { id: 2, username: "user", password: "password" }
];

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    req.session.userId = user.id;
    res.json({ success: true, user: { id: user.id, username: user.username } });
});

app.post("/logout", (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Middleware check login
function requireLogin(req, res, next) {
    if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });
    next();
}

// ===== PRODUCTS =====
app.get("/products", (req, res) => {
    res.json(products);
});

// ===== CART =====
app.get("/cart", requireLogin, (req, res) => {
    res.json(req.session.cart || []);
});

app.post("/cart", requireLogin, (req, res) => {
    const { productId, qty } = req.body;
    if (!req.session.cart) req.session.cart = [];

    const existing = req.session.cart.find(item => item.productId === productId);
    if (existing) existing.qty += qty;
    else req.session.cart.push({ productId, qty });

    res.json({ success: true, cart: req.session.cart });
});

// ===== FAVORITES =====
app.get("/favorites", requireLogin, (req, res) => {
    res.json(req.session.favorites || []);
});

app.post("/favorites", requireLogin, (req, res) => {
    const { productId } = req.body;
    if (!req.session.favorites) req.session.favorites = [];

    if (req.session.favorites.includes(productId)) {
        req.session.favorites = req.session.favorites.filter(id => id !== productId);
    } else {
        req.session.favorites.push(productId);
    }

    res.json({ success: true, favorites: req.session.favorites });
});

// ===== CHECKOUT (with Telegram notification) =====
app.post("/checkout", requireLogin, async (req, res) => {
    const cart = req.session.cart || [];
    if (cart.length === 0) return res.status(400).json({ error: "Cart empty" });

    const orderSummary = cart.map(item => {
        const p = products.find(prod => prod.id === item.productId);
        return `${p.name} x${item.qty} = $${(p.price * item.qty).toFixed(2)}`;
    }).join("\n");

    const total = cart.reduce((sum, item) => {
        const p = products.find(prod => prod.id === item.productId);
        return sum + (p.price * item.qty);
    }, 0);

    // Send Telegram notification
    try {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text: `🛒 New Order:\n\n${orderSummary}\n\nTotal: $${total.toFixed(2)}`
            })
        });
    } catch (err) {
        console.error("Telegram Error:", err);
    }

    req.session.cart = []; // clear cart after checkout
    res.json({ success: true, message: "Checkout complete, order sent!" });
});

// ===== START SERVER =====
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});