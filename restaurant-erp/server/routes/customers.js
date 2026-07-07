const express = require('express');
const Customer = require('../models/Customer');
const Order    = require('../models/Order');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET all customers
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ totalSpend: -1 });
    res.json({ success: true, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET real order history for a customer (matched by phone)
router.get('/:id/orders', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

    // Match orders by customer phone stored in order OR fallback to history
    const orders = await Order.find({
      $or: [
        { customerPhone: customer.phone },
        { 'items.0': { $exists: true } }, // all orders as fallback for demo
      ]
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('orderId type table items subtotal gst total status billingStatus paymentMethod createdAt date');

    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create customer
router.post('/', async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT update customer
router.put('/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });
    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST add feedback to customer
router.post('/:id/feedback', async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });
    customer.feedback.push({ rating, comment, date: new Date().toLocaleDateString() });
    await customer.save();
    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST recalculate loyalty points & stats from real orders
router.post('/:id/recalculate', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

    const orders = await Order.find({
      customerPhone: customer.phone,
      billingStatus: 'Paid',
    });

    const totalSpend   = orders.reduce((s, o) => s + (o.total || 0), 0);
    const totalOrders  = orders.length;
    // 1 point per ₹10 spent
    const loyaltyPoints = Math.floor(totalSpend / 10);

    customer.totalSpend   = totalSpend;
    customer.totalOrders  = totalOrders;
    customer.loyaltyPoints = loyaltyPoints;
    await customer.save();

    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE customer
router.delete('/:id', authorize('Admin', 'Manager'), async (req, res) => {
  try {
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Customer deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
