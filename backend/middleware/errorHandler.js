/**
 * Global Error Handler Middleware
 * ================================
 * Catches all errors thrown in the application
 * Returns standardized error responses
 * Must be registered LAST in Express middleware chain
 */

const { errorResponse } = require('../utils/apiResponse');

/**
 * Custom Application Error class
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Distinguish from programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle Mongoose CastError (invalid ObjectId)
 */
const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * Handle Mongoose Duplicate Key Error (code 11000)
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists. Please use a different value.`;
  return new AppError(message, 409);
};

/**
 * Handle Mongoose Validation Error
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Validation failed: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * Handle JWT Errors
 */
const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401);

const handleJWTExpiredError = () =>
  new AppError('Your session has expired. Please log in again.', 401);

/**
 * GLOBAL ERROR HANDLER
 * Express recognizes 4-parameter functions as error handlers
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error details in development
  if (process.env.NODE_ENV === 'development') {
    console.error('━━━━━━ ERROR ━━━━━━');
    console.error('Status:', error.statusCode);
    console.error('Message:', error.message);
    console.error('Stack:', err.stack);
    console.error('━━━━━━━━━━━━━━━━━━━');
  } else {
    // Production: only log server errors
    if (error.statusCode >= 500) {
      console.error('SERVER ERROR:', err);
    }
  }

  // ── Specific Error Types ────────────────────────────

  // Mongoose - Bad ObjectId
  if (err.name === 'CastError') error = handleCastError(err);

  // MongoDB - Duplicate key
  if (err.code === 11000) error = handleDuplicateKeyError(err);

  // Mongoose - Validation failed
  if (err.name === 'ValidationError') error = handleValidationError(err);

  // JWT - Invalid token
  if (err.name === 'JsonWebTokenError') error = handleJWTError();

  // JWT - Expired token
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  // ── Send Response ───────────────────────────────────

  // Operational errors: send specific message
  if (error.isOperational || err.isOperational) {
    return errorResponse(res, {
      statusCode: error.statusCode,
      message: error.message,
    });
  }

  // Programming / unknown errors: send generic message
  return errorResponse(res, {
    statusCode: 500,
    message: process.env.NODE_ENV === 'development'
      ? error.message
      : 'Something went wrong. Please try again.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
module.exports.AppError = AppError;
