// middlewares/auth.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('./async');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

// Protect routes
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    // Set token from cookie
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return next(new ErrorResponse('No user found with this token', 401));
    }

    // Check if account is locked
    if (req.user.isLocked) {
      return next(new ErrorResponse('Account temporarily locked due to too many failed login attempts', 423));
    }

    next();
  } catch (err) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
});

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

// Check if user owns resource or is admin
exports.checkOwnership = asyncHandler(async (req, res, next) => {
  // Admin can access everything
  if (req.user.role === 'admin') {
    return next();
  }

  // Check if user is accessing their own resource
  const resourceUserId = req.params.id || req.params.userId;
  
  if (resourceUserId && resourceUserId.toString() !== req.user.id.toString()) {
    return next(
      new ErrorResponse('Not authorized to access this resource', 403)
    );
  }

  next();
});

// Rate limiting for auth routes
exports.loginRateLimit = (req, res, next) => {
  // This is a simple in-memory rate limiter
  // In production, use Redis or similar for distributed rate limiting
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  if (!global.loginAttempts) {
    global.loginAttempts = new Map();
  }

  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!global.loginAttempts.has(clientIP)) {
    global.loginAttempts.set(clientIP, []);
  }

  const attempts = global.loginAttempts.get(clientIP);
  
  // Remove old attempts outside the window
  const recentAttempts = attempts.filter(timestamp => now - timestamp < WINDOW_MS);
  global.loginAttempts.set(clientIP, recentAttempts);

  if (recentAttempts.length >= MAX_ATTEMPTS) {
    return next(new ErrorResponse('Too many login attempts, please try again later', 429));
  }

  // Add current attempt
  recentAttempts.push(now);
  global.loginAttempts.set(clientIP, recentAttempts);

  next();
};

// Check age restriction
exports.checkAgeRestriction = asyncHandler(async (req, res, next) => {
  if (req.user.age && (req.user.age < 4 || req.user.age > 12)) {
    return next(
      new ErrorResponse('This app is designed for children aged 4-12 years old', 403)
    );
  }
  next();
});

// Validate parent email for children
exports.validateParentEmail = asyncHandler(async (req, res, next) => {
  if (req.user.role === 'child' && !req.user.parentEmail) {
    return next(
      new ErrorResponse('Parent email is required for child accounts', 400)
    );
  }
  next();
});

// Check if user can modify resource
exports.canModify = (resourceType) => {
  return asyncHandler(async (req, res, next) => {
    // Admin can modify everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Children can only modify their own progress and profiles
    if (resourceType === 'progress' || resourceType === 'profile') {
      const resourceUserId = req.params.userId || req.user.id;
      
      if (resourceUserId.toString() !== req.user.id.toString()) {
        return next(
          new ErrorResponse('Not authorized to modify this resource', 403)
        );
      }
    } else {
      // Children cannot modify lessons, categories, etc.
      return next(
        new ErrorResponse('Not authorized to modify this resource', 403)
      );
    }

    next();
  });
};

// Middleware to set CORS headers
exports.setCorsHeaders = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CLIENT_URL || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', true);
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
};

// Security headers middleware
exports.setSecurityHeaders = (req, res, next) => {
  // Prevent XSS attacks
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy (adjust as needed)
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.youtube.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src 'self' https:; frame-src https://www.youtube.com;");
  
  next();
};