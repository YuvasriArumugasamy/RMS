const express = require('express');
const Order = require('../models/Order');
const Table = require('../models/Table');
const Ingredient = require('../models/Ingredient');
const MenuItem = require('../models/MenuItem');
const Customer = require('../models/Customer');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// @route   POST /api/orders/qr
// @desc    Place a QR (customer-facing) order — NO auth required
// @access  Public (customer scans QR code, no login)
// ─────────────────────────────────────────────────────────────
router.post('/qr', async (req, res) => {
  try {
    const { table, items, subtotal, gst, total, guestCount, specialInstructions, customerPhone, customerName } = req.body;

    if (!table || !items || !items.length) {
      return res.status(400).json({ success: false, message: 'Table and items are required.' });
    }

    // Map cart items — attach specialNote from the instructions map
    const orderItems = items.map(i => ({
      ...i,
      menuItemId: i.menuItemId || i._id || i.id,   // tolerate both id shapes
      specialNote: (specialInstructions && specialInstructions[i.id]) || i.specialNote || '',
    }));

    const order = await Order.create({
      type: 'Dine-in (QR)',
      table,
      items: orderItems,
      subtotal: subtotal || 0,
      gst: gst || 0,
      total: total || 0,
      guestCount: guestCount || 1,
      requestType: '',
      customerPhone: customerPhone || '',
      customerName: customerName || '',
      // No createdBy — QR orders are anonymous
    });

    // Mark table occupied
    await Table.findOneAndUpdate(
      { name: table, status: 'Available' },
      { status: 'Occupied' }
    );

    // Deduct inventory stock based on recipe
    for (const cartItem of orderItems) {
      if (!cartItem.menuItemId) continue;
      const menuItem = await MenuItem.findById(cartItem.menuItemId).populate('recipe.ingredientId');
      if (menuItem && menuItem.recipe.length > 0) {
        for (const r of menuItem.recipe) {
          await Ingredient.findByIdAndUpdate(r.ingredientId, {
            $inc: { stock: -(r.qty * (cartItem.qty || 1)) }
          });
        }
      }
    }

    // 🔌 Emit to kitchen & staff in real-time
    const io = req.app.get('io');
    if (io) {
      io.to('kitchen').emit('new-order', order);
      io.to('staff').emit('table-update', { table, status: 'Occupied' });
    }

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    logger.error('QR Order error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/orders/qr-status?table=Table1
// @desc    Get active orders for a table (customer polling) — NO auth required
// @access  Public
router.get('/qr-status', async (req, res) => {
  try {
    const { table } = req.query;
    if (!table) return res.status(400).json({ success: false, message: 'Table name is required.' });

    const orders = await Order.find({
      table,
      type: { $in: ['Dine-in (QR)', 'Takeaway (QR)'] },
      status: { $nin: ['Completed', 'Cancelled'] },
    })
    .select('orderId status items total createdAt table type') // only expose what customer needs
    .sort({ createdAt: -1 })
    .limit(10);

    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// All routes below require authentication
router.use(protect);

// @route   GET /api/orders
// @desc    Get all orders (with optional status filter)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const filter = {};
    // Support comma-separated status values: ?status=Pending,Preparing,Ready
    if (req.query.status) {
      const statuses = req.query.status.split(',').map(s => s.trim()).filter(Boolean);
      filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }
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
    const { type, table, items, subtotal, gst, total, guestCount, requestType, waiterName } = req.body;

    // Create order
    const { customerPhone, customerName } = req.body;
    const order = await Order.create({
      type, table, items, subtotal, gst, total,
      guestCount: guestCount || 1,
      requestType: requestType || '',
      waiterName: waiterName || '',
      customerPhone: customerPhone || '',
      customerName: customerName || '',
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

    // 🔌 Emit to kitchen & staff in real-time
    const io = req.app.get('io');
    if (io) {
      io.to('kitchen').emit('new-order', order);
      io.to('staff').emit('table-update', { table, status: 'Occupied' });
    }

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    logger.error('Create order error:', err);
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

    // 🔌 Emit status update to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.to('kitchen').emit('order-status-update', { id: order._id, orderId: order.orderId, status: order.status, table: order.table });
      io.to('staff').emit('order-status-update', { id: order._id, orderId: order.orderId, status: order.status, table: order.table });
      // Notify customer room too (they joined room `table-${tableName}`)
      if (order.table && order.table !== 'N/A') {
        io.to(`table-${order.table}`).emit('order-status-update', { id: order._id, orderId: order.orderId, status: order.status });
      }
    }

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/orders/:id/billing
// @desc    Mark order as paid with payment method
// @access  Private (Cashier, Admin, Manager)
router.put('/:id/billing', authorize('Admin', 'Manager', 'Cashier'), async (req, res) => {
  try {
    const { paymentMethod, discount, finalTotal } = req.body;

    const updateData = {
      billingStatus: 'Paid',
      status: 'Completed',
      paymentMethod: paymentMethod || 'Cash',
      paidAt: new Date(),
    };

    // Apply discount if provided
    if (discount > 0) {
      updateData.discount = discount;
      updateData.total = finalTotal || undefined;
    }

    const order = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true });
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
        // 🔌 Emit table freed
        const io = req.app.get('io');
        if (io) io.to('staff').emit('table-update', { table: order.table, status: 'Available' });
      }
    }

    // 🏆 Auto-update customer loyalty points if customerPhone is set
    if (order.customerPhone) {
      try {
        const customer = await Customer.findOne({ phone: order.customerPhone });
        if (customer) {
          customer.totalSpend   = (customer.totalSpend   || 0) + (order.total || 0);
          customer.totalOrders  = (customer.totalOrders  || 0) + 1;
          customer.loyaltyPoints = Math.floor(customer.totalSpend / 10); // ₹10 = 1 point
          await customer.save();
        }
      } catch (loyaltyErr) {
        logger.error('Loyalty update error (non-critical):', loyaltyErr.message);
      }
    }

    // 🔌 Emit billing update
    const io = req.app.get('io');
    if (io) {
      io.to('staff').emit('billing-update', {
        id: order._id,
        orderId: order.orderId,
        billingStatus: 'Paid',
        paymentMethod: order.paymentMethod,
        paidAt: order.paidAt,
      });

      if (order.table && order.table !== 'N/A') {
        io.to(`table-${order.table}`).emit('order-status-update', {
          id: order._id,
          orderId: order.orderId,
          status: order.status,
          billingStatus: order.billingStatus,
        });
      }
    }

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PATCH /api/orders/:id/cancel
// @desc    Cancel a Pending order (only Pending orders can be cancelled)
// @access  Private (Waiter, Admin, Manager)
router.patch('/:id/cancel', authorize('Admin', 'Manager', 'Waiter'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (order.status === 'Completed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a completed order.' });
    }
    if (order.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Order is already cancelled.' });
    }

    order.status = 'Cancelled';
    await order.save();

    // Re-stock inventory — reverse the deduction
    for (const cartItem of order.items) {
      if (!cartItem.menuItemId) continue;
      const menuItem = await MenuItem.findById(cartItem.menuItemId).populate('recipe.ingredientId');
      if (menuItem && menuItem.recipe.length > 0) {
        for (const r of menuItem.recipe) {
          await Ingredient.findByIdAndUpdate(r.ingredientId, {
            $inc: { stock: r.qty * (cartItem.qty || 1) }
          });
        }
      }
    }

    // 🔌 Notify kitchen and staff
    const io = req.app.get('io');
    if (io) {
      io.to('kitchen').emit('order-status-update', { id: order._id, orderId: order.orderId, status: 'Cancelled', table: order.table });
      io.to('staff').emit('order-status-update', { id: order._id, orderId: order.orderId, status: 'Cancelled', table: order.table });
    }

    res.json({ success: true, data: order, message: 'Order cancelled and inventory restored.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/orders/:id/items
// @desc    Edit items of a Pending order (add/remove/update qty)
// @access  Private (Waiter, Admin, Manager)
router.put('/:id/items', authorize('Admin', 'Manager', 'Waiter'), async (req, res) => {
  try {
    const { items, subtotal, gst, total } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'Items cannot be empty. Cancel the order instead.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (order.status !== 'Pending') {
      return res.status(400).json({ success: false, message: `Cannot edit an order in "${order.status}" status. Only Pending orders can be edited.` });
    }

    // Reverse old inventory deductions
    for (const cartItem of order.items) {
      if (!cartItem.menuItemId) continue;
      const menuItem = await MenuItem.findById(cartItem.menuItemId).populate('recipe.ingredientId');
      if (menuItem && menuItem.recipe.length > 0) {
        for (const r of menuItem.recipe) {
          await Ingredient.findByIdAndUpdate(r.ingredientId, {
            $inc: { stock: r.qty * (cartItem.qty || 1) }
          });
        }
      }
    }

    // Apply new inventory deductions
    for (const cartItem of items) {
      if (!cartItem.menuItemId) continue;
      const menuItem = await MenuItem.findById(cartItem.menuItemId).populate('recipe.ingredientId');
      if (menuItem && menuItem.recipe.length > 0) {
        for (const r of menuItem.recipe) {
          await Ingredient.findByIdAndUpdate(r.ingredientId, {
            $inc: { stock: -(r.qty * (cartItem.qty || 1)) }
          });
        }
      }
    }

    // Update order
    order.items    = items;
    order.subtotal = subtotal || 0;
    order.gst      = gst || 0;
    order.total    = total || 0;
    await order.save();

    // 🔌 Notify kitchen of updated order
    const io = req.app.get('io');
    if (io) {
      io.to('kitchen').emit('order-updated', { id: order._id, orderId: order.orderId, items: order.items, table: order.table });
    }

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
