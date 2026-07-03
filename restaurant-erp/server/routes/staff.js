const express = require('express');
const Staff = require('../models/Staff');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET all staff
router.get('/', authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const staff = await Staff.find().sort({ name: 1 });
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST add staff + create user account
router.post('/', authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const { name, role, phone, password } = req.body;

    // Create login user account
    const username = name.toLowerCase().replace(/\s+/g, '.') + '.' + Date.now().toString().slice(-4);
    const user = await User.create({
      username,
      password: password || 'Staff@123', // default password
      role,
      phone,
    });

    const staff = await Staff.create({ name, role, phone, userId: user._id });

    res.status(201).json({
      success: true,
      data: staff,
      credentials: { username, defaultPassword: password ? undefined : 'Staff@123' },
      message: password ? 'Staff created.' : `Staff created. Default login: ${username} / Staff@123`
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT update staff
router.put('/:id', authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found.' });
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT mark attendance
router.put('/:id/attendance', authorize('Admin', 'Manager', 'Waiter'), async (req, res) => {
  try {
    const { date, status } = req.body;
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found.' });

    const existingIdx = staff.attendance.findIndex(a => a.date === date);
    if (existingIdx > -1) {
      staff.attendance[existingIdx].status = status;
    } else {
      staff.attendance.push({ date, status });
    }

    // Update active status if today
    const today = new Date().toISOString().split('T')[0];
    if (date === today) {
      staff.status = status === 'Present' ? 'Active' : 'Inactive';
    }

    await staff.save();
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE staff
router.delete('/:id', authorize('Admin'), async (req, res) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);
    if (staff?.userId) await User.findByIdAndDelete(staff.userId);
    res.json({ success: true, message: 'Staff deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
