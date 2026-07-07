const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItemId:  { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  name:        { type: String, required: true },
  price:       { type: Number, required: true },
  qty:         { type: Number, required: true, min: 1 },
  image:       { type: String, default: '' },
  specialNote: { type: String, default: '' },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId:       { type: String, unique: true },
  type:          { type: String, enum: ['Dine-in', 'Takeaway', 'Dine-in (QR)', 'Request', 'Merged Bill'], default: 'Dine-in' },
  table:         { type: String, default: 'N/A' },
  tableRef:      { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
  items:         [orderItemSchema],
  subtotal:      { type: Number, required: true, default: 0 },
  gst:           { type: Number, required: true, default: 0 },
  total:         { type: Number, required: true, default: 0 },
  status:        { type: String, enum: ['Pending', 'Preparing', 'Ready', 'Served', 'Completed'], default: 'Pending' },
  billingStatus: { type: String, enum: ['Unpaid', 'Paid'], default: 'Unpaid' },
  paymentMethod: { type: String, enum: ['Cash', 'Card', 'UPI', 'Wallet', 'Other'], default: 'Cash' },
  paidAt:        { type: Date },
  customerPhone: { type: String, default: '' },
  waiterName:    { type: String, default: '' },
  guestCount:    { type: Number, default: 1 },
  requestType:   { type: String, default: '' },
  chefNote:      { type: String, default: '' },
  prepStartTime: { type: Date },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date:          { type: String },
}, { timestamps: true });

// Auto-generate orderId before saving
orderSchema.pre('save', function () {
  if (!this.orderId) {
    const prefix = this.type === 'Dine-in (QR)' ? 'ORD-QR' : 'ORD';
    this.orderId = `${prefix}-${Date.now().toString().slice(-6)}`;
  }
  if (!this.date) {
    this.date = new Date().toLocaleDateString();
  }
});

module.exports = mongoose.model('Order', orderSchema);
