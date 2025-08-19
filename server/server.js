// Main server file for the insurance marketplace API
// This handles all the backend logic, WebSocket connections, and security
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, 'server.env');
require('dotenv').config({ path: envPath });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://insurancemarketplace.netlify.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true
});

// Socket connection error handling
io.engine.on('connection_error', (err) => {
  // Log to error monitoring service in production
});

// Security Middleware - Helmet enabled with WebSocket-friendly configuration
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "ws://localhost:5002", "http://localhost:5002", "https://insurance-marketplace-production.up.railway.app"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));



app.use(cors({
  origin: ["http://localhost:3000", "https://insurancemarketplace.netlify.app"],
  credentials: true
}));
// Request size limiting for security
app.use(express.json({ limit: '1mb' })); // Reduced from 10mb for security
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Additional security middleware
app.use((req, res, next) => {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Basic request sanitization
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  
  next();
});

// General rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100 // Higher limit for development
});
app.use(limiter);

// Note: Auth rate limiting is handled in auth.routes.js

// Environment Variables
const PORT = process.env.PORT || 5002;
const MONGO_URI = process.env.MONGODB_URI;

// MongoDB Connection - using the newer connection options
// Had some deprecation warnings with the old ones
mongoose.connect(MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
.then(() => {
  // MongoDB connected successfully
  // Could add some startup logging here if needed
})
.catch(err => {
  console.error('MongoDB Connection Error:', err);
  process.exit(1); // Exit if we can't connect to the database
});

// Make Socket.io available to routes
app.set('io', io);

// API Routes - organized by feature
// Each route file handles a specific part of the business logic
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/requests', require('./routes/insuranceRequest.routes'));
app.use('/api/offers', require('./routes/insuranceOffer.routes'));
app.use('/api/bids', require('./routes/bid.routes'));
app.use('/api/providers', require('./routes/provider.routes'));
app.use('/api/reviews', require('./routes/review.routes'));
app.use('/api/support', require('./routes/support.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/chat', require('./routes/chat.routes'));
app.use('/api/accepted-offers', require('./routes/acceptedOffer.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/kyc', require('./routes/kyc.routes'));

// Basic Routes - simple endpoints for health checks and info
app.get('/', (req, res) => {
  res.json({ 
    message: 'Insurance Marketplace API is running...',
    version: '1.0.0',
    status: 'active'
  });
});

// Health check endpoint for Railway deployment
// This helps with monitoring and auto-scaling
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test socket endpoint - useful for debugging WebSocket issues
app.get('/socket-test', (req, res) => {
  res.json({ 
    message: 'Socket test endpoint',
    socketStatus: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Socket.io info endpoint - shows current connection status
// Helpful for monitoring in development
app.get('/socket-info', (req, res) => {
  res.json({
    message: 'Socket.io server info',
    connectedClients: io.engine.clientsCount,
    transports: ['polling', 'websocket'],
    cors: {
      origin: "http://localhost:3000",
      credentials: true
    }
  });
});

// Socket.io Connection - handles real-time communication
io.on('connection', (socket) => {
  // Join user to their room for private messages
  // Each user gets their own room for targeted notifications
  socket.on('join_room', (userId) => {
    socket.join(`user_${userId}`);
  });

  // Join user to their personal room for notifications
  // This is separate from chat rooms for better organization
  socket.on('join_user_room', (data) => {
    const { userId } = data;
    socket.join(`user_${userId}`);
  });

  // Test notification handler - useful for debugging
  // Clients can send this to verify their connection is working
  socket.on('test_notification', (data) => {
    // Send back a test notification
    socket.emit('test_notification_response', { 
      message: 'Socket connection working!', 
      timestamp: new Date() 
    });
  });

  // Handle new insurance requests - broadcast to all providers
  // This allows providers to see new opportunities in real-time
  socket.on('new_insurance_request', (data) => {
    // Broadcast to all insurance providers
    io.emit('insurance_request_notification', data);
  });

  // Handle new bids - notify clients when they receive bids
  // Clients need to know quickly when providers are interested
  socket.on('new_bid', (data) => {
    // Notify the client about the new bid
    io.to(`user_${data.clientId}`).emit('bid_notification', data);
  });

  // Handle bid acceptance - notify providers when their bid is accepted
  // Providers want immediate feedback on their proposals
  socket.on('bid_accepted', (data) => {
    // Notify the provider about the accepted bid
    io.to(`user_${data.providerId}`).emit('bid_accepted_notification', data);
  });

  // Handle chat messages - real-time messaging between users
  // Messages are sent to specific user rooms for privacy
  socket.on('send_message', (data) => {
    // Send to specific user room
    io.to(`user_${data.recipientId}`).emit('new_message', data);
  });

  // Handle typing indicators - shows when someone is typing
  // This improves the chat experience significantly
  socket.on('typing', (data) => {
    // Broadcast typing indicator to other users in the room
    socket.broadcast.to(`user_${data.recipientId}`).emit('user_typing', data);
  });

  socket.on('stop_typing', (data) => {
    // Broadcast stop typing indicator
    socket.broadcast.to(`user_${data.recipientId}`).emit('user_stop_typing', data);
  });

  // Handle offer notifications - broadcast new offers to providers
  // Providers can see new opportunities as they're posted
  socket.on('new_offer', (data) => {
    // Broadcast to insurance providers
    io.emit('offer_notification', data);
  });

  socket.on('disconnect', () => {
    // Handle user disconnection
    // Could add cleanup logic here if needed
    // For now, just let the connection close naturally
  });
});

// Error handling middleware - catches any errors that weren't handled
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler - catch any routes that don't exist
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

server.listen(PORT, () => {
  // Server started successfully
  // Could add some startup logging here if needed
});

module.exports = { app, server, io };
