const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// In-memory role permissions (can be moved to DB later)
// Default permissions matching the client-side structure
let rolePermissions = {
  Admin:    ['Dashboard', 'Menu Management', 'Table Management', 'Order Management',
             'Kitchen Management', 'Inventory Management', 'Billing', 'Staff Management',
             'Customer Management', 'Reports & Analytics', 'Settings', 'AI Operational Hub', 'Digital Twin'],
  Manager:  ['Dashboard', 'Menu Management', 'Table Management', 'Order Management',
             'Kitchen Management', 'Inventory Management', 'Billing', 'Customer Management',
             'Reports & Analytics', 'AI Operational Hub', 'Digital Twin'],
  Chef:     ['Kitchen Management', 'AI Operational Hub'],
  Waiter:   ['Table Management', 'Order Management'],
  Cashier:  ['Billing'],
};

// GET role permissions
router.get('/permissions', async (req, res) => {
  res.json({ success: true, data: rolePermissions });
});

// PUT update role permissions (Admin only)
router.put('/permissions', authorize('Admin'), async (req, res) => {
  try {
    const { role, permissions } = req.body;
    if (!role || !Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'role and permissions array required.' });
    }
    rolePermissions[role] = permissions;
    res.json({ success: true, data: rolePermissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
