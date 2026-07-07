const express = require('express');
const Ingredient = require('../models/Ingredient');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET all ingredients
router.get('/', async (req, res) => {
  try {
    const ingredients = await Ingredient.find().sort({ name: 1 });
    res.json({ success: true, data: ingredients });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST add ingredient
router.post('/', authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const ingredient = await Ingredient.create(req.body);
    res.status(201).json({ success: true, data: ingredient });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT update stock
router.put('/:id', authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) return res.status(404).json({ success: false, message: 'Ingredient not found.' });
    Object.assign(ingredient, req.body);
    await ingredient.save(); // triggers pre-save for status update

    // 🔌 Emit low-stock alert if status changed to Low Stock / Out of Stock
    if (ingredient.status === 'Low Stock' || ingredient.status === 'Out of Stock') {
      const io = req.app.get('io');
      if (io) {
        io.to('staff').emit('low-stock-alert', {
          id:     ingredient._id,
          name:   ingredient.name,
          stock:  ingredient.stock,
          unit:   ingredient.unit,
          status: ingredient.status,
        });
      }
    }

    res.json({ success: true, data: ingredient });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE ingredient
router.delete('/:id', authorize('Admin', 'Manager'), async (req, res) => {
  try {
    await Ingredient.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Ingredient deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
