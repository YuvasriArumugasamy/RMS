const express = require('express');
const Coupon  = require('../models/Coupon');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET all coupons
router.get('/', authorize('Admin', 'Manager', 'Cashier'), async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, data: coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST validate & apply coupon (returns discount amount)
router.post('/apply', async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    if (!code || !orderTotal) {
      return res.status(400).json({ success: false, message: 'code and orderTotal are required.' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });

    if (!coupon)          return res.status(404).json({ success: false, message: 'Coupon not found.' });
    if (!coupon.active)   return res.status(400).json({ success: false, message: 'Coupon is inactive.' });
    if (coupon.isExpired) return res.status(400).json({ success: false, message: 'Coupon has expired.' });
    if (coupon.isExhausted) return res.status(400).json({ success: false, message: 'Coupon usage limit reached.' });
    if (orderTotal < coupon.minOrder) {
      return res.status(400).json({
        success: false,
        message: `Minimum order ₹${coupon.minOrder} required for this coupon.`,
      });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === 'flat') {
      discount = Math.min(coupon.value, orderTotal);
    } else {
      // percent
      discount = Math.round((orderTotal * coupon.value) / 100);
      if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
    }

    res.json({
      success: true,
      data: {
        code:        coupon.code,
        description: coupon.description,
        type:        coupon.type,
        value:       coupon.value,
        discount,
        finalTotal:  orderTotal - discount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST redeem coupon (increment usedCount after payment)
router.post('/redeem', async (req, res) => {
  try {
    const { code } = req.body;
    const coupon = await Coupon.findOneAndUpdate(
      { code: code.toUpperCase().trim() },
      { $inc: { usedCount: 1 } },
      { new: true }
    );
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found.' });

    // Auto-deactivate if exhausted
    if (coupon.usedCount >= coupon.usageLimit) {
      coupon.active = false;
      await coupon.save();
    }
    res.json({ success: true, data: coupon });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create coupon
router.post('/', authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const coupon = await Coupon.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: coupon });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT update coupon
router.put('/:id', authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found.' });
    res.json({ success: true, data: coupon });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE coupon
router.delete('/:id', authorize('Admin', 'Manager'), async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Coupon deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
