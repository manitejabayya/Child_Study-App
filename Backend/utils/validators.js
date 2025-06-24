// utils/validators.js
const validator = require('validator');

// Age validation for child safety
const validateAge = (age) => {
  if (!age || age < 4 || age > 18) {
    throw new Error('Age must be between 4 and 18 years');
  }
  return true;
};

// Password validation with child-friendly requirements
const validatePassword = (password) => {
  const errors = [];
  
  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (password.length > 20) {
    errors.push('Password cannot be more than 20 characters long');
  }
  
  // Check for at least one letter and one number
  if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one letter and one number');
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
  
  return true;
};

// Email validation
const validateEmail = (email) => {
  if (!validator.isEmail(email)) {
    throw new Error('Please provide a valid email address');
  }
  return true;
};

// YouTube URL validation
const validateYouTubeUrl = (url) => {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  if (!youtubeRegex.test(url)) {
    throw new Error('Please provide a valid YouTube URL');
  }
  return true;
};

// Extract YouTube video ID
const extractYouTubeId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  
  if (match && match[2].length === 11) {
    return match[2];
  }
  
  throw new Error('Invalid YouTube URL format');
};

// Sanitize input for child safety
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove potentially harmful characters
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
};

// Validate learning progress
const validateProgress = (watchTime, totalDuration) => {
  if (watchTime < 0 || totalDuration <= 0) {
    throw new Error('Invalid progress data');
  }
  
  if (watchTime > totalDuration * 1.2) {
    throw new Error('Watch time cannot exceed video duration significantly');
  }
  
  return true;
};

module.exports = {
  validateAge,
  validatePassword,
  validateEmail,
  validateYouTubeUrl,
  extractYouTubeId,
  sanitizeInput,
  validateProgress
};

// utils/helpers.js
const crypto = require('crypto');

// Format duration from seconds to readable format
const formatDuration = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  } else if (mins > 0) {
    return `${mins}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

// Calculate completion percentage
const calculateCompletionPercentage = (watchTime, totalDuration) => {
  if (totalDuration <= 0) return 0;
  return Math.min(100, Math.round((watchTime / totalDuration) * 100));
};

// Generate random token for password reset
const generateToken = () => {
  return crypto.randomBytes(20).toString('hex');
};

// Hash token for storage
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Calculate age from birth date
const calculateAge = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

// Generate child-friendly username suggestions
const generateUsername = (firstName, lastName) => {
  const suggestions = [];
  const base = firstName.toLowerCase();
  const lastInitial = lastName ? lastName.charAt(0).toLowerCase() : '';
  
  suggestions.push(`${base}${lastInitial}`);
  suggestions.push(`${base}${Math.floor(Math.random() * 100)}`);
  suggestions.push(`${base}_learner`);
  suggestions.push(`${base}_coder`);
  suggestions.push(`smart_${base}`);
  
  return suggestions;
};

// Calculate points based on various factors
const calculatePoints = (basePoints, completionPercentage, attempts, rating) => {
  let points = basePoints;
  
  // Full completion bonus
  if (completionPercentage >= 100) {
    points += Math.floor(basePoints * 0.5);
  } else if (completionPercentage >= 80) {
    points += Math.floor(basePoints * 0.2);
  }
  
  // First attempt bonus
  if (attempts === 1) {
    points += Math.floor(basePoints * 0.3);
  }
  
  // Rating bonus
  if (rating >= 4) {
    points += 5;
  } else if (rating >= 3) {
    points += 2;
  }
  
  return points;
};

// Get age-appropriate content filter
const getAgeAppropriateFilter = (age) => {
  if (age <= 6) {
    return { difficulty: 'easy', level: { $lte: 3 } };
  } else if (age <= 9) {
    return { difficulty: { $in: ['easy', 'medium'] }, level: { $lte: 6 } };
  } else {
    return { level: { $lte: 10 } };
  }
};

// Format learning stats for display
const formatLearningStats = (stats) => {
  return {
    totalWatchTime: formatDuration(stats.totalWatchTime || 0),
    averageProgress: Math.round(stats.averageProgress || 0),
    completionRate: Math.round(stats.completionRate || 0),
    streak: stats.streak || 0,
    level: stats.level || 1,
    totalPoints: stats.totalPoints || 0,
    badges: stats.badges || []
  };
};

// Check if content is appropriate for child
const isContentAppropriate = (content, childAge) => {
  const inappropriateKeywords = [
    'violence', 'scary', 'adult', 'mature', 'horror',
    'weapon', 'fight', 'blood', 'death', 'kill'
  ];
  
  const contentLower = content.toLowerCase();
  
  // Check for inappropriate keywords
  const hasInappropriate = inappropriateKeywords.some(keyword => 
    contentLower.includes(keyword)
  );
  
  if (hasInappropriate) return false;
  
  // Age-specific checks
  if (childAge <= 6 && contentLower.includes('advanced')) {
    return false;
  }
  
  return true;
};

// Generate achievement based on progress
const checkAchievements = (userProgress) => {
  const achievements = [];
  
  // First lesson achievement
  if (userProgress.completedLessons === 1) {
    achievements.push({
      name: 'First Steps',
      description: 'Completed your first lesson!',
      icon: '🎯',
      type: 'milestone'
    });
  }
  
  // Streak achievements
  if (userProgress.streak === 7) {
    achievements.push({
      name: 'Week Warrior',
      description: 'Learned for 7 days straight!',
      icon: '🔥',
      type: 'streak'
    });
  }
  
  // Points achievements
  if (userProgress.totalPoints >= 100) {
    achievements.push({
      name: 'Century Club',
      description: 'Earned 100 points!',
      icon: '💯',
      type: 'points'
    });
  }
  
  // Category completion
  if (userProgress.categoriesCompleted && userProgress.categoriesCompleted.length >= 1) {
    achievements.push({
      name: 'Category Master',
      description: 'Completed all lessons in a category!',
      icon: '🏆',
      type: 'completion'
    });
  }
  
  return achievements;
};

module.exports = {
  formatDuration,
  calculateCompletionPercentage,
  generateToken,
  hashToken,
  calculateAge,
  generateUsername,
  calculatePoints,
  getAgeAppropriateFilter,
  formatLearningStats,
  isContentAppropriate,
  checkAchievements
};

// utils/asyncHandler.js
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

// utils/logger.js
const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'child-study-app' },
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Child-specific logging methods
logger.childActivity = (childId, activity, details) => {
  logger.info('Child Activity', {
    childId,
    activity,
    details,
    timestamp: new Date().toISOString()
  });
};

logger.lessonProgress = (childId, lessonId, progress) => {
  logger.info('Lesson Progress', {
    childId,
    lessonId,
    progress,
    timestamp: new Date().toISOString()
  });
};

logger.parentActivity = (parentId, activity, details) => {
  logger.info('Parent Activity', {
    parentId,
    activity,
    details,
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;