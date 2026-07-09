const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const sendEmail = require('../utils/mailer');
const logger = require('../utils/logger');

const router = express.Router();

// â”€â”€ Rate limiters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Login: max 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register: max 5 attempts per hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Forgot password: max 5 per hour
const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many password reset requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generate JWT with fallback expiry
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// @route   POST /api/auth/register
// @desc    Register new user
//          - If NO users exist in DB â†’ allow freely (initial setup)
//          - Otherwise â†’ requires existing Admin JWT token
// @access  Public (first user) / Admin only (subsequent users)
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { username, password, role, phone } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required.' });
    }

    // Check if any users exist
    const userCount = await User.countDocuments();

    if (userCount > 0) {
      // Subsequent registrations require Admin auth
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Admin authentication required to register new users.' });
      }
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const adminUser = await User.findById(decoded.id);
        if (!adminUser || adminUser.role !== 'Admin') {
          return res.status(403).json({ success: false, message: 'Only Admins can register new users.' });
        }
      } catch {
        return res.status(401).json({ success: false, message: 'Invalid or expired admin token.' });
      }
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists.' });
    }

    // For first user, force Admin role
    const assignedRole = userCount === 0 ? 'Admin' : (role || 'Waiter');
    const user = await User.create({ username, password, role: assignedRole, phone });
    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        phone: user.phone,
      }
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required.' });
    }

    const user = await User.findOne({ username }).select('+password');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = signToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        phone: user.phone,
      }
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged-in user
// @access  Private
router.get('/me', protect, async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// @route   POST /api/auth/forgot-password
// @desc    Send password reset link to user's registered email
// @access  Public
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/forgot-password', forgotLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    // Find user by email (case-insensitive)
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always return the same response â€” don't reveal whether email exists (security best practice)
    const genericMsg = 'If that email is registered, a reset link has been sent.';

    if (!user) {
      return res.json({ success: true, message: genericMsg });
    }

    // Generate token and save hashed version to DB
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Build reset URL pointing to the frontend
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl  = `${clientUrl}/forgot-password?token=${resetToken}&id=${user._id}`;

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;background:#f9fafb;border-radius:12px">
        <h2 style="color:#1e3a8a;margin-bottom:8px">ðŸ” Password Reset</h2>
        <p style="color:#374151;font-size:14px">Hi <strong>${user.username}</strong>,</p>
        <p style="color:#374151;font-size:14px">
          Someone requested a password reset for your Restaurant Management System account.
          Click the button below to set a new password. This link expires in <strong>15 minutes</strong>.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;margin:20px 0;padding:14px 28px;background:#f97316;color:#fff;
                  text-decoration:none;border-radius:8px;font-weight:700;font-size:14px">
          Reset My Password
        </a>
        <p style="color:#6b7280;font-size:12px">
          If you didn't request this, simply ignore this email â€” your password won't change.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
        <p style="color:#9ca3af;font-size:11px">Restaurant Management System Â· Automated email, do not reply.</p>
      </div>
    `;

    try {
      await sendEmail({ to: user.email, subject: 'ðŸ” RMS Password Reset', html });
      return res.json({ success: true, message: genericMsg });
    } catch (emailErr) {
      // If email fails, clear the token so the user can try again
      user.resetPasswordToken  = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      logger.error('Email send failed:', emailErr.message);
      return res.status(500).json({ success: false, message: 'Email could not be sent. Please contact your Admin.' });
    }
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// @route   POST /api/auth/reset-password
// @desc    Reset password using token from email link
// @access  Public
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/reset-password', async (req, res) => {
  try {
    const { token, id, password } = req.body;

    if (!token || !id || !password) {
      return res.status(400).json({ success: false, message: 'Token, user ID, and new password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    // Hash the incoming token to compare with the stored hashed version
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with matching token that hasn't expired
    const user = await User.findOne({
      _id: id,
      resetPasswordToken:  hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired.' });
    }

    // Set new password (pre-save hook will hash it)
    user.password            = password;
    user.resetPasswordToken  = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Auto-login: return a fresh JWT
    const jwtToken = signToken(user._id);
    res.json({
      success: true,
      message: 'Password reset successful.',
      token: jwtToken,
      user: { id: user._id, username: user.username, role: user.role },
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
});

module.exports = router;

