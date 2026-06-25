/**
 * Auth Controller
 * ===============
 * Handles: Register, Login, Logout, Refresh Token, Get Me
 *
 * Authentication Flow:
 * 1. User registers → password hashed → user saved → tokens generated
 * 2. User logs in → password verified → access + refresh tokens returned
 * 3. Access token used for protected routes (15m expiry)
 * 4. Refresh token used to get new access token (7d expiry)
 * 5. Logout removes refresh token from DB
 */

const User = require('../models/User');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwtHelper');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { getIO } = require('../sockets/socketManager');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, {
        statusCode: 409,
        message: 'An account with this email already exists.',
      });
    }

    // Create new user (password hashed via pre-save hook in model)
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: role === 'teacher' ? 'teacher' : 'student', // Prevent admin role self-registration
    });

    // Generate token pair
    const { accessToken, refreshToken } = generateTokenPair(user);

    // Store refresh token in DB
    user.refreshTokens = [refreshToken];
    user.lastLogin = new Date();
    await user.save();

    // Emit new user event to admin sockets
    const io = getIO();
    io.to('room:admin').emit('user:registered', {
      id: user._id,
      name: user.fullName,
      role: user.role,
      email: user.email,
    });

    return successResponse(res, {
      statusCode: 201,
      message: 'Account created successfully. Welcome!',
      data: {
        user: user.toSafeObject(),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with password field (normally excluded)
    const user = await User.findByEmailWithPassword(email);

    if (!user) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Invalid email or password.',
      });
    }

    // Check account is active
    if (!user.isActive) {
      return errorResponse(res, {
        statusCode: 403,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Invalid email or password.',
      });
    }

    // Generate new token pair
    const { accessToken, refreshToken } = generateTokenPair(user);

    // Store refresh token (keep last 5 sessions for multi-device)
    const tokens = user.refreshTokens || [];
    tokens.push(refreshToken);
    if (tokens.length > 5) tokens.shift(); // Remove oldest if > 5

    user.refreshTokens = tokens;
    user.lastLogin = new Date();
    await user.save();

    // Remove password from response
    const safeUser = user.toSafeObject();

    return successResponse(res, {
      statusCode: 200,
      message: `Welcome back, ${user.firstName}!`,
      data: {
        user: safeUser,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh access token using refresh token
 * @route   POST /api/auth/refresh
 * @access  Public (requires valid refresh token)
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Refresh token is required.',
      });
    }

    // Verify refresh token signature
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Invalid or expired refresh token. Please log in again.',
      });
    }

    // Find user and check if refresh token is stored
    const user = await User.findById(decoded.id).select('+refreshTokens');

    if (!user || !user.refreshTokens.includes(token)) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Refresh token not recognized. Please log in again.',
      });
    }

    // Generate new token pair (token rotation for security)
    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user);

    // Replace old refresh token with new one
    user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    return successResponse(res, {
      statusCode: 200,
      message: 'Token refreshed successfully.',
      data: { accessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user (invalidate refresh token)
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (token) {
      // Remove specific refresh token (logout from this device only)
      const user = await User.findById(req.user._id).select('+refreshTokens');
      if (user) {
        user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
        await user.save();
      }
    }

    return successResponse(res, {
      statusCode: 200,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout from all devices
 * @route   POST /api/auth/logout-all
 * @access  Private
 */
const logoutAll = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+refreshTokens');
    user.refreshTokens = [];
    await user.save();

    return successResponse(res, {
      statusCode: 200,
      message: 'Logged out from all devices successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current authenticated user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    // User is already attached to req by protect middleware
    const user = await User.findById(req.user._id)
      .populate('enrolledCourses', 'title thumbnail status')
      .populate('teachingCourses', 'title thumbnail students');

    return successResponse(res, {
      statusCode: 200,
      message: 'User data retrieved successfully.',
      data: { user: user.toSafeObject() },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, refreshToken, logout, logoutAll, getMe };
