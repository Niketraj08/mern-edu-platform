/**
 * Dashboard Routes
 * @route /api/dashboard
 */
const express = require('express');
const router = express.Router();
const {
  getAdminDashboard,
  getTeacherDashboard,
  getStudentDashboard,
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All dashboard routes require auth

router.get('/admin', authorize('admin'), getAdminDashboard);
router.get('/teacher', authorize('admin', 'teacher'), getTeacherDashboard);
router.get('/student', authorize('admin', 'student'), getStudentDashboard);

module.exports = router;
