// server.js - Ultimate Ühishanke backend
const express = require('express');
const app = express();
const path = require('path');
const products = require('./products'); // your products.js
const bodyParser = require('body-parser');

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));
app.use(bodyParser.json());

// In-memory storage for user interactions
let userStates = {}; // {userId: {lastCheck: {productId: timestamp}, lastBuy: {productId: timestamp}}}

// Get all products
app.get('/api/products', (req, res) => {
    res.json(products);
});

// Handle check requests
app.post('/api/check', (req, res) => {
    const { userId, productId } = req.body;
    const now = Date.now();

    if (!userStates[userId]) userStates[userId] = { lastCheck: {}, lastBuy: {} };

    // Cooldown: 10 seconds per product
    const lastCheckTime = userStates[userId].lastCheck[productId] || 0;
    if (now - lastCheckTime < 10000) {
        return res.status(429).json({ success: false, message: "Cooldown active. Wait a few seconds." });
    }

    // Update lastCheck
    userStates[userId].lastCheck[productId] = now;

    // Update product lastChecked timestamp
    const product = products.find(p => p.id === productId);
    if (product) product.lastChecked = new Date().toISOString().slice(0, 19).replace("T", " ");

    // Here you can also trigger Telegram notification (to your mom)
    // sendTelegramMessage(`Check requested for product: ${product.name} by user: ${userId}`);

    res.json({ success: true, message: `Checked product: ${product.name}`, product });
});

// Handle buy requests
app.post('/api/buy', (req, res) => {
    const { userId, productId, quantity } = req.body;
    const now = Date.now();

    if (!userStates[userId]) userStates[userId] = { lastCheck: {}, lastBuy: {} };

    const lastBuyTime = userStates[userId].lastBuy[productId] || 0;
    if (now - lastBuyTime < 10000) {
        return res.status(429).json({ success: false, message: "Cooldown active. Wait a few seconds." });
    }

    const product = products.find(p => p.id === productId);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    if (quantity > product.stock) {
        return res.status(400).json({ success: false, message: "Not enough stock" });
    }

    // Update stock
    product.stock -= quantity;
    userStates[userId].lastBuy[productId] = now;

    // Placeholder for payment integration
    const paymentInfo = `Send $${(product.price * quantity).toFixed(2)} to your mom`;

    // Optional Telegram notification
    // sendTelegramMessage(`Buy request: ${quantity} x ${product.name} by user: ${userId}`);

    res.json({ success: true, message: `Bought ${quantity} x ${product.name}`, paymentInfo, product });
});

// Placeholder Telegram notification function
function sendTelegramMessage(msg) {
    // You can integrate node-telegram-bot-api here
    console.log("Telegram notification:", msg);
}

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));