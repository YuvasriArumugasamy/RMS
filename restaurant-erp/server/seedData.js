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

    await User.deleteMany({});
    await MenuItem.deleteMany({});
    await Table.deleteMany({});
    await Ingredient.deleteMany({});
    await Staff.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // ── Users ──────────────────────────────────────────────
    const users = await User.create([
      { username: 'admin',    password: 'Admin@123',   role: 'Admin',   phone: '9999999901' },
      { username: 'manager',  password: 'Manager@123', role: 'Manager', phone: '9999999902' },
      { username: 'chef1',    password: 'Chef@123',    role: 'Chef',    phone: '9999999903' },
      { username: 'waiter1',  password: 'Waiter@123',  role: 'Waiter',  phone: '9999999904' },
      { username: 'cashier1', password: 'Cashier@123', role: 'Cashier', phone: '9999999905' },
    ]);
    console.log('✅ Created 5 users');

    // ── Staff ──────────────────────────────────────────────
    await Staff.create([
      { name: 'Admin User',    role: 'Admin',   phone: '9999999901', userId: users[0]._id, status: 'Active' },
      { name: 'Manager Arun',  role: 'Manager', phone: '9999999902', userId: users[1]._id, status: 'Active' },
      { name: 'Chef Ravi',     role: 'Chef',    phone: '9999999903', userId: users[2]._id, status: 'Active' },
      { name: 'Waiter Suresh', role: 'Waiter',  phone: '9999999904', userId: users[3]._id, status: 'Active' },
      { name: 'Cashier Priya', role: 'Cashier', phone: '9999999905', userId: users[4]._id, status: 'Active' },
    ]);
    console.log('✅ Created 5 staff records');

    // ── Ingredients ────────────────────────────────────────
    const ing = await Ingredient.create([
      { name: 'Chicken',      category: 'Non Veg',    stock: 20, unit: 'kg',  threshold: 5  }, // 0
      { name: 'Mutton',       category: 'Non Veg',    stock: 10, unit: 'kg',  threshold: 3  }, // 1
      { name: 'Fish',         category: 'Non Veg',    stock: 8,  unit: 'kg',  threshold: 3  }, // 2
      { name: 'Basmati Rice', category: 'Grains',     stock: 30, unit: 'kg',  threshold: 5  }, // 3
      { name: 'Maida',        category: 'Grains',     stock: 15, unit: 'kg',  threshold: 4  }, // 4
      { name: 'Paneer',       category: 'Dairy',      stock: 6,  unit: 'kg',  threshold: 2  }, // 5
      { name: 'Tomato',       category: 'Vegetables', stock: 8,  unit: 'kg',  threshold: 3  }, // 6
      { name: 'Onion',        category: 'Vegetables', stock: 10, unit: 'kg',  threshold: 3  }, // 7
      { name: 'Potato',       category: 'Vegetables', stock: 15, unit: 'kg',  threshold: 5  }, // 8
      { name: 'Milk',         category: 'Dairy',      stock: 20, unit: 'ltr', threshold: 5  }, // 9
      { name: 'Eggs',         category: 'Dairy',      stock: 30, unit: 'pcs', threshold: 10 }, // 10
      { name: 'Cheese',       category: 'Dairy',      stock: 4,  unit: 'kg',  threshold: 2  }, // 11
    ]);
    console.log('✅ Created 12 ingredients');

    // image path helper — served from public/menu/ (no hash)
    const m = (f) => `/menu/${f}`;
