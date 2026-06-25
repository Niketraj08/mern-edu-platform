/**
 * User Controller
 * ================
 * CRUD operations for user management
 * Admin: full access | Teacher/Student: own profile only
 */

const User = require('../models/User');
const { successResponse, errorResponse, getPaginationMeta } = require('../utils/apiResponse');

/**
 * @desc    Get all users (Admin only) with pagination, search, filter
 * @route   GET /api/users
 * @access  Admin
 */
const getAllUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build dynamic filter object
    const filter = {};

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (role && ['admin', 'teacher', 'student'].includes(role)) {
      filter.role = role;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Sort direction
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query with pagination
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -refreshTokens')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(filter),
    ]);

    return successResponse(res, {
      statusCode: 200,
      message: 'Users retrieved successfully.',
      data: { users },
      meta: getPaginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single user by ID
 * @route   GET /api/users/:id
 * @access  Admin | Self
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshTokens')
      .populate('enrolledCourses', 'title thumbnail category level averageRating')
      .populate('teachingCourses', 'title thumbnail category students status');

    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'User not found.',
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: 'User retrieved successfully.',
      data: { user: user.toSafeObject() },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/:id
 * @access  Admin | Self
 */
const updateUser = async (req, res, next) => {
  try {
    const { firstName, lastName, bio, phone, avatar } = req.body;

    // Admin can also update role and isActive
    const updateData = { firstName, lastName, bio, phone, avatar };

    if (req.user.role === 'admin') {
      if (req.body.role) updateData.role = req.body.role;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
    }

    // Remove undefined fields
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -refreshTokens');

    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'User not found.',
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: 'Profile updated successfully.',
      data: { user: user.toSafeObject() },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   PATCH /api/users/:id/change-password
 * @access  Self only
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.params.id).select('+password');

    if (!user) {
      return errorResponse(res, { statusCode: 404, message: 'User not found.' });
    }

    // Verify current password
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Current password is incorrect.',
      });
    }

    // Update password (hashing handled by pre-save hook)
    user.password = newPassword;
    await user.save();

    return successResponse(res, {
      statusCode: 200,
      message: 'Password changed successfully. Please log in again.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user (Admin only, or self-delete)
 * @route   DELETE /api/users/:id
 * @access  Admin
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return errorResponse(res, { statusCode: 404, message: 'User not found.' });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'You cannot delete your own admin account.',
      });
    }

    await User.findByIdAndDelete(req.params.id);

    return successResponse(res, {
      statusCode: 200,
      message: 'User deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle user active status (Admin only)
 * @route   PATCH /api/users/:id/toggle-status
 * @access  Admin
 */
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return errorResponse(res, { statusCode: 404, message: 'User not found.' });
    }

    user.isActive = !user.isActive;
    await user.save();

    return successResponse(res, {
      statusCode: 200,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully.`,
      data: { isActive: user.isActive },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user stats (Admin Dashboard)
 * @route   GET /api/users/stats
 * @access  Admin
 */
const getUserStats = async (req, res, next) => {
  try {
    const [total, students, teachers, admins, active, recent] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    return successResponse(res, {
      statusCode: 200,
      message: 'User statistics retrieved.',
      data: {
        total,
        byRole: { students, teachers, admins },
        active,
        inactive: total - active,
        newLast30Days: recent,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  changePassword,
  deleteUser,
  toggleUserStatus,
  getUserStats,
};
