/**
 * Course Model
 * Represents educational courses with full metadata,
 * curriculum structure, and enrollment tracking
 */

const mongoose = require('mongoose');

// Sub-schema for course lessons/modules
const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Lesson title is required'],
    trim: true,
  },
  description: { type: String, default: '' },
  duration: { type: Number, default: 0 }, // in minutes
  videoUrl: { type: String, default: null },
  resources: [{ name: String, url: String }],
  order: { type: Number, required: true },
  isPreview: { type: Boolean, default: false },
});

const moduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Module title is required'],
    trim: true,
  },
  description: { type: String, default: '' },
  order: { type: Number, required: true },
  lessons: [lessonSchema],
});

const courseSchema = new mongoose.Schema(
  {
    // ── Core Info ─────────────────────────────────────
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Course description is required'],
      minlength: [20, 'Description must be at least 20 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    shortDescription: {
      type: String,
      maxlength: [200, 'Short description cannot exceed 200 characters'],
    },
    thumbnail: {
      type: String,
      default: null,
    },

    // ── Classification ────────────────────────────────
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'programming',
        'mathematics',
        'science',
        'language',
        'art',
        'business',
        'other',
      ],
    },
    tags: [{ type: String, lowercase: true, trim: true }],
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    language: {
      type: String,
      default: 'English',
    },

    // ── Instructor & Enrollment ───────────────────────
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Instructor is required'],
    },
    students: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        enrolledAt: { type: Date, default: Date.now },
        progress: { type: Number, default: 0, min: 0, max: 100 },
        completedLessons: [String],
      },
    ],

    // ── Pricing ───────────────────────────────────────
    price: {
      type: Number,
      default: 0,
      min: [0, 'Price cannot be negative'],
    },
    isFree: {
      type: Boolean,
      default: true,
    },

    // ── Curriculum ────────────────────────────────────
    modules: [moduleSchema],

    // ── Statistics ────────────────────────────────────
    totalDuration: { type: Number, default: 0 }, // minutes
    totalLessons: { type: Number, default: 0 },

    // ── Ratings ───────────────────────────────────────
    ratings: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rating: { type: Number, min: 1, max: 5 },
        review: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },

    // ── Status ────────────────────────────────────────
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────────────
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });
courseSchema.index({ instructor: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ status: 1 });
courseSchema.index({ slug: 1 });
courseSchema.index({ createdAt: -1 });

// ── Virtuals ───────────────────────────────────────────
courseSchema.virtual('enrollmentCount').get(function () {
  return this.students?.length || 0;
});

// ── Pre-save: Generate slug ────────────────────────────
courseSchema.pre('save', function (next) {
  if (this.isModified('title') || this.isNew) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-') + '-' + Date.now();
  }
  next();
});

// ── Pre-save: Compute stats ────────────────────────────
courseSchema.pre('save', function (next) {
  let totalLessons = 0;
  let totalDuration = 0;

  if (this.modules && this.modules.length > 0) {
    this.modules.forEach((mod) => {
      if (mod.lessons) {
        totalLessons += mod.lessons.length;
        mod.lessons.forEach((lesson) => {
          totalDuration += lesson.duration || 0;
        });
      }
    });
  }

  this.totalLessons = totalLessons;
  this.totalDuration = totalDuration;

  // Compute average rating
  if (this.ratings && this.ratings.length > 0) {
    const sum = this.ratings.reduce((acc, r) => acc + r.rating, 0);
    this.averageRating = Math.round((sum / this.ratings.length) * 10) / 10;
    this.totalRatings = this.ratings.length;
  }

  next();
});

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
