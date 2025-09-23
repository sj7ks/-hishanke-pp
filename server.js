const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// Static files
app.use(express.static(path.join(__dirname)));
app.use(bodyParser.json());

// Routes
app.get('/', (req,res)=>res.sendFile(path.join(__dirname,'index.html')));

// Products API
app.get('/products', (req,res)=>{
  const products = require('./products.js');
  res.json(products);
});

// Start server
app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));