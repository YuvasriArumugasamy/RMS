require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const MenuItem = require('./models/MenuItem');
const Table = require('./models/Table');
const Ingredient = require('./models/Ingredient');
const Staff = require('./models/Staff');

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');

    // Clear existing data
    await User.deleteMany({});
    await MenuItem.deleteMany({});
    await Table.deleteMany({});
    await Ingredient.deleteMany({});
    await Staff.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create users
    const users = await User.create([
      { username: 'admin', password: 'Admin@123', role: 'Admin', phone: '9999999901' },
      { username: 'manager', password: 'Manager@123', role: 'Manager', phone: '9999999902' },
      { username: 'chef1', password: 'Chef@123', role: 'Chef', phone: '9999999903' },
      { username: 'waiter1', password: 'Waiter@123', role: 'Waiter', phone: '9999999904' },
      { username: 'cashier1', password: 'Cashier@123', role: 'Cashier', phone: '9999999905' },
    ]);
    console.log('✅ Created 5 users');

    // Create staff records linked to users
    const staffRecords = await Staff.create([
      { name: 'Admin User', role: 'Admin', phone: '9999999901', userId: users[0]._id, status: 'Active' },
      { name: 'Manager User', role: 'Manager', phone: '9999999902', userId: users[1]._id, status: 'Active' },
      { name: 'Chef Ravi', role: 'Chef', phone: '9999999903', userId: users[2]._id, status: 'Active' },
      { name: 'Waiter Suresh', role: 'Waiter', phone: '9999999904', userId: users[3]._id, status: 'Active' },
      { name: 'Cashier Priya', role: 'Cashier', phone: '9999999905', userId: users[4]._id, status: 'Active' },
    ]);
    console.log('✅ Created 5 staff records');

    // Create ingredients
    const ingredients = await Ingredient.create([
      { name: 'Chicken', category: 'Non Veg', stock: 12, unit: 'kg', threshold: 5 },
      { name: 'Basmati Rice', category: 'Grains', stock: 22, unit: 'kg', threshold: 5 },
      { name: 'Tomato', category: 'Vegetables', stock: 5, unit: 'kg', threshold: 5 },
      { name: 'Onion', category: 'Vegetables', stock: 4, unit: 'kg', threshold: 5 },
      { name: 'Paneer', category: 'Dairy', stock: 2, unit: 'kg', threshold: 3 },
      { name: 'Capsicum', category: 'Vegetables', stock: 15, unit: 'kg', threshold: 5 },
    ]);
    console.log('✅ Created 6 ingredients');

    // Create menu items with recipes
    const menuItems = await MenuItem.create([
      { name: 'Chicken Biryani', category: 'Main Course', price: 280, available: true, image: '🍗',
        recipe: [{ ingredientId: ingredients[0]._id, qty: 0.2 }, { ingredientId: ingredients[1]._id, qty: 0.15 }] },
      { name: 'Paneer Tikka', category: 'Starters', price: 220, available: true, image: '🍢',
        recipe: [{ ingredientId: ingredients[4]._id, qty: 0.2 }, { ingredientId: ingredients[5]._id, qty: 0.05 }] },
      { name: 'Fresh Lime Soda', category: 'Beverages', price: 80, available: true, image: '🍹', recipe: [] },
      { name: 'Butter Naan', category: 'Bread', price: 40, available: true, image: '🫓', recipe: [] },
      { name: 'Butter Chicken', category: 'Main Course', price: 250, available: true, image: '🍛',
        recipe: [{ ingredientId: ingredients[0]._id, qty: 0.25 }] },
      { name: 'Veg Biryani', category: 'Main Course', price: 180, available: true, image: '🍚',
        recipe: [{ ingredientId: ingredients[1]._id, qty: 0.15 }, { ingredientId: ingredients[2]._id, qty: 0.1 }] },
      { name: 'Masala Dosa', category: 'Main Course', price: 90, available: true, image: '🥞', recipe: [] },
      { name: 'Pepsi', category: 'Beverages', price: 50, available: true, image: '🥤', recipe: [] },
    ]);
    console.log('✅ Created 8 menu items');

    // Create tables
    const tables = await Table.create([
      { name: 'Table 01', capacity: 2, status: 'Available' },
      { name: 'Table 02', capacity: 4, status: 'Available' },
      { name: 'Table 03', capacity: 6, status: 'Available' },
      { name: 'Table 04', capacity: 8, status: 'Available' },
      { name: 'Table 05', capacity: 4, status: 'Available' },
    ]);
    console.log('✅ Created 5 tables');

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('📝 Login Credentials:');
    console.log('   Admin    → admin / Admin@123');
    console.log('   Manager  → manager / Manager@123');
    console.log('   Chef     → chef1 / Chef@123');
    console.log('   Waiter   → waiter1 / Waiter@123');
    console.log('   Cashier  → cashier1 / Cashier@123\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed Error:', err);
    process.exit(1);
  }
};

seedDatabase();
