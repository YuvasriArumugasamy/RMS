const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const Settings = require('../models/Settings');

const router = express.Router();
router.use(protect);

// Helper — get or create the single settings doc
const getSettings = async () => {
  let doc = await Settings.findOne({ key: 'main' });
  if (!doc) doc = await Settings.create({ key: 'main' });
  return doc;
};

// ── GET general settings ─────────────────────────────────────
// @access Admin, Manager
router.get('/', authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const doc = await getSettings();
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT update general settings ──────────────────────────────
// @access Admin only
router.put('/', authorize('Admin'), async (req, res) => {
  try {
    const { name, email, phone, address, currency } = req.body;
    const doc = await Settings.findOneAndUpdate(
      { key: 'main' },
      { name, email, phone, address, currency },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET role permissions ─────────────────────────────────────
router.get('/permissions', async (req, res) => {
  try {
    const doc = await getSettings();
    res.json({ success: true, data: doc.rolePermissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT update role permissions (Admin only) ─────────────────
router.put('/permissions', authorize('Admin'), async (req, res) => {
  try {
    const { role, permissions } = req.body;
    if (!role || !Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'role and permissions array required.' });
    }
    const doc = await getSettings();
    doc.rolePermissions = { ...doc.rolePermissions, [role]: permissions };
    doc.markModified('rolePermissions'); // needed for Mixed type
    await doc.save();
    res.json({ success: true, data: doc.rolePermissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
