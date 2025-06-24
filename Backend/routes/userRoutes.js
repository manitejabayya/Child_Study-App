// routes/userRoutes.js
const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserProgress,
  getUserAchievements,
  getUserBookmarks,
  updateAvatar,
  getUserStats
} = require('../Controllers/userController');

const { protect, authorize, checkOwnership } = require('../middlewares/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Admin only routes
router
  .route('/')
  .get(authorize('admin'), getUsers)
  .post(authorize('admin'), createUser);

router
  .route('/:id')
  .get(authorize('admin'), getUser)
  .put(authorize('admin'), updateUser)
  .delete(authorize('admin'), deleteUser);

// User-specific routes (user can access their own data, admin can access all)
router.get('/:id/progress', checkOwnership, getUserProgress);
router.get('/:id/achievements', checkOwnership, getUserAchievements);
router.get('/:id/bookmarks', checkOwnership, getUserBookmarks);
router.get('/:id/stats', checkOwnership, getUserStats);
router.put('/:id/avatar', checkOwnership, updateAvatar);

// Current user routes (shorthand for accessing own data)
router.get('/me/progress', getUserProgress);
router.get('/me/achievements', getUserAchievements);
router.get('/me/bookmarks', getUserBookmarks);
router.get('/me/stats', getUserStats);
router.put('/me/avatar', updateAvatar);

module.exports = router;