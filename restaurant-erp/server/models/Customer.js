const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  rating:  { type: Number, min: 1, max: 5 },
  comment: { type: String, default: '' },
  date:    { type: String },
}, { _id: false });

const orderHistorySchema = new mongoose.Schema({
  orderId: { type: String },
  date:    { type: String },
  items:   { type: String },
  amount:  { type: Number },
}, { _id: false });

const customerSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  phone:         { type: String, required: true, unique: true },
  email:         { type: String, default: '' },
  totalOrders:   { type: Number, default: 0 },
  totalSpend:    { type: Number, default: 0 },
  loyaltyPoints: { type: Number, default: 0 },
  history:       [orderHistorySchema],
  feedback:      [feedbackSchema],
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
