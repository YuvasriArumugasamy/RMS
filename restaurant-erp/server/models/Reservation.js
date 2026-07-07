const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  reservationId: { type: String, unique: true },
  table:         { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  tableName:     { type: String, required: true },
  customerName:  { type: String, required: true },
  customerPhone: { type: String, required: true },
  partySize:     { type: Number, required: true, min: 1 },
  date:          { type: String, required: true }, // YYYY-MM-DD
  time:          { type: String, required: true }, // HH:MM
  status:        { type: String, enum: ['Pending', 'Confirmed', 'Seated', 'Cancelled', 'No-show'], default: 'Pending' },
  specialRequest:{ type: String, default: '' },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto-generate reservationId before saving
reservationSchema.pre('save', function (next) {
  if (!this.reservationId) {
    this.reservationId = `RES-${Date.now().toString().slice(-6)}`;
  }
  next();
});

module.exports = mongoose.model('Reservation', reservationSchema);
