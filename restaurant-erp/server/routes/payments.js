const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const Table = require('../models/Table');
const Customer = require('../models/Customer');
const Settings = require('../models/Settings');
const logger = require('../utils/logger');
const { generateInvoicePdf } = require('../utils/pdfGenerator');
const { sendWhatsAppMessage } = require('../utils/whatsappSender');

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_TCyJA4KfcUm1nL',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'r5ZkH3YyfUqqD4WBuE54JGIf'
});

// @route   GET /api/payments/config
// @desc    Get public Razorpay Key ID
// @access  Public
router.get('/config', (req, res) => {
  res.json({
    success: true,
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_TCyJA4KfcUm1nL'
  });
});

// @route   POST /api/payments/create-order
// @desc    Create a Razorpay order
// @access  Public
router.post('/create-order', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.billingStatus === 'Paid') {
      return res.status(400).json({ success: false, message: 'This order is already paid' });
    }

    // Razorpay amount is in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(order.total * 100);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_order_${order._id.toString()}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      data: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        orderId: order._id,
      }
    });
  } catch (err) {
    logger.error('Razorpay create-order error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/payments/verify-payment
// @desc    Verify Razorpay payment signature
// @access  Public
router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !orderId) {
      return res.status(400).json({ success: false, message: 'Missing verification parameters' });
    }

    // Verify payment signature
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'r5ZkH3YyfUqqD4WBuE54JGIf');
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature verification failed' });
    }

    // Update order status to Paid and Completed
    const updateData = {
      billingStatus: 'Paid',
      status: 'Completed',
      paymentMethod: 'UPI', // Default to UPI for QR Online payments, or we could fetch payment method details
      paidAt: new Date(),
    };

    const order = await Order.findByIdAndUpdate(orderId, updateData, { new: true });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Associated Order not found' });
    }

    // Side Effect 1: Free table if all orders for this table are paid
    if (order.table && order.table !== 'N/A') {
      const unpaidForTable = await Order.countDocuments({
        table: order.table,
        billingStatus: 'Unpaid',
        status: { $ne: 'Completed' }
      });
      if (unpaidForTable === 0) {
        await Table.findOneAndUpdate({ name: order.table }, { status: 'Available' });
        // Emit table status freed to staff
        const io = req.app.get('io');
        if (io) io.to('staff').emit('table-update', { table: order.table, status: 'Available' });
      }
    }

    // Side Effect 2: Update customer loyalty points
    if (order.customerPhone) {
      try {
        const customer = await Customer.findOne({ phone: order.customerPhone });
        if (customer) {
          customer.totalSpend = (customer.totalSpend || 0) + (order.total || 0);
          customer.totalOrders = (customer.totalOrders || 0) + 1;
          customer.loyaltyPoints = Math.floor(customer.totalSpend / 10);
          await customer.save();
        }
      } catch (loyaltyErr) {
        logger.error('Loyalty update error in payment verification:', loyaltyErr.message);
      }
    }

    // Side Effect 3: Send invoice over WhatsApp when phone is available
    let whatsappStatus = { sent: false, error: null };
    if (order.customerPhone) {
      try {
        const settings = await Settings.findOne({ key: 'main' });
        const pdfBuffer = await generateInvoicePdf(order, settings || {});
        const message = `🍽️ ${settings?.name || 'RMS Restaurant'}\n\nHello${order.customerName ? ` ${order.customerName}` : ''} 👋\n\n✅ Payment Successful\n\nOrder ID : ${order.orderId}\nAmount : ₹${order.total}\n\n📄 Your invoice is attached.\n\nThank you for dining with us! ❤️\nHave a great day!`;
        await sendWhatsAppMessage({
          toPhone: order.customerPhone,
          message,
          pdfBuffer,
          filename: `Invoice_${order.orderId || order._id}.pdf`,
        });
        whatsappStatus.sent = true;
      } catch (waErr) {
        whatsappStatus.error = waErr.message || 'Unable to send WhatsApp message';
        logger.error('WhatsApp send error:', waErr);
      }
    }

    // Side Effect 4: Emit Socket.io updates to staff & table room
    const io = req.app.get('io');
    if (io) {
      // Notify staff desk
      io.to('staff').emit('billing-update', {
        id: order._id,
        orderId: order.orderId,
        billingStatus: 'Paid',
        paymentMethod: order.paymentMethod,
        paidAt: order.paidAt,
      });

      // Update kitchen that order is completed (paid)
      io.to('kitchen').emit('order-status-update', {
        id: order._id,
        orderId: order.orderId,
        status: order.status,
        table: order.table
      });

      // Update customer screen at table room
      if (order.table && order.table !== 'N/A') {
        io.to(`table-${order.table}`).emit('order-status-update', {
          id: order._id,
          orderId: order.orderId,
          status: order.status,
          billingStatus: order.billingStatus,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified and order finalized successfully',
      data: order,
      whatsapp: whatsappStatus,
    });
  } catch (err) {
    logger.error('Razorpay verify-payment error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
