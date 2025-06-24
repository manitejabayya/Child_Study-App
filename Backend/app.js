// app.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

// Import middlewares
const { protect } = require('./middlewares/auth');
const { errorHandler, notFound } = require('./middlewares/error'); // Fixed: destructure errorHandler

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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', protect, userRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Welcome to Child Study API!',
    description: 'A fun learning platform for kids to explore Computer Science basics',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
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
    // Temporary hardcoded connection string for testing
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://pandubayya369:Maniteja%402005@cluster0.3k5xadv.mongodb.net/child-study-app';
    console.log('Attempting to connect to:', mongoURI.includes('cluster0') ? 'MongoDB Atlas' : 'localhost');
    
    const conn = await mongoose.connect(mongoURI);
    console.log(` MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(' Database connection failed:', error.message);
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