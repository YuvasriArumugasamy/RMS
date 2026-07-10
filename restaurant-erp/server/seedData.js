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
      // Starters
      { name: 'Veg Spring Roll', category: 'Starters', price: 149, available: true, image: '🥟', recipe: [] },
      { name: 'Paneer Tikka', category: 'Starters', price: 199, available: true, image: '🍢',
        recipe: [{ ingredientId: ingredients[4]._id, qty: 0.2 }, { ingredientId: ingredients[5]._id, qty: 0.05 }] },
      { name: 'Chicken 65', category: 'Starters', price: 199, available: true, image: '🍗',
        recipe: [{ ingredientId: ingredients[0]._id, qty: 0.2 }] },
      { name: 'Chicken Wings', category: 'Starters', price: 199, available: true, image: '🍗',
        recipe: [{ ingredientId: ingredients[0]._id, qty: 0.2 }] },
      { name: 'Fish Finger', category: 'Starters', price: 199, available: true, image: '🐟', recipe: [] },
      { name: 'French Fries', category: 'Starters', price: 149, available: true, image: '🍟', recipe: [] },

      // Main Course
      { name: 'Veg Biryani', category: 'Main Course', price: 249, available: true, image: '🍚',
        recipe: [{ ingredientId: ingredients[1]._id, qty: 0.15 }, { ingredientId: ingredients[2]._id, qty: 0.1 }] },
      { name: 'Chicken Biryani', category: 'Main Course', price: 299, available: true, image: '🍗',
        recipe: [{ ingredientId: ingredients[0]._id, qty: 0.2 }, { ingredientId: ingredients[1]._id, qty: 0.15 }] },
      { name: 'Paneer Butter Masala', category: 'Main Course', price: 249, available: true, image: '🍛',
        recipe: [{ ingredientId: ingredients[4]._id, qty: 0.2 }] },
      { name: 'Chicken Butter Masala', category: 'Main Course', price: 299, available: true, image: '🍛',
        recipe: [{ ingredientId: ingredients[0]._id, qty: 0.25 }] },
      { name: 'Veg Fried Rice', category: 'Main Course', price: 199, available: true, image: '🍚', recipe: [] },
      { name: 'Chicken Fried Rice', category: 'Main Course', price: 249, available: true, image: '🍚', recipe: [] },
      { name: 'Veg Noodles', category: 'Main Course', price: 199, available: true, image: '🍜', recipe: [] },
      { name: 'Chicken Noodles', category: 'Main Course', price: 249, available: true, image: '🍜', recipe: [] },

      // Bread
      { name: 'Tandoori Roti', category: 'Bread', price: 30, available: true, image: '🫓', recipe: [] },
      { name: 'Butter Roti', category: 'Bread', price: 40, available: true, image: '🫓', recipe: [] },
      { name: 'Naan', category: 'Bread', price: 60, available: true, image: '🫓', recipe: [] },
      { name: 'Butter Naan', category: 'Bread', price: 70, available: true, image: '🫓', recipe: [] },
      { name: 'Garlic Naan', category: 'Bread', price: 80, available: true, image: '🫓', recipe: [] },
      { name: 'Stuffed Paratha', category: 'Bread', price: 80, available: true, image: '🫓', recipe: [] },

      // Pizza
      { name: 'Margherita Pizza', category: 'Pizza', price: 249, available: true, image: '🍕', recipe: [] },
      { name: 'Veggie Pizza', category: 'Pizza', price: 299, available: true, image: '🍕', recipe: [] },
      { name: 'Paneer Pizza', category: 'Pizza', price: 349, available: true, image: '🍕', recipe: [] },
      { name: 'Farm House Pizza', category: 'Pizza', price: 349, available: true, image: '🍕', recipe: [] },
      { name: 'Chicken Tikka Pizza', category: 'Pizza', price: 399, available: true, image: '🍕', recipe: [] },
      { name: 'BBQ Chicken Pizza', category: 'Pizza', price: 399, available: true, image: '🍕', recipe: [] },

      // Beverages
      { name: 'Fresh Lime Soda', category: 'Beverages', price: 69, available: true, image: '🍹', recipe: [] },
      { name: 'Mint Mojito', category: 'Beverages', price: 99, available: true, image: '🍹', recipe: [] },
      { name: 'Cold Coffee', category: 'Beverages', price: 129, available: true, image: '☕', recipe: [] },
      { name: 'Milkshake', category: 'Beverages', price: 129, available: true, image: '🥤', recipe: [] },
      { name: 'Lassi (Sweet / Salt)', category: 'Beverages', price: 79, available: true, image: '🥛', recipe: [] },
      { name: 'Soft Drinks', category: 'Beverages', price: 49, available: true, image: '🥤', recipe: [] },
      { name: 'Mineral Water', category: 'Beverages', price: 20, available: true, image: '💧', recipe: [] },

      // Desserts
      { name: 'Gulab Jamun (2 Pcs)', category: 'Desserts', price: 79, available: true, image: '🥣', recipe: [] },
      { name: 'Ice Cream (2 Scoops)', category: 'Desserts', price: 89, available: true, image: '🍨', recipe: [] },
      { name: 'Chocolate Brownie', category: 'Desserts', price: 129, available: true, image: '🍰', recipe: [] },
      { name: 'Fruit Salad with Ice Cream', category: 'Desserts', price: 129, available: true, image: '🍧', recipe: [] },

      // Waffles
      { name: 'Classic Belgian Waffle', category: 'Waffles', price: 199, available: true, image: '🧇', recipe: [] },
      { name: 'Strawberry Waffle', category: 'Waffles', price: 249, available: true, image: '🧇', recipe: [] },
      { name: 'Blueberry Waffle', category: 'Waffles', price: 269, available: true, image: '🧇', recipe: [] },
      { name: 'Red Velvet Waffle', category: 'Waffles', price: 299, available: true, image: '🧇', recipe: [] },
      { name: 'Brownie Waffle', category: 'Waffles', price: 319, available: true, image: '🧇', recipe: [] },
      { name: 'Chocolate Overload Waffle', category: 'Waffles', price: 299, available: true, image: '🧇', recipe: [] },
      { name: 'Caramel Banana Waffle', category: 'Waffles', price: 289, available: true, image: '🧇', recipe: [] },
      { name: 'Oreo Waffle', category: 'Waffles', price: 299, available: true, image: '🧇', recipe: [] }
    ]);
    console.log(`✅ Seeded ${menuItems.length} menu items`);

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
