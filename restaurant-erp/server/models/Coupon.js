const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code:        { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, default: '' },
  type:        { type: String, enum: ['flat', 'percent'], required: true },
  value:       { type: Number, required: true, min: 0 },   // ₹ amount or % off
  minOrder:    { type: Number, default: 0 },               // minimum order value to apply
  maxDiscount: { type: Number, default: 0 },               // max discount cap (for percent type)
  expiryDate:  { type: Date, required: true },
  usageLimit:  { type: Number, default: 1 },               // total uses allowed
  usedCount:   { type: Number, default: 0 },
  active:      { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Virtual: isExpired
couponSchema.virtual('isExpired').get(function () {
  return new Date() > this.expiryDate;
});

// Virtual: isExhausted
couponSchema.virtual('isExhausted').get(function () {
  return this.usedCount >= this.usageLimit;
});

couponSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Coupon', couponSchema);
