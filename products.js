const products = [
  { id: 1, name: "Apple", category: "fruit", price: 1.50, stock: 50, lastChecked: Date.now() - 2*24*60*60*1000, image: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?crop=entropy&cs=tinysrgb&fit=max&h=200&w=300" },
  { id: 2, name: "Banana", category: "fruit", price: 1.20, stock: 30, lastChecked: Date.now() - 1*24*60*60*1000, image: "https://images.unsplash.com/photo-1574226516831-e1dff420e9a1?crop=entropy&cs=tinysrgb&fit=max&h=200&w=300" },
  { id: 3, name: "Orange", category: "fruit", price: 2.00, stock: 40, lastChecked: Date.now() - 3*24*60*60*1000, image: "https://images.unsplash.com/photo-1589927986089-35812389fc6b?crop=entropy&cs=tinysrgb&fit=max&h=200&w=300" },
  { id: 4, name: "Tomato", category: "veg", price: 2.50, stock: 60, lastChecked: Date.now() - 1*24*60*60*1000, image: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?crop=entropy&cs=tinysrgb&fit=max&h=200&w=300" },
  { id: 5, name: "Potato", category: "veg", price: 1.00, stock: 100, lastChecked: Date.now() - 2*24*60*60*1000, image: "https://images.unsplash.com/photo-1582515073490-39981347c7d6?crop=entropy&cs=tinysrgb&fit=max&h=200&w=300" },
  { id: 6, name: "Carrot", category: "veg", price: 1.30, stock: 80, lastChecked: Date.now() - 4*24*60*60*1000, image: "https://images.unsplash.com/photo-1617196038333-d92e86e0f80f?crop=entropy&cs=tinysrgb&fit=max&h=200&w=300" },
  { id: 7, name: "Milk", category: "dairy", price: 2.20, stock: 50, lastChecked: Date.now() - 1*24*60*60*1000, image: "https://images.unsplash.com/photo-1582281298054-f6fffb495a08?crop=entropy&cs=tinysrgb&fit=max&h=200&w=300" },
  { id: 8, name: "Cheese", category: "dairy", price: 3.50, stock: 35, lastChecked: Date.now() - 3*24*60*60*1000, image: "https://images.unsplash.com/photo-1589927986089-35812389fc6b?crop=entropy&cs=tinysrgb&fit=max&h=200&w=300" },
  { id: 9, name: "Yogurt", category: "dairy", price: 1.80, stock: 45, lastChecked: Date.now() - 2*24*60*60*1000, image: "https://images.unsplash.com/photo-1598514982902-8db119f32b7e?crop=entropy&cs=tinysrgb&fit=max&h=200&w=300" },
  { id: 10, name: "Strawberry", category: "fruit", price: 4.00, stock: 25, lastChecked: Date.now() - 1*24*60*60*1000, image: "https://images.unsplash.com/photo-1572441710121-6d8b0b2c5f0b?crop=entropy&cs=tinysrgb&fit=max&h=200&w=300" }
  // Continue for the rest of your 50 products with proper images...
];