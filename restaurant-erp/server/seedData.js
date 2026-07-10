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

    // ── Users ─────────────────────────────────────────────
    const users = await User.create([
      { username: 'admin',    password: 'Admin@123',   role: 'Admin',   phone: '9999999901' },
      { username: 'manager',  password: 'Manager@123', role: 'Manager', phone: '9999999902' },
      { username: 'chef1',    password: 'Chef@123',    role: 'Chef',    phone: '9999999903' },
      { username: 'waiter1',  password: 'Waiter@123',  role: 'Waiter',  phone: '9999999904' },
      { username: 'cashier1', password: 'Cashier@123', role: 'Cashier', phone: '9999999905' },
    ]);
    console.log('✅ Created 5 users');

    // ── Staff ─────────────────────────────────────────────
    await Staff.create([
      { name: 'Admin User',    role: 'Admin',   phone: '9999999901', userId: users[0]._id, status: 'Active' },
      { name: 'Manager Arun',  role: 'Manager', phone: '9999999902', userId: users[1]._id, status: 'Active' },
      { name: 'Chef Ravi',     role: 'Chef',    phone: '9999999903', userId: users[2]._id, status: 'Active' },
      { name: 'Waiter Suresh', role: 'Waiter',  phone: '9999999904', userId: users[3]._id, status: 'Active' },
      { name: 'Cashier Priya', role: 'Cashier', phone: '9999999905', userId: users[4]._id, status: 'Active' },
    ]);
    console.log('✅ Created 5 staff records');

    // ── Ingredients ───────────────────────────────────────
    const ingredients = await Ingredient.create([
      { name: 'Chicken',      category: 'Non Veg',    stock: 20, unit: 'kg',  threshold: 5 },
      { name: 'Mutton',       category: 'Non Veg',    stock: 10, unit: 'kg',  threshold: 3 },
      { name: 'Fish',         category: 'Non Veg',    stock: 8,  unit: 'kg',  threshold: 3 },
      { name: 'Basmati Rice', category: 'Grains',     stock: 30, unit: 'kg',  threshold: 5 },
      { name: 'Maida',        category: 'Grains',     stock: 15, unit: 'kg',  threshold: 4 },
      { name: 'Paneer',       category: 'Dairy',      stock: 6,  unit: 'kg',  threshold: 2 },
      { name: 'Tomato',       category: 'Vegetables', stock: 8,  unit: 'kg',  threshold: 3 },
      { name: 'Onion',        category: 'Vegetables', stock: 10, unit: 'kg',  threshold: 3 },
      { name: 'Potato',       category: 'Vegetables', stock: 15, unit: 'kg',  threshold: 5 },
      { name: 'Milk',         category: 'Dairy',      stock: 20, unit: 'ltr', threshold: 5 },
      { name: 'Eggs',         category: 'Dairy',      stock: 30, unit: 'pcs', threshold: 10 },
      { name: 'Cheese',       category: 'Dairy',      stock: 4,  unit: 'kg',  threshold: 2 },
    ]);
    console.log('✅ Created 12 ingredients');

    // ── Image path helper (relative to client/src/assets) ──
    // Frontend will resolve these via a helper. Emoji fallback kept for items without photos.
    const img = (filename) => `/assets/${filename}`;

    // ── Menu Items ────────────────────────────────────────
    await MenuItem.create([

      // ── STARTERS ─────────────────────────────────────────
      {
        name: 'Fish Finger', category: 'Starters', price: 199, available: true,
        image: img('ChatGPT Image Jul 10, 2026, 11_45_12 AM.png'),
        description: 'Crispy golden fish fingers served with tartar sauce & lemon',
        recipe: [{ ingredientId: ingredients[2]._id, qty: 0.2 }]
      },
      {
        name: 'Paneer Tikka', category: 'Starters', price: 199, available: true,
        image: img('Grilled paneer with chutney and veggies copy.png'),
        description: 'Grilled paneer with capsicum & onion, served with mint chutney',
        recipe: [{ ingredientId: ingredients[5]._id, qty: 0.2 }]
      },
      {
        name: 'Chicken Wings', category: 'Starters', price: 199, available: true,
        image: '🍗',
        description: 'Crispy spiced chicken wings with dipping sauce',
        recipe: [{ ingredientId: ingredients[0]._id, qty: 0.25 }]
      },

      // ── BIRYANI & RICE ────────────────────────────────────
      {
        name: 'Chicken Biryani', category: 'Biryani & Rice', price: 299, available: true,
        image: img('ChatGPT Image Jul 10, 2026, 11_48_07 AM.png'),
        description: 'Aromatic basmati rice layered with spiced chicken & caramelised onions',
        recipe: [
          { ingredientId: ingredients[0]._id, qty: 0.25 },
          { ingredientId: ingredients[3]._id, qty: 0.2 },
        ]
      },
      {
        name: 'Veg Biryani', category: 'Biryani & Rice', price: 249, available: true,
        image: img('Screenshot 2026-07-10 120146.png'),
        description: 'Fragrant basmati rice with fresh vegetables & whole spices',
        recipe: [
          { ingredientId: ingredients[3]._id, qty: 0.2 },
          { ingredientId: ingredients[8]._id, qty: 0.1 },
        ]
      },
      {
        name: 'Mutton Biryani', category: 'Biryani & Rice', price: 299, available: true,
        image: img('Screenshot 2026-07-10 120157.png'),
        description: 'Slow-cooked mutton layered with saffron-infused basmati rice',
        recipe: [
          { ingredientId: ingredients[1]._id, qty: 0.25 },
          { ingredientId: ingredients[3]._id, qty: 0.2 },
        ]
      },

      // ── MAIN COURSE ───────────────────────────────────────
      {
        name: 'Paneer Butter Masala', category: 'Main Course', price: 249, available: true,
        image: img('Screenshot 2026-07-10 120208.png'),
        description: 'Soft paneer cubes in rich, creamy tomato-butter gravy',
        recipe: [
          { ingredientId: ingredients[5]._id, qty: 0.2 },
          { ingredientId: ingredients[6]._id, qty: 0.1 },
        ]
      },
      {
        name: 'Chicken Butter Masala', category: 'Main Course', price: 299, available: true,
        image: img('Screenshot 2026-07-10 120110.png'),
        description: 'Tender chicken in a velvety tomato-butter-cream sauce',
        recipe: [
          { ingredientId: ingredients[0]._id, qty: 0.25 },
          { ingredientId: ingredients[6]._id, qty: 0.1 },
        ]
      },
      {
        name: 'Dal', category: 'Main Course', price: 40, available: true,
        image: '🫘',
        description: 'Home-style dal tadka — comforting and flavourful',
        recipe: []
      },

      // ── BREAD ─────────────────────────────────────────────
      {
        name: 'Tandoori Roti', category: 'Bread', price: 30, available: true,
        image: img('Screenshot 2026-07-10 120004.png'),
        description: 'Whole wheat roti baked fresh in a tandoor',
        recipe: [{ ingredientId: ingredients[4]._id, qty: 0.05 }]
      },
      {
        name: 'Butter Naan', category: 'Bread', price: 70, available: true,
        image: img('Screenshot 2026-07-10 115929.png'),
        description: 'Soft, fluffy naan brushed with butter straight from the tandoor',
        recipe: [{ ingredientId: ingredients[4]._id, qty: 0.08 }]
      },
      {
        name: 'Stuffed Paratha', category: 'Bread', price: 80, available: true,
        image: img('Screenshot 2026-07-10 115947.png'),
        description: 'Whole wheat paratha stuffed with spiced potato filling',
        recipe: [
          { ingredientId: ingredients[4]._id, qty: 0.08 },
          { ingredientId: ingredients[8]._id, qty: 0.1 },
        ]
      },

      // ── PIZZA ─────────────────────────────────────────────
      {
        name: 'Margherita Pizza', category: 'Pizza', price: 249, available: true,
        image: img('Screenshot 2026-07-10 115729.png'),
        description: 'Classic tomato base, mozzarella & fresh basil',
        recipe: [
          { ingredientId: ingredients[4]._id, qty: 0.15 },
          { ingredientId: ingredients[11]._id, qty: 0.1 },
        ]
      },
      {
        name: 'Veggie Pizza', category: 'Pizza', price: 299, available: true,
        image: img('Screenshot 2026-07-10 115743.png'),
        description: 'Loaded with colourful veggies on a herbed tomato base',
        recipe: [
          { ingredientId: ingredients[4]._id, qty: 0.15 },
          { ingredientId: ingredients[11]._id, qty: 0.1 },
        ]
      },
      {
        name: 'Farm House Pizza', category: 'Pizza', price: 349, available: true,
        image: img('Screenshot 2026-07-10 115824.png'),
        description: 'Paneer, capsicum, corn & mushroom on a cheesy base',
        recipe: [
          { ingredientId: ingredients[4]._id, qty: 0.15 },
          { ingredientId: ingredients[5]._id, qty: 0.1 },
          { ingredientId: ingredients[11]._id, qty: 0.1 },
        ]
      },
      {
        name: 'Chicken Tikka Pizza', category: 'Pizza', price: 399, available: true,
        image: img('Screenshot 2026-07-10 115755.png'),
        description: 'Tandoori chicken tikka on a spiced tomato base with cheese',
        recipe: [
          { ingredientId: ingredients[0]._id, qty: 0.15 },
          { ingredientId: ingredients[4]._id, qty: 0.15 },
          { ingredientId: ingredients[11]._id, qty: 0.1 },
        ]
      },

      // ── BURGERS ───────────────────────────────────────────
      {
        name: 'Veg Burger', category: 'Burgers', price: 129, available: true,
        image: img('Screenshot 2026-07-10 152147.png'),
        description: 'Crispy veggie patty with lettuce, tomato & special sauce',
        recipe: []
      },
      {
        name: 'Cheese Burger', category: 'Burgers', price: 159, available: true,
        image: img('Screenshot 2026-07-10 152132.png'),
        description: 'Juicy beef patty topped with melted cheddar cheese',
        recipe: [{ ingredientId: ingredients[11]._id, qty: 0.05 }]
      },
      {
        name: 'Double Patty Burger', category: 'Burgers', price: 249, available: true,
        image: img('Screenshot 2026-07-10 152156.png'),
        description: 'Two flame-grilled patties stacked high with all the fixings',
        recipe: []
      },
      {
        name: 'Combo Burger', category: 'Burgers', price: 299, available: true,
        image: img('Screenshot 2026-07-10 152211.png'),
        description: 'Burger + Golden Fries + Soft Drink — the full meal deal',
        isCombo: true,
        recipe: []
      },

      // ── SNACKS ────────────────────────────────────────────
      {
        name: 'Golden Fries with Ketchup', category: 'Snacks', price: 90, available: true,
        image: img('ChatGPT Image Jul 10, 2026, 12_51_58 PM.png'),
        description: 'Crispy golden fries served with classic ketchup dip',
        recipe: [{ ingredientId: ingredients[8]._id, qty: 0.15 }]
      },

      // ── BEVERAGES ─────────────────────────────────────────
      {
        name: 'Fresh Orange Soda', category: 'Beverages', price: 69, available: true,
        image: img('Screenshot 2026-07-10 115534.png'),
        description: 'Freshly squeezed orange with chilled soda',
        recipe: []
      },
      {
        name: 'Fresh Lime Soda', category: 'Beverages', price: 69, available: true,
        image: '🍋',
        description: 'Tangy fresh lime with sweet or salted soda',
        recipe: []
      },
      {
        name: 'Mint Mojito', category: 'Beverages', price: 99, available: true,
        image: img('Screenshot 2026-07-10 115627.png'),
        description: 'Refreshing mint, lime & crushed ice mocktail',
        recipe: []
      },
      {
        name: 'Cold Coffee', category: 'Beverages', price: 129, available: true,
        image: img('Screenshot 2026-07-10 115545.png'),
        description: 'Rich blended cold coffee topped with whipped cream',
        recipe: [{ ingredientId: ingredients[9]._id, qty: 0.2 }]
      },
      {
        name: 'Milkshake', category: 'Beverages', price: 129, available: true,
        image: img('Screenshot 2026-07-10 115614.png'),
        description: 'Thick & creamy milkshake — chocolate, vanilla or strawberry',
        recipe: [{ ingredientId: ingredients[9]._id, qty: 0.25 }]
      },
      {
        name: 'Soft Drinks', category: 'Beverages', price: 49, available: true,
        image: img('Screenshot 2026-07-10 115644.png'),
        description: 'Chilled Pepsi, Coke, Sprite or 7Up',
        recipe: []
      },

      // ── DESSERTS ──────────────────────────────────────────
      {
        name: 'Gulab Jamun (2 Pcs)', category: 'Desserts', price: 79, available: true,
        image: img('Screenshot 2026-07-10 115411.png'),
        description: 'Soft milk-solid dumplings soaked in rose-flavoured sugar syrup',
        recipe: [{ ingredientId: ingredients[9]._id, qty: 0.05 }]
      },
      {
        name: 'Ice Cream (3 Scoops)', category: 'Desserts', price: 89, available: true,
        image: img('Screenshot 2026-07-10 115425.png'),
        description: 'Three generous scoops of your favourite flavour',
        recipe: [{ ingredientId: ingredients[9]._id, qty: 0.1 }]
      },
      {
        name: 'Chocolate Ice Cream', category: 'Desserts', price: 129, available: true,
        image: img('Screenshot 2026-07-10 114437.png'),
        description: 'Indulgent chocolate ice cream with chocolate drizzle',
        recipe: [{ ingredientId: ingredients[9]._id, qty: 0.15 }]
      },
      {
        name: 'Brownie', category: 'Desserts', price: 129, available: true,
        image: img('Screenshot 2026-07-10 115449.png'),
        description: 'Warm fudgy brownie with chocolate drizzle & walnuts',
        recipe: [{ ingredientId: ingredients[10]._id, qty: 0.05 }]
      },
      {
        name: 'Brownie with Ice Cream', category: 'Desserts', price: 129, available: true,
        image: img('Screenshot 2026-07-10 114449.png'),
        description: 'Warm brownie topped with a scoop of vanilla ice cream',
        recipe: [{ ingredientId: ingredients[10]._id, qty: 0.05 }]
      },
      {
        name: 'Fruit Salad with Ice Cream', category: 'Desserts', price: 129, available: true,
        image: img('Screenshot 2026-07-10 114502.png'),
        description: 'Fresh seasonal fruits topped with a scoop of vanilla ice cream',
        recipe: []
      },

      // ── WAFFLES ───────────────────────────────────────────
      {
        name: 'Classic Belgian Waffle', category: 'Waffles', price: 199, available: true,
        image: '🧇',
        description: 'Light, crispy Belgian waffle served with maple syrup & butter',
        recipe: [
          { ingredientId: ingredients[4]._id, qty: 0.1 },
          { ingredientId: ingredients[10]._id, qty: 0.05 },
        ]
      },
      {
        name: 'Blueberry Waffle', category: 'Waffles', price: 269, available: true,
        image: img('ChatGPT Image Jul 10, 2026, 12_52_15 PM.png'),
        description: 'Crispy waffle loaded with fresh blueberries & whipped cream',
        recipe: [{ ingredientId: ingredients[4]._id, qty: 0.1 }]
      },
      {
        name: 'Red Velvet Waffle', category: 'Waffles', price: 299, available: true,
        image: img('ChatGPT Image Jul 10, 2026, 12_52_19 PM.png'),
        description: 'Vibrant red velvet waffle with cream cheese drizzle & strawberries',
        recipe: [{ ingredientId: ingredients[4]._id, qty: 0.1 }]
      },
      {
        name: 'Brownie Waffle', category: 'Waffles', price: 319, available: true,
        image: img('ChatGPT Image Jul 10, 2026, 12_52_07 PM.png'),
        description: 'Rich chocolate brownie waffle topped with vanilla ice cream',
        recipe: [{ ingredientId: ingredients[4]._id, qty: 0.1 }]
      },
      {
        name: 'Caramel Banana Waffle', category: 'Waffles', price: 289, available: true,
        image: img('ChatGPT Image Jul 10, 2026, 12_52_51 PM.png'),
        description: 'Golden waffle with caramel sauce, fresh banana & ice cream',
        recipe: [{ ingredientId: ingredients[4]._id, qty: 0.1 }]
      },
    ]);
    console.log('✅ Created 36 menu items across 9 categories');

    // ── Tables ────────────────────────────────────────────
    await Table.create([
      { name: 'Table 01', capacity: 2,  status: 'Available' },
      { name: 'Table 02', capacity: 4,  status: 'Available' },
      { name: 'Table 03', capacity: 6,  status: 'Available' },
      { name: 'Table 04', capacity: 8,  status: 'Available' },
      { name: 'Table 05', capacity: 4,  status: 'Available' },
      { name: 'Table 06', capacity: 2,  status: 'Available' },
      { name: 'Table 07', capacity: 6,  status: 'Available' },
      { name: 'Table 08', capacity: 10, status: 'Available' },
    ]);
    console.log('✅ Created 8 tables');

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('📝 Login Credentials:');
    console.log('   Admin    → admin    / Admin@123');
    console.log('   Manager  → manager  / Manager@123');
    console.log('   Chef     → chef1    / Chef@123');
    console.log('   Waiter   → waiter1  / Waiter@123');
    console.log('   Cashier  → cashier1 / Cashier@123\n');
    console.log('📋 Menu: 36 items | 9 categories | 8 tables | 12 ingredients\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed Error:', err.message);
    process.exit(1);
  }
};

seedDatabase();
