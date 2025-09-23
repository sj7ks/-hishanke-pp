// products.js
// Central product catalog
// Each product matches an image inside /images folder

const products = [
  {
    id: 1,
    name: "Amaizin coco crispy rolls original org. 6x140g",
    price: 12.99,
    stock: 25,
    soldCount: 230,
    favorites: 18,
    image: "images/Amaizin coco crispy rolls original org. 6x140g.jpg"
  },
  {
    id: 2,
    name: "Amaizin Organic Crispy Chili oil 6x170g",
    price: 9.49,
    stock: 40,
    soldCount: 315,
    favorites: 27,
    image: "images/Amaizin Organic Crispy Chili oil 6x170g.jpg"
  },
  {
    id: 3,
    name: "Amaizin Tomato corn rolls org. 14x100g",
    price: 15.75,
    stock: 18,
    soldCount: 120,
    favorites: 11,
    image: "images/Amaizin Tomato corn rolls org. 14x100g.png"
  },
  {
    id: 4,
    name: "Cherries sour dried org. 10kg",
    price: 89.00,
    stock: 5,
    soldCount: 52,
    favorites: 6,
    image: "images/Cherries sour dried org. 10kg.png"
  },
  {
    id: 5,
    name: "Cocoa mass org. 25kg",
    price: 199.99,
    stock: 8,
    soldCount: 76,
    favorites: 14,
    image: "images/Cocoa mass org. 25kg.png"
  },
  {
    id: 6,
    name: "Coconut Sugar 14-16 Mesh GF org. 25kg",
    price: 145.50,
    stock: 12,
    soldCount: 64,
    favorites: 9,
    image: "images/Coconut Sugar 14-16 Mesh GF org. 25kg.png"
  },
  {
    id: 7,
    name: "Flax seed brown org. 25kg",
    price: 59.90,
    stock: 20,
    soldCount: 142,
    favorites: 22,
    image: "images/Flax seed brown org. 25kg.png"
  },
  {
    id: 8,
    name: "La Bio Idea Orzo Turmeric&Black Pepper org 6x400g",
    price: 24.30,
    stock: 30,
    soldCount: 188,
    favorites: 31,
    image: "images/La Bio Idea Orzo Turmeric&Black Pepper org 6x400g.png"
  }
];

module.exports = products;
