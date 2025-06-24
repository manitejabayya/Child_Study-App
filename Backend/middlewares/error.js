// middlewares/error.js

// Create ErrorResponse class if it doesn't exist or import is failing
class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ErrorResponse';
  }
}

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  console.log(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    let message = 'Duplicate field value entered';
    
    // More specific error messages for common duplicates
    if (err.keyPattern && err.keyPattern.email) {
      message = 'Email already registered';
    } else if (err.keyPattern && err.keyPattern.name) {
      message = 'Name already taken';
    }
    
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ErrorResponse(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new ErrorResponse(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new ErrorResponse(message, 401);
  }

  // MongoDB connection errors
  if (err.name === 'MongoNetworkError') {
    const message = 'Database connection error';
    error = new ErrorResponse(message, 500);
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = new ErrorResponse(message, 400);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field';
    error = new ErrorResponse(message, 400);
  }

  // Rate limiting errors
  if (err.statusCode === 429) {
    const message = 'Too many requests, please try again later';
    error = new ErrorResponse(message, 429);
  }

  // Child-specific errors
  if (err.message && err.message.includes('age')) {
    const message = 'Age must be between 4 and 12 years old';
    error = new ErrorResponse(message, 400);
  }

  // YouTube URL validation errors
  if (err.message && err.message.includes('YouTube')) {
    const message = 'Please provide a valid YouTube URL';
    error = new ErrorResponse(message, 400);
  }

  // Progress tracking errors
  if (err.message && err.message.includes('progress')) {
    const message = 'Error updating progress';
    error = new ErrorResponse(message, 400);
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Server Error';

  // Log detailed error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error Details:', {
      message: err.message,
      stack: err.stack,
      statusCode: statusCode,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: error 
    })
  });
};

// Not found middleware
const notFound = (req, res, next) => {
  const error = new ErrorResponse(`Not found - ${req.originalUrl}`, 404);
  next(error);
};

// Async error handler
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Custom error classes for specific scenarios
class ValidationError extends ErrorResponse {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends ErrorResponse {
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends ErrorResponse {
  constructor(message = 'Not authorized') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends ErrorResponse {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends ErrorResponse {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class RateLimitError extends ErrorResponse {
  constructor(message = 'Too many requests') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

// Error logging function
const logError = (err, req, additionalInfo = {}) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    message: err.message,
    stack: err.stack,
    url: req?.originalUrl,
    method: req?.method,
    ip: req?.ip,
    userAgent: req?.get('User-Agent'),
    userId: req?.user?.id,
    ...additionalInfo
  };

  // In production, you might want to send this to a logging service
  if (process.env.NODE_ENV === 'production') {
    // Send to logging service (e.g., Winston, Sentry, etc.)
    console.error('Production Error:', JSON.stringify(errorInfo, null, 2));
  } else {
    console.error('Development Error:', errorInfo);
  }
};

module.exports = {
  ErrorResponse, // Export the ErrorResponse class
  errorHandler,
  notFound,
  asyncHandler,
  logError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError
};