/**
 * User Routes
 * @route /api/users
 */
const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  changePassword,
  deleteUser,
  toggleUserStatus,
  getUserStats,
} = require('../controllers/userController');
const { protect, authorize, selfOrAdmin } = require('../middleware/auth');
const {
  updateProfileValidator,
  changePasswordValidator,
  paginationValidator,
  objectIdValidator,
} = require('../middleware/validate');

// All routes require authentication
router.use(protect);

// Admin-only routes
router.get('/', authorize('admin'), paginationValidator, getAllUsers);
router.get('/stats', authorize('admin'), getUserStats);
router.patch('/:id/toggle-status', authorize('admin'), objectIdValidator('id'), toggleUserStatus);
router.delete('/:id', authorize('admin'), objectIdValidator('id'), deleteUser);

// Self or Admin routes
router.get('/:id', objectIdValidator('id'), selfOrAdmin, getUserById);
router.put('/:id', objectIdValidator('id'), selfOrAdmin, updateProfileValidator, updateUser);
router.patch(
  '/:id/change-password',
  objectIdValidator('id'),
  selfOrAdmin,
  changePasswordValidator,
  changePassword
);

module.exports = router;
