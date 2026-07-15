const express = require('express');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/users - list users (Admin, Manager)
router.get('/', authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const users = await User.find().sort({ username: 1 }).select('-password -resetPasswordToken -resetPasswordExpire');
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users - create user (Admin only)
router.post('/', authorize('Admin'), async (req, res) => {
  try {
    const { username, password, role, phone, email } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'username and password required' });
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ success: false, message: 'username already exists' });
    const user = await User.create({ username, password, role: role || 'Waiter', phone, email });
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/users/:id - update user (Admin only)
router.put('/:id', authorize('Admin'), async (req, res) => {
  try {
    const { role, isActive, phone, email, password } = req.body;
    const user = await User.findById(req.params.id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (phone !== undefined) user.phone = phone;
    if (email !== undefined) user.email = email;
    if (password) user.password = password; // pre-save hook hashes
    await user.save();
    const out = user.toObject(); delete out.password; res.json({ success: true, data: out });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/users/:id - delete user (Admin only)
router.delete('/:id', authorize('Admin'), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
