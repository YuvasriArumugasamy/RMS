require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Import routes
const authRoutes      = require('./routes/auth');
const menuRoutes      = require('./routes/menu');
const tableRoutes     = require('./routes/tables');
const orderRoutes     = require('./routes/orders');
const inventoryRoutes = require('./routes/inventory');
const staffRoutes     = require('./routes/staff');
const supplierRoutes  = require('./routes/suppliers');
const customerRoutes  = require('./routes/customers');
const settingsRoutes  = require('./routes/settings');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io accessible to routes
app.set('io', io);

// Routes
app.get('/', (req, res) => res.json({ message: 'Restaurant ERP API v1.0', status: 'online' }));
app.use('/api/auth',      authRoutes);
app.use('/api/menu',      menuRoutes);
app.use('/api/tables',    tableRoutes);
app.use('/api/orders',    orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/staff',     staffRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/settings',  settingsRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Socket.io real-time events
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  // Join room per table/area for targeted updates
  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`📍 Socket ${socket.id} joined room: ${room}`);
  });

  // Customer joins table-specific room for live order status
  socket.on('join-table', (tableName) => {
    socket.join(`table-${tableName}`);
    console.log(`🍽️  Customer joined table room: table-${tableName}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// MongoDB Connection + Server Start
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 Socket.io ready for real-time sync`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Failed:', err.message);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received, shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('🛑 MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = { app, io };
