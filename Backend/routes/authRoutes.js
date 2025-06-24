// routes/authRoutes.js
const express = require('express');
const {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  addAchievement
} = require('../Controllers/authController');

const { protect, loginRateLimit, checkAgeRestriction } = require('../middlewares/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', loginRateLimit, login);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

// Protected routes
router.get('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);
router.post('/achievement', protect, checkAgeRestriction, addAchievement);

module.exports = router;
