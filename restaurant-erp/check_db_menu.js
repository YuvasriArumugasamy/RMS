const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_erp';

const MenuItemSchema = new mongoose.Schema({
  name: String,
  category: String,
  price: Number,
  available: Boolean,
  image: String
});

const MenuItem = mongoose.model('MenuItem', MenuItemSchema, 'menuitems');

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
  const items = await MenuItem.find({});
  console.log('Found', items.length, 'menu items');
  items.slice(0, 10).forEach(item => {
    console.log(`- ${item.name}: image="${item.image}", price=${item.price}, category="${item.category}"`);
  });
  await mongoose.disconnect();
}

run().catch(console.error);
