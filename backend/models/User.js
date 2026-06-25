/**
 * User Model
 * Handles authentication data, roles, and profile
 * Includes bcrypt hashing via pre-save hook
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // ── Basic Info ────────────────────────────────────
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,10})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never return password in queries by default
    },

    // ── Role & Permissions ────────────────────────────
    role: {
      type: String,
      enum: {
        values: ['admin', 'teacher', 'student'],
        message: 'Role must be admin, teacher, or student',
      },
      default: 'student',
    },

    // ── Profile ───────────────────────────────────────
    avatar: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: '',
    },
    phone: {
      type: String,
      match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number'],
      default: null,
    },

    // ── Academic Data ─────────────────────────────────
    enrolledCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
    ],
    teachingCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
    ],

    // ── Account Status ────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },

    // ── Token Management ──────────────────────────────
    refreshTokens: {
      type: [String],
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpire: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true, // Adds createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtual Fields ──────────────────────────────────────
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('courseCount').get(function () {
  if (this.role === 'student') return this.enrolledCourses?.length || 0;
  if (this.role === 'teacher') return this.teachingCourses?.length || 0;
  return 0;
});

// ── Indexes ────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// ── Pre-save Middleware: Hash password ─────────────────
userSchema.pre('save', async function (next) {
  // Only hash if password was modified
  if (!this.isModified('password')) return next();

  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// ── Instance Methods ───────────────────────────────────

/**
 * Compare entered password with hashed password
 * @param {string} candidatePassword - Plain text password to verify
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Return safe user object (no sensitive fields)
 */
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpire;
  delete obj.__v;
  return obj;
};

// ── Static Methods ────────────────────────────────────

/**
 * Find user by email including password field
 */
userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email }).select('+password +refreshTokens');
};

const User = mongoose.model('User', userSchema);

module.exports = User;
