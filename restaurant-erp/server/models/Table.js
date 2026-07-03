const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  name:     { type: String, required: true, unique: true },
  capacity: { type: Number, required: true, default: 4 },
  status:   { type: String, enum: ['Available', 'Occupied', 'Reserved', 'Maintenance'], default: 'Available' },
  reservation: {
    name: { type: String },
    time: { type: String },
  },
}, { timestamps: true });

module.exports = mongoose.model('Table', tableSchema);
