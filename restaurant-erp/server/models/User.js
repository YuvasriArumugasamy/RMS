const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username:             { type: String, required: true, unique: true, trim: true },
  password:             { type: String, required: true, minlength: 6 },
  role: {
    type: String,
    enum: ['Admin', 'Manager', 'Chef', 'Waiter', 'Cashier'],
    default: 'Waiter'
  },
  email:                { type: String, default: '', trim: true, lowercase: true },
  phone:                { type: String, default: '' },
  isActive:             { type: Boolean, default: true },
  resetPasswordToken:   { type: String, select: false },
  resetPasswordExpire:  { type: Date,   select: false },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Generate and hash password reset token
userSchema.methods.getResetPasswordToken = function () {
  const crypto = require('crypto');
  // Generate a random 32-byte token
  const resetToken = crypto.randomBytes(32).toString('hex');
  // Hash it before storing (don't store plain token in DB)
  this.resetPasswordToken  = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
  return resetToken; // return unhashed — this goes in the email link
};

module.exports = mongoose.model('User', userSchema);
