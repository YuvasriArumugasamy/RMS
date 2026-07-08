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
