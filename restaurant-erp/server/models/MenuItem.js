const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category:    { type: String, required: true, default: 'Main Course' },
  price:       { type: Number, required: true, min: 0 },
  available:   { type: Boolean, default: true },
  image:       { type: String, default: '🍔' },
  isCombo:     { type: Boolean, default: false },
  comboItems:[ { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' } ],
  recipe: [{
    ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' },
    qty: { type: Number, required: true }
  }],
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);
