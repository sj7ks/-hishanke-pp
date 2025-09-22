// save this as notifyTest.js
const axios = require("axios");

// Bot token and mom's chat ID
const botToken = "7837080864:AAERfFlMoUusexk1jWKh3XNNaeNgGGJrKR4";
const chatId = "6668468597"; // mom's chat ID

async function notifyMom(message) {
  try {
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown" // optional, allows bold/italic
    });
    console.log("Message sent!");
  } catch (err) {
    console.error("Telegram error:", err.response?.data || err.message);
  }
}

// Test message
notifyMom("✅ This is a test message from your Ühishanke app!");