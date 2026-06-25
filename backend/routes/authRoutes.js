/**
 * Auth Routes
 * @route /api/auth
 */
const express = require('express');
const router = express.Router();
const {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { registerValidator, loginValidator } = require('../middleware/validate');

// Public routes
router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);
router.post('/refresh', refreshToken);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.post('/logout-all', protect, logoutAll);

module.exports = router;
