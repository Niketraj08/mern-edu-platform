/**
 * Course Routes
 * @route /api/courses
 */
const express = require('express');
const router = express.Router();
const {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  togglePublishCourse,
  enrollInCourse,
  deleteCourse,
} = require('../controllers/courseController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { createCourseValidator, paginationValidator, objectIdValidator } = require('../middleware/validate');

// Public routes (with optional auth for personalization)
router.get('/', optionalAuth, paginationValidator, getAllCourses);
router.get('/:id', optionalAuth, objectIdValidator('id'), getCourseById);

// Protected: Teacher & Admin can create
router.post(
  '/',
  protect,
  authorize('admin', 'teacher'),
  createCourseValidator,
  createCourse
);

// Protected: Owner Teacher & Admin can update
router.put('/:id', protect, authorize('admin', 'teacher'), objectIdValidator('id'), updateCourse);
router.patch('/:id/publish', protect, authorize('admin', 'teacher'), objectIdValidator('id'), togglePublishCourse);

// Student enrollment
router.post('/:id/enroll', protect, authorize('student'), objectIdValidator('id'), enrollInCourse);

// Admin only
router.delete('/:id', protect, authorize('admin'), objectIdValidator('id'), deleteCourse);

module.exports = router;
