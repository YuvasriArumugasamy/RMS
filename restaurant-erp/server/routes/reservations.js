const express = require('express');
const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// All reservation routes require authentication
router.use(protect);

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// @route   GET /api/reservations
// @desc    Get all reservations (with optional date filter)
// @access  Private
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.date) filter.date = req.query.date;
    if (req.query.status) filter.status = req.query.status;
    
    const reservations = await Reservation.find(filter)
      .populate('table', 'name capacity')
      .sort({ date: 1, time: 1 })
      .limit(200);
    
    res.json({ success: true, data: reservations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// @route   POST /api/reservations
// @desc    Create a new reservation
// @access  Private (Waiter, Manager, Admin)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/', authorize('Admin', 'Manager', 'Waiter'), async (req, res) => {
  try {
    const { table, tableName, customerName, customerPhone, partySize, date, time, specialRequest } = req.body;

    // Check if table is already reserved at that date/time
    const existingReservation = await Reservation.findOne({
      table,
      date,
      time,
      status: { $in: ['Pending', 'Confirmed'] },
    });

    if (existingReservation) {
      return res.status(400).json({
        success: false,
        message: `Table ${tableName} is already reserved at ${time} on ${date}`,
      });
    }

    const reservation = await Reservation.create({
      table,
      tableName,
      customerName,
      customerPhone,
      partySize,
      date,
      time,
      specialRequest: specialRequest || '',
      createdBy: req.user._id,
    });

    // Update table status to 'Reserved'
    await Table.findByIdAndUpdate(table, {
      status: 'Reserved',
      reservation: { name: customerName, time },
    });

    // ðŸ”Œ Emit to all clients
    const io = req.app.get('io');
    if (io) {
      io.to('staff').emit('new-reservation', reservation);
      io.to('staff').emit('table-update', { tableId: table, name: tableName, status: 'Reserved' });
    }

    res.status(201).json({ success: true, data: reservation });
  } catch (err) {
    logger.error('Reservation creation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// @route   PUT /api/reservations/:id
// @desc    Update reservation status (Confirm / Seat / Cancel)
// @access  Private (Manager, Admin, Waiter)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.put('/:id', authorize('Admin', 'Manager', 'Waiter'), async (req, res) => {
  try {
    const { status } = req.body;

    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    // If seated â†’ mark table as Occupied
    if (status === 'Seated') {
      await Table.findByIdAndUpdate(reservation.table, {
        status: 'Occupied',
        reservation: null,
      });
    }

    // If cancelled â†’ mark table as Available
    if (status === 'Cancelled' || status === 'No-show') {
      await Table.findByIdAndUpdate(reservation.table, {
        status: 'Available',
        reservation: null,
      });
    }

    // ðŸ”Œ Emit update
    const io = req.app.get('io');
    if (io) {
      io.to('staff').emit('reservation-update', { id: reservation._id, reservationId: reservation.reservationId, status });
      if (status === 'Seated' || status === 'Cancelled' || status === 'No-show') {
        const newTableStatus = status === 'Seated' ? 'Occupied' : 'Available';
        io.to('staff').emit('table-update', { tableId: reservation.table, name: reservation.tableName, status: newTableStatus });
      }
    }

    res.json({ success: true, data: reservation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// @route   DELETE /api/reservations/:id
// @desc    Delete a reservation
// @access  Private (Manager, Admin)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.delete('/:id', authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    // Free the table
    await Table.findByIdAndUpdate(reservation.table, {
      status: 'Available',
      reservation: null,
    });

    await reservation.deleteOne();

    // ðŸ”Œ Emit deletion
    const io = req.app.get('io');
    if (io) {
      io.to('staff').emit('reservation-deleted', { id: req.params.id });
      io.to('staff').emit('table-update', { tableId: reservation.table, name: reservation.tableName, status: 'Available' });
    }

    res.json({ success: true, message: 'Reservation deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

