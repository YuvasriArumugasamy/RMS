const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  phone:   { type: String, default: '' },
  email:   { type: String, default: '' },
  contact: { type: String, default: '' },
  items:   { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);
