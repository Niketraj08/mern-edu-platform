/**
 * Course Controller
 * =================
 * Handles course CRUD, enrollment, search, and filtering
 * Role-based: Admin > Teacher > Student
 */

const Course = require('../models/Course');
const User = require('../models/User');
const { successResponse, errorResponse, getPaginationMeta } = require('../utils/apiResponse');
const { getIO } = require('../sockets/socketManager');

/**
 * @desc    Get all courses with search, filter, pagination
 * @route   GET /api/courses
 * @access  Public
 */
const getAllCourses = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      search = '',
      category,
      level,
      status = 'published',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      instructor,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = {};

    // Only admins can see all statuses
    if (req.user?.role === 'admin') {
      if (status !== 'all') filter.status = status;
    } else if (req.user?.role === 'teacher') {
      // Teachers see their own courses (any status) + all published
      filter.$or = [
        { instructor: req.user._id },
        { status: 'published' },
      ];
    } else {
      filter.status = 'published';
    }

    if (search) {
      filter.$text = { $search: search };
    }

    if (category) filter.category = category;
    if (level) filter.level = level;
    if (instructor) filter.instructor = instructor;

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate('instructor', 'firstName lastName avatar')
        .select('-modules -ratings -students')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Course.countDocuments(filter),
    ]);

    return successResponse(res, {
      statusCode: 200,
      message: 'Courses retrieved successfully.',
      data: { courses },
      meta: getPaginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single course by ID
 * @route   GET /api/courses/:id
 * @access  Public (limited data) | Enrolled (full data)
 */
const getCourseById = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'firstName lastName avatar bio')
      .populate('ratings.user', 'firstName lastName avatar');

    if (!course) {
      return errorResponse(res, { statusCode: 404, message: 'Course not found.' });
    }

    // Check if user is enrolled or is instructor
    let courseData = course.toObject();
    const userId = req.user?._id?.toString();
    const isInstructor = course.instructor._id.toString() === userId;
    const isAdmin = req.user?.role === 'admin';
    const isEnrolled = course.students.some(
      (s) => s.user.toString() === userId
    );

    // Remove lesson video URLs for non-enrolled users (except preview lessons)
    if (!isEnrolled && !isInstructor && !isAdmin) {
      courseData.modules = courseData.modules?.map((mod) => ({
        ...mod,
        lessons: mod.lessons.map((lesson) => ({
          ...lesson,
          videoUrl: lesson.isPreview ? lesson.videoUrl : null,
          resources: lesson.isPreview ? lesson.resources : [],
        })),
      }));
    }

    // Remove student list from non-admins
    if (!isAdmin) delete courseData.students;

    return successResponse(res, {
      statusCode: 200,
      message: 'Course retrieved successfully.',
      data: { course: courseData, isEnrolled, isInstructor },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new course
 * @route   POST /api/courses
 * @access  Admin | Teacher
 */
const createCourse = async (req, res, next) => {
  try {
    const { title, description, shortDescription, category, level, price, language, tags, thumbnail } = req.body;

    const course = await Course.create({
      title,
      description,
      shortDescription,
      category,
      level,
      price: price || 0,
      isFree: !price || price === 0,
      language: language || 'English',
      tags: tags || [],
      thumbnail,
      instructor: req.user._id,
      status: 'draft',
    });

    // Add to teacher's teaching courses
    await User.findByIdAndUpdate(req.user._id, {
      $push: { teachingCourses: course._id },
    });

    // Real-time notification to admin
    const io = getIO();
    io.to('room:admin').emit('course:created', {
      id: course._id,
      title: course.title,
      instructor: req.user.fullName,
    });

    return successResponse(res, {
      statusCode: 201,
      message: 'Course created successfully.',
      data: { course },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update course
 * @route   PUT /api/courses/:id
 * @access  Admin | Course Instructor
 */
const updateCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return errorResponse(res, { statusCode: 404, message: 'Course not found.' });
    }

    // Check ownership (teachers can only edit their own courses)
    const isOwner = course.instructor.toString() === req.user._id.toString();
    if (req.user.role !== 'admin' && !isOwner) {
      return errorResponse(res, {
        statusCode: 403,
        message: 'You can only edit your own courses.',
      });
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('instructor', 'firstName lastName avatar');

    return successResponse(res, {
      statusCode: 200,
      message: 'Course updated successfully.',
      data: { course: updatedCourse },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Publish / Unpublish a course
 * @route   PATCH /api/courses/:id/publish
 * @access  Admin | Course Instructor
 */
const togglePublishCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return errorResponse(res, { statusCode: 404, message: 'Course not found.' });
    }

    const isOwner = course.instructor.toString() === req.user._id.toString();
    if (req.user.role !== 'admin' && !isOwner) {
      return errorResponse(res, { statusCode: 403, message: 'Forbidden.' });
    }

    const isPublishing = course.status !== 'published';

    course.status = isPublishing ? 'published' : 'draft';
    course.isPublished = isPublishing;
    course.publishedAt = isPublishing ? new Date() : null;
    await course.save();

    return successResponse(res, {
      statusCode: 200,
      message: `Course ${isPublishing ? 'published' : 'unpublished'} successfully.`,
      data: { status: course.status, isPublished: course.isPublished },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Enroll in a course
 * @route   POST /api/courses/:id/enroll
 * @access  Student
 */
const enrollInCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return errorResponse(res, { statusCode: 404, message: 'Course not found.' });
    }

    if (course.status !== 'published') {
      return errorResponse(res, { statusCode: 400, message: 'This course is not available for enrollment.' });
    }

    // Check if already enrolled
    const alreadyEnrolled = course.students.some(
      (s) => s.user.toString() === req.user._id.toString()
    );

    if (alreadyEnrolled) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'You are already enrolled in this course.',
      });
    }

    // Add student to course
    course.students.push({ user: req.user._id });
    await course.save();

    // Add course to user's enrolled list
    await User.findByIdAndUpdate(req.user._id, {
      $push: { enrolledCourses: course._id },
    });

    // Notify instructor via socket
    const io = getIO();
    io.to(`user:${course.instructor}`).emit('course:newEnrollment', {
      studentName: req.user.fullName,
      courseTitle: course.title,
      totalStudents: course.students.length,
    });

    return successResponse(res, {
      statusCode: 200,
      message: `Successfully enrolled in "${course.title}"!`,
      data: { courseId: course._id },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete course (Admin only)
 * @route   DELETE /api/courses/:id
 * @access  Admin
 */
const deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return errorResponse(res, { statusCode: 404, message: 'Course not found.' });
    }

    // Remove from instructor's teaching list
    await User.findByIdAndUpdate(course.instructor, {
      $pull: { teachingCourses: course._id },
    });

    // Remove from all enrolled students' lists
    await User.updateMany(
      { enrolledCourses: course._id },
      { $pull: { enrolledCourses: course._id } }
    );

    await Course.findByIdAndDelete(req.params.id);

    return successResponse(res, {
      statusCode: 200,
      message: 'Course deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  togglePublishCourse,
  enrollInCourse,
  deleteCourse,
};
