const mongoose = require('mongoose');

// Single-document settings store — always upsert by key 'main'
const settingsSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },

  // General
  name:     { type: String, default: 'Foodies Restaurant' },
  email:    { type: String, default: 'info@foodies.com' },
  phone:    { type: String, default: '9876543210' },
  address:  { type: String, default: '123, Main Street, Chennai, Tamil Nadu - 600001' },
  currency: { type: String, default: 'INR (₹)' },
  gstRate:  { type: Number, default: 5 },
  gstin:    { type: String, default: '33AAAAA1111A1Z1' },

  // Payment gateway configuration (store provider + credentials)
  payment: {
    provider: { type: String, default: 'razorpay' },
    mode:     { type: String, default: 'test' }, // 'test' or 'live'
    // Razorpay
    razorpayKeyId:     { type: String, default: '' },
    razorpayKeySecret: { type: String, default: '' },
    // Stripe
    stripePublishableKey: { type: String, default: '' },
    stripeSecretKey:      { type: String, default: '' },
  },

  // Role permissions map — stored as JSON object
  rolePermissions: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      Admin:   ['Dashboard', 'Menu', 'Tables', 'Orders', 'Kitchen', 'Inventory', 'Billing', 'Staff', 'Customers', 'Reports', 'AI Hub', 'Settings'],
      Manager: ['Dashboard', 'Menu', 'Tables', 'Orders', 'Kitchen', 'Inventory', 'Billing', 'Customers', 'Reports', 'AI Hub'],
      Chef:    ['Kitchen'],
      Waiter:  ['Tables', 'Orders'],
      Cashier: ['Billing'],
    },
  },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
