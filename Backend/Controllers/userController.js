// controllers/userController.js
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const User = require('../models/User');
const Progress = require('../models/Progress');
const Lesson = require('../models/Lessons');

// @desc    Get all users (Admin only)
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find({ role: 'child' })
    .select('-password')
    .populate('achievements')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private/Admin
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('achievements');

  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Create user
// @route   POST /api/v1/users
// @access  Private/Admin
exports.createUser = asyncHandler(async (req, res, next) => {
  const user = await User.create(req.body);

  res.status(201).json({
    success: true,
    data: user
  });
});

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get user's progress
// @route   GET /api/v1/users/:id/progress
// @access  Private
exports.getUserProgress = asyncHandler(async (req, res, next) => {
  const userId = req.params.id || req.user.id;
  
  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${userId}`, 404));
  }

  const progress = await Progress.find({ user: userId })
    .populate('lesson', 'title category difficulty level points thumbnail')
    .sort({ lastWatchedAt: -1 });

  // Calculate statistics
  const totalLessons = await Lesson.countDocuments({ isActive: true });
  const completedLessons = progress.filter(p => p.isCompleted).length;
  const inProgressLessons = progress.filter(p => p.status === 'in_progress').length;
  const totalWatchTime = progress.reduce((sum, p) => sum + p.watchTime, 0);
  const averageRating = progress.filter(p => p.rating).length > 0 
    ? progress.reduce((sum, p) => sum + (p.rating || 0), 0) / progress.filter(p => p.rating).length 
    : 0;

  res.status(200).json({
    success: true,
    data: {
      progress,
      statistics: {
        totalLessons,
        completedLessons,
        inProgressLessons,
        completionRate: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        totalWatchTime: Math.round(totalWatchTime / 60), // in minutes
        averageRating: Math.round(averageRating * 10) / 10
      }
    }
  });
});

// @desc    Get user's achievements
// @route   GET /api/v1/users/:id/achievements
// @access  Private
exports.getUserAchievements = asyncHandler(async (req, res, next) => {
  const userId = req.params.id || req.user.id;
  
  const user = await User.findById(userId).select('achievements totalPoints level');
  
  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${userId}`, 404));
  }

  res.status(200).json({
    success: true,
    data: {
      achievements: user.achievements,
      totalPoints: user.totalPoints,
      level: user.level
    }
  });
});

// @desc    Get user's bookmarked lessons
// @route   GET /api/v1/users/:id/bookmarks
// @access  Private
exports.getUserBookmarks = asyncHandler(async (req, res, next) => {
  const userId = req.params.id || req.user.id;
  
  const bookmarks = await Progress.find({ 
    user: userId, 
    bookmarked: true 
  })
    .populate('lesson', 'title description category difficulty level thumbnail videoId duration')
    .sort({ updatedAt: -1 });

  res.status(200).json({
    success: true,
    count: bookmarks.length,
    data: bookmarks
  });
});

// @desc    Update user's avatar
// @route   PUT /api/v1/users/:id/avatar
// @access  Private
exports.updateAvatar = asyncHandler(async (req, res, next) => {
  const userId = req.params.id || req.user.id;
  const { avatar } = req.body;

  if (!avatar) {
    return next(new ErrorResponse('Please provide an avatar', 400));
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { avatar },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${userId}`, 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Get user's learning statistics
// @route   GET /api/v1/users/:id/stats
// @access  Private
exports.getUserStats = asyncHandler(async (req, res, next) => {
  const userId = req.params.id || req.user.id;
  
  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${userId}`, 404));
  }

  // Get progress data
  const progress = await Progress.find({ user: userId })
    .populate('lesson', 'category difficulty points');

  // Calculate category-wise progress
  const categoryStats = {};
  const difficultyStats = { easy: 0, medium: 0, hard: 0 };
  let totalPointsFromLessons = 0;

  progress.forEach(p => {
    if (p.lesson) {
      const category = p.lesson.category;
      const difficulty = p.lesson.difficulty;
      
      if (!categoryStats[category]) {
        categoryStats[category] = { completed: 0, total: 0, points: 0 };
      }
      
      categoryStats[category].total++;
      if (p.isCompleted) {
        categoryStats[category].completed++;
        categoryStats[category].points += p.pointsEarned;
        difficultyStats[difficulty]++;
        totalPointsFromLessons += p.pointsEarned;
      }
    }
  });

  // Calculate weekly progress
  const weeklyProgress = await getWeeklyProgress(userId);

  res.status(200).json({
    success: true,
    data: {
      user: {
        name: user.name,
        level: user.level,
        totalPoints: user.totalPoints,
        streakDays: user.streakDays,
        avatar: user.avatar
      },
      categoryStats,
      difficultyStats,
      weeklyProgress,
      totalPointsFromLessons
    }
  });
});

// Helper function to get weekly progress
const getWeeklyProgress = async (userId) => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const dailyProgress = await Progress.aggregate([
    {
      $match: {
        user: userId,
        completedAt: { $gte: oneWeekAgo },
        isCompleted: true
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$completedAt" }
        },
        lessonsCompleted: { $sum: 1 },
        pointsEarned: { $sum: "$pointsEarned" }
      }
    },
    {
      $sort: { "_id": 1 }
    }
  ]);

  // Fill in missing days with 0
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    
    const dayData = dailyProgress.find(d => d._id === dateString);
    result.push({
      date: dateString,
      lessonsCompleted: dayData ? dayData.lessonsCompleted : 0,
      pointsEarned: dayData ? dayData.pointsEarned : 0
    });
  }

  return result;
};