// Import Express
const express = require('express');
const path = require('path');
const app = express();

// Port configuration
const PORT = process.env.PORT || 3000;

// Serve all static files (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname)));

// Optional: Serve a default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Optional: Health check route
app.get('/health', (req, res) => {
  res.json({ status: "ok", message: "Ühishanke Pro server is running!" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔥 Ühishanke Pro server running on port ${PORT}`);
});