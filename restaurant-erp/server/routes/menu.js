const express = require('express');
const MenuItem = require('../models/MenuItem');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// GET all menu items (public for QR ordering)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.available === 'true') filter.available = true;
    const items = await MenuItem.find(filter).sort({ category: 1, name: 1 });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// All write routes require auth
router.use(protect);

// POST create menu item
router.post('/', authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const item = await MenuItem.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT update menu item
router.put('/:id', authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE menu item
router.delete('/:id', authorize('Admin', 'Manager'), async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Item deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
