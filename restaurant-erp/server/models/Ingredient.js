const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  category:  { type: String, default: 'General' },
  stock:     { type: Number, required: true, default: 0 },
  unit:      { type: String, default: 'kg' },
  threshold: { type: Number, default: 5 },
  status:    { type: String, enum: ['In Stock', 'Low Stock', 'Out of Stock'], default: 'In Stock' },
}, { timestamps: true });

// Auto-update status based on stock
ingredientSchema.pre('save', function (next) {
  if (this.stock <= 0) this.status = 'Out of Stock';
  else if (this.stock <= this.threshold) this.status = 'Low Stock';
  else this.status = 'In Stock';
  next();
});

module.exports = mongoose.model('Ingredient', ingredientSchema);
