require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const cycleRoutes = require('./routes/cycles');
const groupRoutes = require('./routes/groups');
const allocationRoutes = require('./routes/allocations');
const reviewRoutes = require('./routes/reviews');
const excelRoutes = require('./routes/excel');
const notificationRoutes = require('./routes/notifications');

// Import middleware
const { authenticate, authorize } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

// Initialize app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3001' },
});

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(requestLogger);

// Upload directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/users', authenticate, userRoutes);
app.use('/api/cycles', authenticate, cycleRoutes);
app.use('/api/groups', authenticate, groupRoutes);
app.use('/api/allocations', authenticate, authorize(['ADMIN', 'FACULTY']), allocationRoutes);
app.use('/api/reviews', authenticate, reviewRoutes);
app.use('/api/excel', authenticate, authorize(['ADMIN', 'FACULTY']), excelRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);

// Socket.io events
io.on('connection', (socket) => {
  console.log(`[Socket.IO] User connected: ${socket.id}`);

  socket.on('subscribe', (data) => {
    const room = `user:${data.userId}`;
    socket.join(room);
    socket.emit('subscribed', { room });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] User disconnected: ${socket.id}`);
  });
});

// Attach io to app
app.set('io', io);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n[Server] Running on http://localhost:${PORT}`);
  console.log(`[API] Base URL: http://localhost:${PORT}/api`);
  console.log(`[Environment] ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = { app, server, io };
