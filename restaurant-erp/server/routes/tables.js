const express = require('express');
const Table = require('../models/Table');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// GET all tables (public for QR page to find table name)
router.get('/', async (req, res) => {
  try {
    const tables = await Table.find().sort({ name: 1 });
    res.json({ success: true, data: tables });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single table by ID
router.get('/:id', async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ success: false, message: 'Table not found.' });
    res.json({ success: true, data: table });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// All write routes require auth
router.use(protect);

// POST create table
router.post('/', authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const table = await Table.create(req.body);
    res.status(201).json({ success: true, data: table });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT update table status/reservation
router.put('/:id', authorize('Admin', 'Manager', 'Waiter'), async (req, res) => {
  try {
    const table = await Table.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!table) return res.status(404).json({ success: false, message: 'Table not found.' });
    res.json({ success: true, data: table });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE table
router.delete('/:id', authorize('Admin'), async (req, res) => {
  try {
    await Table.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Table deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
