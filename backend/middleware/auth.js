/**
 * Authentication & Authorization Middleware
 * ==========================================
 * - protect: Verifies JWT access token
 * - authorize: Restricts access by role
 * - optionalAuth: Attaches user if token present
 */

const User = require('../models/User');
const { verifyAccessToken } = require('../utils/jwtHelper');
const { errorResponse } = require('../utils/apiResponse');

/**
 * PROTECT MIDDLEWARE
 * Verifies the Bearer JWT token from Authorization header
 * Attaches authenticated user to req.user
 *
 * Usage: router.get('/protected', protect, handler)
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // No token provided
    if (!token) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Authentication required. Please log in.',
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return errorResponse(res, {
          statusCode: 401,
          message: 'Session expired. Please log in again.',
        });
      }
      return errorResponse(res, {
        statusCode: 401,
        message: 'Invalid token. Please log in again.',
      });
    }

    // Find user from token payload
    const user = await User.findById(decoded.id).select('-password -refreshTokens');

    if (!user) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'User no longer exists.',
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return errorResponse(res, {
        statusCode: 403,
        message: 'Your account has been deactivated. Contact support.',
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, {
      statusCode: 500,
      message: 'Authentication error. Please try again.',
    });
  }
};

/**
 * AUTHORIZE MIDDLEWARE (Role-Based Access Control)
 * Restricts route access to specific roles
 *
 * Usage: router.delete('/admin-only', protect, authorize('admin'), handler)
 * Usage: router.get('/teachers', protect, authorize('admin', 'teacher'), handler)
 *
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // req.user must be set by protect middleware first
    if (!req.user) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(res, {
        statusCode: 403,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
      });
    }

    next();
  };
};

/**
 * OPTIONAL AUTH MIDDLEWARE
 * Attaches user to request if token is valid, but doesn't block if missing
 * Useful for public routes that show different content when authenticated
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        const user = await User.findById(decoded.id).select('-password -refreshTokens');
        if (user && user.isActive) {
          req.user = user;
        }
      } catch {
        // Invalid token - just skip, don't block
      }
    }

    next();
  } catch (error) {
    next(); // Never block on optional auth errors
  }
};

/**
 * SELF OR ADMIN MIDDLEWARE
 * Allows users to modify their own data, or admin to modify anyone's
 */
const selfOrAdmin = (req, res, next) => {
  const isAdmin = req.user?.role === 'admin';
  const isSelf = req.user?._id.toString() === req.params.id;

  if (!isAdmin && !isSelf) {
    return errorResponse(res, {
      statusCode: 403,
      message: 'You can only modify your own account.',
    });
  }

  next();
};

module.exports = { protect, authorize, optionalAuth, selfOrAdmin };
