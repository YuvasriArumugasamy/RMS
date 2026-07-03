const express = require('express');
const Order = require('../models/Order');
const Table = require('../models/Table');
const Ingredient = require('../models/Ingredient');
const MenuItem = require('../models/MenuItem');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/orders
// @desc    Get all orders (with optional status filter)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.table) filter.table = req.query.table;
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/orders
// @desc    Create a new order
// @access  Private (Waiter, Admin, Manager + QR public handled separately)
router.post('/', async (req, res) => {
  try {
    const { type, table, items, subtotal, gst, total, guestCount, requestType } = req.body;

    // Create order
    const order = await Order.create({
      type, table, items, subtotal, gst, total,
      guestCount: guestCount || 1,
      requestType: requestType || '',
      createdBy: req.user._id,
    });

    // Mark table occupied if dine-in
    if ((type === 'Dine-in' || type === 'Dine-in (QR)') && table && table !== 'N/A') {
      await Table.findOneAndUpdate(
        { name: table, status: 'Available' },
        { status: 'Occupied' }
      );
    }

    // Deduct inventory stock
    for (const cartItem of items) {
      const menuItem = await MenuItem.findById(cartItem.menuItemId).populate('recipe.ingredientId');
      if (menuItem && menuItem.recipe.length > 0) {
        for (const r of menuItem.recipe) {
          await Ingredient.findByIdAndUpdate(r.ingredientId, {
            $inc: { stock: -(r.qty * cartItem.qty) }
          });
        }
      }
    }

    // Re-run status update on affected ingredients
    const allIngredients = await Ingredient.find();
    for (const ing of allIngredients) {
      await ing.save(); // triggers pre-save hook to update status
    }

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status (Kitchen use)
// @access  Private (Chef, Admin, Manager)
router.put('/:id/status', authorize('Admin', 'Manager', 'Chef', 'Waiter'), async (req, res) => {
  try {
    const { status, chefNote } = req.body;
    const update = { status };

    if (status === 'Preparing') update.prepStartTime = new Date();
    if (chefNote) update.chefNote = chefNote;

    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/orders/:id/billing
// @desc    Mark order as paid
// @access  Private (Cashier, Admin, Manager)
router.put('/:id/billing', authorize('Admin', 'Manager', 'Cashier'), async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { billingStatus: 'Paid', status: 'Completed' },
      { new: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    // Free the table if all orders for this table are paid
    if (order.table && order.table !== 'N/A') {
      const unpaidForTable = await Order.countDocuments({
        table: order.table,
        billingStatus: 'Unpaid',
        status: { $ne: 'Completed' }
      });
      if (unpaidForTable === 0) {
        await Table.findOneAndUpdate({ name: order.table }, { status: 'Available' });
      }
    }

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
