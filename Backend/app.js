// app.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 1. FIRST THING - Load environment variables with correct path
dotenv.config({ path: path.join(__dirname, 'config/config.env') }); // Fixed path

// DEBUG: Verify environment variables
console.log('JWT_SECRET:', process.env.JWT_SECRET || 'NOT FOUND!');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Found' : 'Not found');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

// Import middlewares
const { protect } = require('./middlewares/auth');
const { errorHandler, notFound } = require('./middlewares/error');

// Load environment variables
dotenv.config();

// Debug: Check if MONGODB_URI is loaded (remove this after testing)
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Found' : 'Not found');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Child Study API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes - FIXED: Added /v1 prefix to match your frontend requests
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', protect, userRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Welcome to Child Study API!',
    description: 'A fun learning platform for kids to explore Computer Science basics',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      health: '/health'
    }
  });
});

// 404 handler - use the notFound middleware from error.js
app.use(notFound);

// Global error handling middleware
app.use(errorHandler);

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    console.log('Connecting to:', mongoURI);

    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: 'majority'
    });

    // Verify database exists or create it
    const adminDb = conn.connection.db.admin();
    const dbList = await adminDb.listDatabases();
    const dbExists = dbList.databases.some(db => db.name === 'child-study-app');
    
    console.log(dbExists ? '✅ Database exists' : '⚠️ Database will be created on first write');
    
    // Force collection creation
    await conn.connection.db.collection('users').createIndex({ email: 1 }, { unique: true });
    console.log('✔️ Users collection ready');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};
// Connect to database
connectDB();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(` Unhandled Rejection: ${err.message}`);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(` Uncaught Exception: ${err.message}`);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(` Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

module.exports = app;