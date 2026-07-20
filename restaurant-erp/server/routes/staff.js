const express = require('express');
const Staff = require('../models/Staff');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET all staff — all roles can read (needed for POS waiter dropdown)
router.get('/', authorize('Admin', 'Manager', 'Waiter', 'Cashier', 'Chef'), async (req, res) => {
  try {
    const staff = await Staff.find().sort({ name: 1 });
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST add staff + create user account
router.post('/', authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const { name, role, phone, password } = req.body;

    // Create login user account
    const username = name.toLowerCase().replace(/\s+/g, '.') + '.' + Date.now().toString().slice(-4);
    const user = await User.create({
      username,
      password: password || 'Staff@123', // default password
      role,
      phone,
    });

    const staff = await Staff.create({ name, role, phone, userId: user._id });

    res.status(201).json({
      success: true,
      data: staff,
      credentials: { username, defaultPassword: password ? undefined : 'Staff@123' },
      message: password ? 'Staff created.' : `Staff created. Default login: ${username} / Staff@123`
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT update staff
router.put('/:id', authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found.' });
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Helper to find or link Staff record for logged in user
const findOrCreateStaffForUser = async (user) => {
  let staff = await Staff.findOne({ userId: user._id });
  if (!staff && user.username) {
    staff = await Staff.findOne({ name: { $regex: new RegExp(`^${user.username}$`, 'i') } });
    if (staff && !staff.userId) {
      staff.userId = user._id;
      await staff.save();
    }
  }
  if (!staff) {
    const displayName = user.username ? (user.username.charAt(0).toUpperCase() + user.username.slice(1)) : (user.role + ' User');
    staff = await Staff.create({
      name: displayName,
      role: user.role || 'Staff',
      userId: user._id,
      status: 'Active',
    });
  }
  return staff;
};

// GET logged-in user's attendance status for today
router.get('/my-attendance', async (req, res) => {
  try {
    const staff = await findOrCreateStaffForUser(req.user);
    const today = new Date().toISOString().split('T')[0];
    const todayRec = (staff.attendance || []).find(a => a.date === today);

    const isClockedIn = !!(todayRec && todayRec.clockInTime && !todayRec.clockOutTime);
    res.json({
      success: true,
      data: {
        staffId: staff._id,
        staffName: staff.name,
        today,
        isClockedIn,
        attendance: todayRec || null,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST Self Clock In
router.post('/clock-in', async (req, res) => {
  try {
    const staff = await findOrCreateStaffForUser(req.user);
    const today = new Date().toISOString().split('T')[0];
    const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    let existingIdx = (staff.attendance || []).findIndex(a => a.date === today);
    if (existingIdx > -1) {
      staff.attendance[existingIdx].status = 'Present';
      if (!staff.attendance[existingIdx].clockInTime) {
        staff.attendance[existingIdx].clockInTime = nowStr;
      }
      staff.attendance[existingIdx].clockOutTime = ''; // reset clock-out if re-clocking in
    } else {
      staff.attendance.push({
        date: today,
        status: 'Present',
        clockInTime: nowStr,
        clockOutTime: '',
        totalHours: 0,
      });
    }

    staff.status = 'Active';
    await staff.save();

    // Emit socket event for live attendance updates
    const io = req.app.get('io');
    if (io) io.to('staff').emit('attendance-update', { staffId: staff._id, name: staff.name, action: 'clock-in', time: nowStr });

    const updatedRec = staff.attendance.find(a => a.date === today);
    res.json({ success: true, message: `✅ Clocked in at ${nowStr}`, data: updatedRec, staffId: staff._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST Self Clock Out
router.post('/clock-out', async (req, res) => {
  try {
    const staff = await findOrCreateStaffForUser(req.user);
    const today = new Date().toISOString().split('T')[0];
    const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    let existingIdx = (staff.attendance || []).findIndex(a => a.date === today);
    let totalHrs = 0;

    if (existingIdx > -1) {
      const rec = staff.attendance[existingIdx];
      rec.clockOutTime = nowStr;
      rec.status = 'Present';

      // Calculate elapsed hours if clockInTime exists
      if (rec.clockInTime) {
        try {
          const parseTime = (tStr) => {
            const [time, modifier] = tStr.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            const d = new Date();
            d.setHours(hours, minutes, 0, 0);
            return d;
          };
          const startTime = parseTime(rec.clockInTime);
          const endTime = new Date();
          const diffMs = Math.max(0, endTime - startTime);
          totalHrs = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
          rec.totalHours = totalHrs;
        } catch {
          rec.totalHours = 8; // fallback
        }
      }
    } else {
      staff.attendance.push({
        date: today,
        status: 'Present',
        clockInTime: nowStr,
        clockOutTime: nowStr,
        totalHours: 0,
      });
    }

    await staff.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) io.to('staff').emit('attendance-update', { staffId: staff._id, name: staff.name, action: 'clock-out', time: nowStr });

    const updatedRec = staff.attendance.find(a => a.date === today);
    res.json({ success: true, message: `⏱️ Clocked out at ${nowStr}`, data: updatedRec, staffId: staff._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT mark attendance (Admin/Manager override)
router.put('/:id/attendance', authorize('Admin', 'Manager', 'Waiter'), async (req, res) => {
  try {
    const { date, status, clockInTime, clockOutTime, totalHours } = req.body;
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found.' });

    const existingIdx = staff.attendance.findIndex(a => a.date === date);
    const entryData = {
      date,
      status: status || 'Present',
      clockInTime: clockInTime !== undefined ? clockInTime : (existingIdx > -1 ? staff.attendance[existingIdx].clockInTime : '09:00 AM'),
      clockOutTime: clockOutTime !== undefined ? clockOutTime : (existingIdx > -1 ? staff.attendance[existingIdx].clockOutTime : ''),
      totalHours: totalHours !== undefined ? totalHours : (existingIdx > -1 ? staff.attendance[existingIdx].totalHours : 0),
    };

    if (existingIdx > -1) {
      staff.attendance[existingIdx] = entryData;
    } else {
      staff.attendance.push(entryData);
    }

    // Update active status if today
    const today = new Date().toISOString().split('T')[0];
    if (date === today) {
      staff.status = status === 'Present' ? 'Active' : 'Inactive';
    }

    await staff.save();

    const io = req.app.get('io');
    if (io) io.to('staff').emit('attendance-update', { staffId: staff._id, name: staff.name, action: 'override' });

    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE staff
router.delete('/:id', authorize('Admin'), async (req, res) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);
    if (staff?.userId) await User.findByIdAndDelete(staff.userId);
    res.json({ success: true, message: 'Staff deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
