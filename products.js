const products = [];

const categories = ["fruit", "veg", "dairy"];
const sampleNames = [
  "Apple", "Banana", "Orange", "Tomato", "Potato", "Carrot", "Milk", "Cheese",
  "Yogurt", "Strawberry", "Blueberry", "Lettuce", "Cucumber", "Spinach", "Butter",
  "Eggs", "Chicken", "Beef", "Pork", "Salmon", "Bread", "Rice", "Pasta", "Tomato Sauce",
  "Cabbage", "Onion", "Garlic", "Peach", "Plum", "Grapes", "Watermelon", "Peas",
  "Corn", "Bell Pepper", "Mushroom", "Cottage Cheese", "Cream", "Sour Cream",
  "Milkshake", "Yogurt Drink", "Lemon", "Lime", "Kiwi", "Avocado", "Broccoli",
  "Cauliflower", "Spinach", "Zucchini", "Eggplant", "Pumpkin"
];

for (let i = 0; i < 50; i++) {
  const category = categories[Math.floor(Math.random() * categories.length)];
  const name = sampleNames[i % sampleNames.length];
  const price = (Math.random() * 10 + 1).toFixed(2);
  const stock = Math.floor(Math.random() * 100 + 1);
  const lastChecked = Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000); // random last 7 days
  const image = `https://picsum.photos/seed/${i}/200/150`;

  products.push({
    id: i + 1,
    name,
    category,
    price,
    stock,
    lastChecked,
    image
  });
}