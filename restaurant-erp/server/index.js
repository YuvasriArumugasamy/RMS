/*
╔═══════════════════════════════════════════════════════════════╗
║     RESTAURANT ERP - BACKEND SERVER                            ║
║  Local-এ Run Panuvathu Eppadi?                                ║
╚═══════════════════════════════════════════════════════════════╝

📌 SETUP STEPS:
1. CD to server folder: cd restaurant-erp/server
2. Dependencies install: npm install
3. .env file create pannu:
   - PORT=5000
   - MONGODB_URI=mongodb://localhost:27017/restaurant_erp
   - JWT_SECRET=your_secret_key_here
   - CLIENT_URL=http://localhost:5173

4. MongoDB start panu (local machine-la)
5. Run server: npm run dev (development) OR npm start (production)
6. Server: http://localhost:5000 la run aakum

📡 ENDPOINTS TEST:
- GET  http://localhost:5000/
- POST http://localhost:5000/api/auth/login
- GET  http://localhost:5000/api/menu (protected)
*/

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const logger = require('./utils/logger');

// Import routes
const authRoutes      = require('./routes/auth');
const menuRoutes      = require('./routes/menu');
const tableRoutes     = require('./routes/tables');
const orderRoutes     = require('./routes/orders');
const inventoryRoutes = require('./routes/inventory');
const staffRoutes     = require('./routes/staff');
const supplierRoutes  = require('./routes/suppliers');
const customerRoutes  = require('./routes/customers');
const settingsRoutes      = require('./routes/settings');
const reservationRoutes   = require('./routes/reservations');
const couponRoutes        = require('./routes/coupons');

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o)) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: corsOptions });

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

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
app.use('/api/settings',      settingsRoutes);
app.use('/api/reservations',  reservationRoutes);
app.use('/api/coupons',       couponRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Socket.io real-time events
io.on('connection', (socket) => {
  logger.log(`✅ Client connected: ${socket.id}`);

  // Join room per table/area for targeted updates
  socket.on('join-room', (room) => {
    socket.join(room);
    logger.log(`📍 Socket ${socket.id} joined room: ${room}`);
  });

  // Customer joins table-specific room for live order status
  socket.on('join-table', (tableName) => {
    socket.join(`table-${tableName}`);
    logger.log(`🍽️  Customer joined table room: table-${tableName}`);
  });

  socket.on('disconnect', () => {
    logger.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// MongoDB Connection + Server Start
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    logger.info('✅ MongoDB Connected');
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`🔌 Socket.io ready for real-time sync`);
    });
  })
  .catch((err) => {
    logger.error('❌ MongoDB Connection Failed:', err.message);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('⚠️  SIGTERM received, shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      logger.info('🛑 MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = { app, io };
