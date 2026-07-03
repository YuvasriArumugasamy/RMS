const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  date:   { type: String, required: true },
  status: { type: String, enum: ['Present', 'Absent', 'Leave'], required: true },
}, { _id: false });

const staffSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  role:       { type: String, required: true, default: 'Waiter' },
  phone:      { type: String, default: '' },
  status:     { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  shift:      { type: String, default: 'None' },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  attendance: [attendanceSchema],
}, { timestamps: true });

module.exports = mongoose.model('Staff', staffSchema);
