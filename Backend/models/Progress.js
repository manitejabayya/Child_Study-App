// models/Progress.js
const mongoose = require('mongoose');

const ProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  lesson: {
    type: mongoose.Schema.ObjectId,
    ref: 'Lesson',
    required: true
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started'
  },
  watchTime: {
    type: Number, // in seconds
    default: 0,
    min: 0
  },
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  lastWatch: {
    position: {
      type: Number, // Last watched position in seconds
      default: 0
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  watchSessions: [{
    startTime: {
      type: Date,
      default: Date.now
    },
    endTime: Date,
    duration: Number, // in seconds
    startPosition: Number,
    endPosition: Number,
    completed: {
      type: Boolean,
      default: false
    }
  }],
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: {
    type: String,
    maxlength: [500, 'Feedback cannot be more than 500 characters']
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  pointsEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  attempts: {
    type: Number,
    default: 1,
    min: 1
  },
  bookmarked: {
    type: Boolean,
    default: false
  },
  bookmarkedAt: Date,
  difficulty: {
    type: String,
    enum: ['too_easy', 'just_right', 'too_hard'],
    default: 'just_right'
  },
  timeSpent: {
    type: Number, // Total time spent on this lesson (including rewatches)
    default: 0
  },
  streakCount: {
    type: Number,
    default: 0
  },
  achievements: [{
    name: String,
    unlockedAt: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['completion', 'speed', 'understanding', 'streak', 'engagement']
    }
  }],
  parentNotes: {
    type: String,
    maxlength: [500, 'Parent notes cannot be more than 500 characters']
  },
  childEngagement: {
    attentionLevel: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    enjoymentLevel: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    confidenceLevel: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to ensure one progress record per user per lesson
ProgressSchema.index({ user: 1, lesson: 1 }, { unique: true });

// Index for efficient querying
ProgressSchema.index({ user: 1, status: 1 });
ProgressSchema.index({ user: 1, isCompleted: 1 });
ProgressSchema.index({ lesson: 1, isCompleted: 1 });
ProgressSchema.index({ createdAt: -1 });

// Virtual for calculating actual completion rate
ProgressSchema.virtual('actualCompletionRate').get(function() {
  if (this.watchSessions.length === 0) return 0;
  
  const totalWatched = this.watchSessions.reduce((sum, session) => {
    return sum + (session.duration || 0);
  }, 0);
  
  return this.lesson && this.lesson.duration ? 
    Math.min(100, Math.round((totalWatched / this.lesson.duration) * 100)) : 0;
});

// Virtual for learning efficiency
ProgressSchema.virtual('learningEfficiency').get(function() {
  if (!this.timeSpent || this.timeSpent === 0) return 0;
  
  // Calculate efficiency based on completion vs time spent
  const idealTime = this.lesson && this.lesson.duration ? this.lesson.duration : this.watchTime;
  return Math.round((idealTime / this.timeSpent) * 100);
});

// Pre-save middleware to update timestamps and calculate fields
ProgressSchema.pre('save', function(next) {
  // Update last watch timestamp when watchTime changes
  if (this.isModified('watchTime')) {
    this.lastWatch.timestamp = Date.now();
  }
  
  // Set completed timestamp when marked as completed
  if (this.isModified('isCompleted') && this.isCompleted && !this.completedAt) {
    this.completedAt = Date.now();
  }
  
  // Set bookmarked timestamp
  if (this.isModified('bookmarked') && this.bookmarked && !this.bookmarkedAt) {
    this.bookmarkedAt = Date.now();
  }
  
  next();
});

// Update progress method with enhanced tracking
ProgressSchema.methods.updateProgress = function(watchTime, totalDuration, currentPosition = 0) {
  const previousWatchTime = this.watchTime;
  const previousCompleted = this.isCompleted;
  
  // Update watch time (only if new time is greater)
  this.watchTime = Math.max(this.watchTime, watchTime);
  
  // Update last watch position
  this.lastWatch.position = currentPosition;
  this.lastWatch.timestamp = Date.now();
  
  // Calculate completion percentage
  if (totalDuration > 0) {
    this.completionPercentage = Math.min(100, Math.round((this.watchTime / totalDuration) * 100));
  }
  
  // Update status and completion
  if (this.completionPercentage >= 80 && !this.isCompleted) {
    this.isCompleted = true;
    this.completedAt = Date.now();
    this.status = 'completed';
    
    // Add completion achievement
    this.achievements.push({
      name: 'Lesson Completed',
      type: 'completion'
    });
    
    return { completed: true, firstTime: !previousCompleted };
  } else if (this.completionPercentage > 0 && this.status === 'not_started') {
    this.status = 'in_progress';
  }
  
  return { completed: false, firstTime: false };
};

// Start a new watch session
ProgressSchema.methods.startWatchSession = function(startPosition = 0) {
  const session = {
    startTime: Date.now(),
    startPosition: startPosition,
    endPosition: startPosition
  };
  
  this.watchSessions.push(session);
  
  // Update status if not started
  if (this.status === 'not_started') {
    this.status = 'in_progress';
    this.startedAt = Date.now();
  }
  
  return this.watchSessions[this.watchSessions.length - 1];
};

// End current watch session
ProgressSchema.methods.endWatchSession = function(endPosition, completed = false) {
  const currentSession = this.watchSessions[this.watchSessions.length - 1];
  
  if (currentSession && !currentSession.endTime) {
    currentSession.endTime = Date.now();
    currentSession.endPosition = endPosition;
    currentSession.duration = Math.round((currentSession.endTime - currentSession.startTime) / 1000);
    currentSession.completed = completed;
    
    // Update total time spent
    this.timeSpent += currentSession.duration;
    
    // Update last watch position
    this.lastWatch.position = endPosition;
    this.lastWatch.timestamp = Date.now();
  }
  
  return currentSession;
};

// Calculate points with bonuses and penalties
ProgressSchema.methods.calculatePoints = function(basePoints, lessonDifficulty = 'easy') {
  if (!this.isCompleted) return 0;
  
  let points = basePoints;
  
  // Difficulty multiplier
  const difficultyMultiplier = {
    easy: 1,
    medium: 1.2,
    hard: 1.5
  };
  points *= (difficultyMultiplier[lessonDifficulty] || 1);
  
  // First attempt bonus
  if (this.attempts === 1) {
    points += Math.floor(basePoints * 0.25);
  }
  
  // Speed bonus (completed in less than 2x duration)
  if (this.lesson && this.lesson.duration && this.timeSpent < (this.lesson.duration * 2)) {
    points += Math.floor(basePoints * 0.15);
  }
  
  // Rating bonus
  if (this.rating >= 5) {
    points += 10;
  } else if (this.rating >= 4) {
    points += 5;
  }
  
  // Engagement bonus
  if (this.childEngagement.enjoymentLevel >= 4 && this.childEngagement.attentionLevel >= 4) {
    points += 5;
  }
  
  // Streak bonus
  if (this.streakCount >= 7) {
    points += Math.floor(basePoints * 0.1);
  }
  
  return Math.round(points);
};

// Add achievement
ProgressSchema.methods.addAchievement = function(name, type) {
  // Check if achievement already exists
  const existingAchievement = this.achievements.find(a => a.name === name);
  if (!existingAchievement) {
    this.achievements.push({ name, type });
    return true;
  }
  return false;
};

// Get learning analytics
ProgressSchema.methods.getLearningAnalytics = function() {
  return {
    totalWatchTime: this.watchTime,
    totalTimeSpent: this.timeSpent,
    completionPercentage: this.completionPercentage,
    attempts: this.attempts,
    averageSessionDuration: this.watchSessions.length > 0 ? 
      Math.round(this.timeSpent / this.watchSessions.length) : 0,
    learningEfficiency: this.learningEfficiency,
    engagementScore: Math.round(
      (this.childEngagement.attentionLevel + 
       this.childEngagement.enjoymentLevel + 
       this.childEngagement.confidenceLevel) / 3
    ),
    achievementsCount: this.achievements.length,
    streakCount: this.streakCount,
    lastWatchedAt: this.lastWatch.timestamp,
    isBookmarked: this.bookmarked
  };
};

// Static method to get user's overall progress
ProgressSchema.statics.getUserOverallProgress = async function(userId) {
  const progress = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalLessons: { $sum: 1 },
        completedLessons: {
          $sum: { $cond: [{ $eq: ['$isCompleted', true] }, 1, 0] }
        },
        totalWatchTime: { $sum: '$watchTime' },
        totalTimeSpent: { $sum: '$timeSpent' },
        totalPoints: { $sum: '$pointsEarned' },
        averageRating: { $avg: '$rating' },
        totalAchievements: { $sum: { $size: '$achievements' } },
        bookmarkedLessons: {
          $sum: { $cond: [{ $eq: ['$bookmarked', true] }, 1, 0] }
        }
      }
    }
  ]);
  
  return progress[0] || {
    totalLessons: 0,
    completedLessons: 0,
    totalWatchTime: 0,
    totalTimeSpent: 0,
    totalPoints: 0,
    averageRating: 0,
    totalAchievements: 0,
    bookmarkedLessons: 0
  };
};

// Static method to get progress by category
ProgressSchema.statics.getProgressByCategory = async function(userId) {
  return await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: 'lessons',
        localField: 'lesson',
        foreignField: '_id',
        as: 'lessonData'
      }
    },
    { $unwind: '$lessonData' },
    {
      $group: {
        _id: '$lessonData.category',
        totalLessons: { $sum: 1 },
        completedLessons: {
          $sum: { $cond: [{ $eq: ['$isCompleted', true] }, 1, 0] }
        },
        averageProgress: { $avg: '$completionPercentage' },
        totalPoints: { $sum: '$pointsEarned' }
      }
    },
    {
      $project: {
        category: '$_id',
        totalLessons: 1,
        completedLessons: 1,
        completionRate: {
          $round: [{ $multiply: [{ $divide: ['$completedLessons', '$totalLessons'] }, 100] }, 2]
        },
        averageProgress: { $round: ['$averageProgress', 2] },
        totalPoints: 1
      }
    }
  ]);
};

// Static method for parent dashboard
ProgressSchema.statics.getChildProgressSummary = async function(childId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await this.aggregate([
    { 
      $match: { 
        user: mongoose.Types.ObjectId(childId),
        updatedAt: { $gte: startDate }
      } 
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
        lessonsWatched: { $sum: 1 },
        lessonsCompleted: {
          $sum: { $cond: [{ $eq: ['$isCompleted', true] }, 1, 0] }
        },
        totalWatchTime: { $sum: '$watchTime' },
        averageEngagement: {
          $avg: {
            $add: [
              '$childEngagement.attentionLevel',
              '$childEngagement.enjoymentLevel',
              '$childEngagement.confidenceLevel'
            ]
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

module.exports = mongoose.model('Progress', ProgressSchema);