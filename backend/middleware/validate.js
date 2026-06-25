/**
 * Input Validation Middleware
 * ============================
 * Uses express-validator to define and run validation rules
 * Centralizes validation logic away from controllers
 */

const { body, param, query, validationResult } = require('express-validator');
const { errorResponse } = require('../utils/apiResponse');

/**
 * Handle validation result
 * Run this AFTER validator chains in route definitions
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    return errorResponse(res, {
      statusCode: 422,
      message: 'Validation failed. Please check your input.',
      errors: formattedErrors,
    });
  }

  next();
};

// ── AUTH VALIDATORS ────────────────────────────────────

const registerValidator = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2–50 characters'),

  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2–50 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),

  body('role')
    .optional()
    .isIn(['student', 'teacher']).withMessage('Role must be student or teacher'),

  handleValidationErrors,
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),

  handleValidationErrors,
];

// ── USER VALIDATORS ────────────────────────────────────

const updateProfileValidator = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2–50 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2–50 characters'),

  body('bio')
    .optional()
    .isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),

  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Please provide a valid phone number'),

  handleValidationErrors,
];

const changePasswordValidator = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),

  body('confirmPassword')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  handleValidationErrors,
];

// ── COURSE VALIDATORS ──────────────────────────────────

const createCourseValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('Course title is required')
    .isLength({ min: 5, max: 100 }).withMessage('Title must be 5–100 characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 20, max: 2000 }).withMessage('Description must be 20–2000 characters'),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['programming', 'mathematics', 'science', 'language', 'art', 'business', 'other'])
    .withMessage('Invalid category'),

  body('level')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid level'),

  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),

  handleValidationErrors,
];

// ── QUERY VALIDATORS ───────────────────────────────────

const paginationValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),

  handleValidationErrors,
];

const objectIdValidator = (paramName = 'id') => [
  param(paramName)
    .isMongoId().withMessage(`Invalid ${paramName} format`),

  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  registerValidator,
  loginValidator,
  updateProfileValidator,
  changePasswordValidator,
  createCourseValidator,
  paginationValidator,
  objectIdValidator,
};
