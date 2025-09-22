// node.js - Ultimate Shopping App Entry
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ------------------------------
// ENV SETUP
// ------------------------------
dotenv.config();

// __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ------------------------------
// APP SETUP
// ------------------------------
const app = express();
const PORT = process.env.PORT || 3000;

// ------------------------------
// MIDDLEWARE
// ------------------------------
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// ------------------------------
// TELEGRAM NOTIFIER
// ------------------------------
import fetch from 'node-fetch'; // if needed, install with npm install node-fetch

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.MOM_CHAT_ID;

async function telegramNotify(message) {
  try {
    if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
    });
  } catch (err) {
    console.error('Telegram notify failed:', err);
  }
}

// ------------------------------
// START SERVER
// ------------------------------
app.listen(PORT, () => {
  console.log(`✅ Ultimate Shopping App running on port ${PORT}`);
});

// Example route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

export { app, telegramNotify };