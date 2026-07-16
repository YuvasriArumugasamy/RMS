require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const MenuItem = require('./models/MenuItem');
const Table = require('./models/Table');
const Ingredient = require('./models/Ingredient');
const Staff = require('./models/Staff');
const Customer = require('./models/Customer');

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');

    await User.deleteMany({});
    await MenuItem.deleteMany({});
    await Table.deleteMany({});
    await Ingredient.deleteMany({});
    await Staff.deleteMany({});
    await Customer.deleteMany({});
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

    // ── Menu Items ─────────────────────────────────────────
    await MenuItem.create([
      // STARTERS
      { name: 'Fish Finger',   category: 'Starters', price: 199, available: true, image: m('fish-finger.png'),   description: 'Crispy golden fish fingers with tartar sauce & lemon', recipe: [{ ingredientId: ing[2]._id, qty: 0.2 }] },
      { name: 'Paneer Tikka',  category: 'Starters', price: 199, available: true, image: m('paneer-tikka.png'),  description: 'Grilled paneer with capsicum & onion, served with mint chutney', recipe: [{ ingredientId: ing[5]._id, qty: 0.2 }] },
      { name: 'Chicken Wings', category: 'Starters', price: 199, available: true, image: m('chicken-wings.png'), description: 'Crispy spiced chicken wings with dipping sauce', recipe: [{ ingredientId: ing[0]._id, qty: 0.25 }] },

      // BIRYANI & RICE
      { name: 'Chicken Biryani', category: 'Biryani & Rice', price: 299, available: true, image: m('chicken-biryani.png'), description: 'Aromatic basmati rice layered with spiced chicken & caramelised onions', recipe: [{ ingredientId: ing[0]._id, qty: 0.25 }, { ingredientId: ing[3]._id, qty: 0.2 }] },
      { name: 'Veg Biryani',     category: 'Biryani & Rice', price: 249, available: true, image: m('veg-biryani.png'),     description: 'Fragrant basmati rice with fresh vegetables & whole spices',        recipe: [{ ingredientId: ing[3]._id, qty: 0.2  }, { ingredientId: ing[8]._id, qty: 0.1 }] },
      { name: 'Mutton Biryani',  category: 'Biryani & Rice', price: 299, available: true, image: m('mutton-biryani.png'),  description: 'Slow-cooked mutton layered with saffron-infused basmati rice',      recipe: [{ ingredientId: ing[1]._id, qty: 0.25 }, { ingredientId: ing[3]._id, qty: 0.2 }] },

      // MAIN COURSE
      { name: 'Paneer Butter Masala',  category: 'Main Course', price: 249, available: true, image: m('paneer-butter-masala.png'),  description: 'Soft paneer cubes in rich, creamy tomato-butter gravy',          recipe: [{ ingredientId: ing[5]._id, qty: 0.2  }, { ingredientId: ing[6]._id, qty: 0.1 }] },
      { name: 'Chicken Butter Masala', category: 'Main Course', price: 299, available: true, image: m('chicken-butter-masala.png'), description: 'Tender chicken in a velvety tomato-butter-cream sauce',           recipe: [{ ingredientId: ing[0]._id, qty: 0.25 }, { ingredientId: ing[6]._id, qty: 0.1 }] },
      { name: 'Dal',                   category: 'Main Course', price: 40,  available: true, image: m('dal.png'),                  description: 'Home-style dal tadka — comforting and flavourful',               recipe: [] },

      // BREAD
      { name: 'Tandoori Roti',  category: 'Bread', price: 30, available: true, image: m('tandoori-roti.png'),  description: 'Whole wheat roti baked fresh in a tandoor',                          recipe: [{ ingredientId: ing[4]._id, qty: 0.05 }] },
      { name: 'Butter Naan',    category: 'Bread', price: 70, available: true, image: m('butter-naan.png'),    description: 'Soft fluffy naan brushed with butter from the tandoor',              recipe: [{ ingredientId: ing[4]._id, qty: 0.08 }] },
      { name: 'Stuffed Paratha',category: 'Bread', price: 80, available: true, image: m('stuffed-paratha.png'),description: 'Whole wheat paratha stuffed with spiced potato filling',             recipe: [{ ingredientId: ing[4]._id, qty: 0.08 }, { ingredientId: ing[8]._id, qty: 0.1 }] },

      // PIZZA
      { name: 'Margherita Pizza',    category: 'Pizza', price: 249, available: true, image: m('margherita-pizza.png'),    description: 'Classic tomato base, mozzarella & fresh basil',                   recipe: [{ ingredientId: ing[4]._id, qty: 0.15 }, { ingredientId: ing[11]._id, qty: 0.1 }] },
      { name: 'Veggie Pizza',        category: 'Pizza', price: 299, available: true, image: m('veggie-pizza.png'),        description: 'Loaded with colourful veggies on a herbed tomato base',           recipe: [{ ingredientId: ing[4]._id, qty: 0.15 }, { ingredientId: ing[11]._id, qty: 0.1 }] },
      { name: 'Farm House Pizza',    category: 'Pizza', price: 349, available: true, image: m('farm-house-pizza.png'),    description: 'Paneer, capsicum, corn & mushroom on a cheesy base',              recipe: [{ ingredientId: ing[4]._id, qty: 0.15 }, { ingredientId: ing[5]._id,  qty: 0.1 }, { ingredientId: ing[11]._id, qty: 0.1 }] },
      { name: 'Chicken Tikka Pizza', category: 'Pizza', price: 399, available: true, image: m('chicken-tikka-pizza.png'), description: 'Tandoori chicken tikka on a spiced tomato base with cheese',       recipe: [{ ingredientId: ing[0]._id, qty: 0.15 }, { ingredientId: ing[4]._id,  qty: 0.15 }, { ingredientId: ing[11]._id, qty: 0.1 }] },

      // BURGERS
      { name: 'Veg Burger',          category: 'Burgers', price: 129, available: true, image: m('veg-burger.png'),           description: 'Crispy veggie patty with lettuce, tomato & special sauce',       recipe: [] },
      { name: 'Cheese Burger',       category: 'Burgers', price: 159, available: true, image: m('cheese-burger.png'),        description: 'Juicy patty topped with melted cheddar cheese',                  recipe: [{ ingredientId: ing[11]._id, qty: 0.05 }] },
      { name: 'Double Patty Burger', category: 'Burgers', price: 249, available: true, image: m('double-patty-burger.png'),  description: 'Two flame-grilled patties stacked high with all the fixings',    recipe: [] },
      { name: 'Combo Burger',        category: 'Burgers', price: 299, available: true, image: m('combo-burger.png'),         description: 'Burger + Golden Fries + Soft Drink — the full meal deal',        isCombo: true, recipe: [] },

      // SNACKS
      { name: 'Golden Fries with Ketchup', category: 'Snacks', price: 90, available: true, image: m('golden-fries.png'), description: 'Crispy golden fries served with classic ketchup dip', recipe: [{ ingredientId: ing[8]._id, qty: 0.15 }] },

      // BEVERAGES
      { name: 'Fresh Orange Soda', category: 'Beverages', price: 69,  available: true, image: m('fresh-orange-soda.png'), description: 'Freshly squeezed orange with chilled soda',                      recipe: [] },
      { name: 'Fresh Lime Soda',   category: 'Beverages', price: 69,  available: true, image: m('fresh-lime-soda.png'),   description: 'Tangy fresh lime with sweet or salted soda',                    recipe: [] },
      { name: 'Mint Mojito',       category: 'Beverages', price: 99,  available: true, image: m('mint-mojito.png'),       description: 'Refreshing mint, lime & crushed ice mocktail',                  recipe: [] },
      { name: 'Cold Coffee',       category: 'Beverages', price: 129, available: true, image: m('cold-coffee.png'),       description: 'Rich blended cold coffee topped with whipped cream',            recipe: [{ ingredientId: ing[9]._id, qty: 0.2  }] },
      { name: 'Milkshake',         category: 'Beverages', price: 129, available: true, image: m('milkshake.png'),         description: 'Thick & creamy milkshake — chocolate, vanilla or strawberry',   recipe: [{ ingredientId: ing[9]._id, qty: 0.25 }] },
      { name: 'Soft Drinks',       category: 'Beverages', price: 49,  available: true, image: m('soft-drinks.png'),       description: 'Chilled Pepsi, Coke, Sprite or 7Up',                           recipe: [] },

      // DESSERTS
      { name: 'Gulab Jamun (2 Pcs)',      category: 'Desserts', price: 79,  available: true, image: m('gulab-jamun.png'),          description: 'Soft dumplings soaked in rose-flavoured sugar syrup',           recipe: [{ ingredientId: ing[9]._id,  qty: 0.05 }] },
      { name: 'Ice Cream (3 Scoops)',     category: 'Desserts', price: 89,  available: true, image: m('ice-cream-3-scoops.png'),   description: 'Three generous scoops of your favourite flavour',               recipe: [{ ingredientId: ing[9]._id,  qty: 0.1  }] },
      { name: 'Chocolate Ice Cream',      category: 'Desserts', price: 129, available: true, image: m('chocolate-ice-cream.png'),  description: 'Indulgent chocolate ice cream with chocolate drizzle',           recipe: [{ ingredientId: ing[9]._id,  qty: 0.15 }] },
      { name: 'Brownie',                  category: 'Desserts', price: 129, available: true, image: m('brownie.png'),              description: 'Warm fudgy brownie with chocolate drizzle & walnuts',           recipe: [{ ingredientId: ing[10]._id, qty: 0.05 }] },
      { name: 'Brownie with Ice Cream',   category: 'Desserts', price: 129, available: true, image: m('brownie-ice-cream.png'),    description: 'Warm brownie topped with a scoop of vanilla ice cream',         recipe: [{ ingredientId: ing[10]._id, qty: 0.05 }] },
      { name: 'Fruit Salad with Ice Cream',category:'Desserts', price: 129, available: true, image: m('fruit-salad-ice-cream.png'),description: 'Fresh seasonal fruits topped with a scoop of vanilla ice cream', recipe: [] },

      // WAFFLES
      { name: 'Classic Belgian Waffle', category: 'Waffles', price: 199, available: true, image: m('classic-belgian-waffle.png'),description: 'Light crispy Belgian waffle with maple syrup & butter',          recipe: [{ ingredientId: ing[4]._id, qty: 0.1 }, { ingredientId: ing[10]._id, qty: 0.05 }] },
      { name: 'Strawberry Waffle',      category: 'Waffles', price: 249, available: true, image: m('strawberry-waffle.png'),    description: 'Golden waffle topped with fresh strawberries & cream',           recipe: [{ ingredientId: ing[4]._id, qty: 0.1 }] },
      { name: 'Blueberry Waffle',       category: 'Waffles', price: 269, available: true, image: m('blueberry-waffle.png'),     description: 'Crispy waffle loaded with fresh blueberries & whipped cream',    recipe: [{ ingredientId: ing[4]._id, qty: 0.1 }] },
      { name: 'Red Velvet Waffle',      category: 'Waffles', price: 299, available: true, image: m('red-velvet-waffle.png'),    description: 'Red velvet waffle with cream cheese drizzle & strawberries',     recipe: [{ ingredientId: ing[4]._id, qty: 0.1 }] },
      { name: 'Brownie Waffle',         category: 'Waffles', price: 319, available: true, image: m('brownie-waffle.png'),       description: 'Rich chocolate brownie waffle topped with vanilla ice cream',    recipe: [{ ingredientId: ing[4]._id, qty: 0.1 }] },
      { name: 'Caramel Banana Waffle',  category: 'Waffles', price: 289, available: true, image: m('caramel-banana-waffle.png'),description: 'Golden waffle with caramel sauce, fresh banana & ice cream',     recipe: [{ ingredientId: ing[4]._id, qty: 0.1 }] },
    ]);
    console.log('✅ Created 37 menu items across 9 categories');

    // ── Customers ──────────────────────────────────────────
    await Customer.create([
      { name: 'Arun Kumar',    phone: '9876543210', email: 'arun@gmail.com',   totalOrders: 12, totalSpend: 3840, loyaltyPoints: 384, feedback: [{ rating: 5, comment: 'Amazing food and service!', date: '10/07/2026' }] },
      { name: 'Priya Sharma',  phone: '9876543211', email: 'priya@gmail.com',  totalOrders: 8,  totalSpend: 2200, loyaltyPoints: 220, feedback: [{ rating: 4, comment: 'Great biryani, will come again.', date: '09/07/2026' }] },
      { name: 'Ravi Kannan',   phone: '9876543212', email: '',                 totalOrders: 5,  totalSpend: 1450, loyaltyPoints: 145, feedback: [] },
      { name: 'Meena Devi',    phone: '9876543213', email: 'meena@gmail.com',  totalOrders: 20, totalSpend: 6200, loyaltyPoints: 620, feedback: [{ rating: 5, comment: 'Best waffles in town!', date: '08/07/2026' }] },
      { name: 'Suresh Babu',   phone: '9876543214', email: '',                 totalOrders: 3,  totalSpend: 750,  loyaltyPoints: 75,  feedback: [] },
      { name: 'Kavitha Raj',   phone: '9876543215', email: 'kavitha@gmail.com',totalOrders: 15, totalSpend: 4800, loyaltyPoints: 480, feedback: [{ rating: 4, comment: 'Love the pizza options!', date: '07/07/2026' }] },
      { name: 'Deepak Singh',  phone: '9876543216', email: '',                 totalOrders: 7,  totalSpend: 2100, loyaltyPoints: 210, feedback: [] },
      { name: 'Anitha Nair',   phone: '9876543217', email: 'anitha@gmail.com', totalOrders: 25, totalSpend: 7500, loyaltyPoints: 750, feedback: [{ rating: 5, comment: 'Excellent! Always consistent quality.', date: '06/07/2026' }] },
    ]);
    console.log('✅ Created 8 sample customers');

    // ── Tables ─────────────────────────────────────────────
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

    console.log('\n🎉 Database seeded successfully!');
    console.log('📝 Login Credentials:');
    console.log('   admin / Admin@123');
    console.log('   manager / Manager@123');
    console.log('   chef1 / Chef@123');
    console.log('   waiter1 / Waiter@123');
    console.log('   cashier1 / Cashier@123\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed Error:', err.message);
    process.exit(1);
  }
};

seedDatabase();
