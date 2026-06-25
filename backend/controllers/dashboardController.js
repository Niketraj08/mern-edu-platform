/**
 * Dashboard Controller
 * =====================
 * Analytics and summary data for different roles:
 * - Admin: Platform-wide stats
 * - Teacher: Teaching stats
 * - Student: Learning progress
 */

const User = require('../models/User');
const Course = require('../models/Course');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * @desc    Get admin dashboard analytics
 * @route   GET /api/dashboard/admin
 * @access  Admin
 */
const getAdminDashboard = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Parallel queries for performance
    const [
      totalUsers,
      totalStudents,
      totalTeachers,
      totalCourses,
      publishedCourses,
      draftCourses,
      newUsersThisMonth,
      newUsersThisWeek,
      recentUsers,
      recentCourses,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
      Course.countDocuments(),
      Course.countDocuments({ status: 'published' }),
      Course.countDocuments({ status: 'draft' }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      User.find().sort({ createdAt: -1 }).limit(5).select('firstName lastName email role createdAt avatar'),
      Course.find().sort({ createdAt: -1 }).limit(5)
        .select('title category status instructor createdAt')
        .populate('instructor', 'firstName lastName'),
    ]);

    // Monthly enrollment trend (last 6 months)
    const enrollmentTrend = await Course.aggregate([
      { $unwind: '$students' },
      {
        $group: {
          _id: {
            year: { $year: '$students.enrolledAt' },
            month: { $month: '$students.enrolledAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 6 },
    ]);

    // Category distribution
    const categoryStats = await Course.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return successResponse(res, {
      statusCode: 200,
      message: 'Admin dashboard data retrieved.',
      data: {
        stats: {
          users: {
            total: totalUsers,
            students: totalStudents,
            teachers: totalTeachers,
            newThisMonth: newUsersThisMonth,
            newThisWeek: newUsersThisWeek,
          },
          courses: {
            total: totalCourses,
            published: publishedCourses,
            drafts: draftCourses,
          },
        },
        recentUsers,
        recentCourses,
        enrollmentTrend,
        categoryStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get teacher dashboard data
 * @route   GET /api/dashboard/teacher
 * @access  Teacher | Admin
 */
const getTeacherDashboard = async (req, res, next) => {
  try {
    const teacherId = req.user._id;

    const courses = await Course.find({ instructor: teacherId })
      .select('title status students averageRating totalLessons createdAt thumbnail category');

    const totalCourses = courses.length;
    const publishedCourses = courses.filter((c) => c.status === 'published').length;
    const totalStudents = courses.reduce((acc, c) => acc + (c.students?.length || 0), 0);
    const avgRating = courses.length > 0
      ? (courses.reduce((acc, c) => acc + c.averageRating, 0) / courses.length).toFixed(1)
      : 0;

    // Top performing courses by enrollment
    const topCourses = courses
      .sort((a, b) => (b.students?.length || 0) - (a.students?.length || 0))
      .slice(0, 5)
      .map((c) => ({
        _id: c._id,
        title: c.title,
        thumbnail: c.thumbnail,
        category: c.category,
        status: c.status,
        enrollmentCount: c.students?.length || 0,
        averageRating: c.averageRating,
      }));

    return successResponse(res, {
      statusCode: 200,
      message: 'Teacher dashboard data retrieved.',
      data: {
        stats: {
          totalCourses,
          publishedCourses,
          draftCourses: totalCourses - publishedCourses,
          totalStudents,
          avgRating: parseFloat(avgRating),
        },
        topCourses,
        allCourses: courses.map((c) => ({
          _id: c._id,
          title: c.title,
          status: c.status,
          enrollmentCount: c.students?.length || 0,
          averageRating: c.averageRating,
          createdAt: c.createdAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student dashboard data
 * @route   GET /api/dashboard/student
 * @access  Student | Admin
 */
const getStudentDashboard = async (req, res, next) => {
  try {
    const student = await User.findById(req.user._id)
      .populate({
        path: 'enrolledCourses',
        select: 'title thumbnail category level instructor averageRating totalLessons',
        populate: { path: 'instructor', select: 'firstName lastName avatar' },
      });

    if (!student) {
      return errorResponse(res, { statusCode: 404, message: 'Student not found.' });
    }

    const enrolledCourses = student.enrolledCourses || [];

    // Get progress data from course.students
    const courseIds = enrolledCourses.map((c) => c._id);
    const coursesWithProgress = await Course.find(
      { _id: { $in: courseIds } },
      { 'students.$': 1, title: 1 }
    ).lean();

    const progressMap = {};
    coursesWithProgress.forEach((c) => {
      const studentEntry = c.students?.find(
        (s) => s.user.toString() === req.user._id.toString()
      );
      progressMap[c._id] = studentEntry?.progress || 0;
    });

    const totalEnrolled = enrolledCourses.length;
    const completed = Object.values(progressMap).filter((p) => p === 100).length;
    const avgProgress = totalEnrolled > 0
      ? Math.round(Object.values(progressMap).reduce((a, b) => a + b, 0) / totalEnrolled)
      : 0;

    const enrichedCourses = enrolledCourses.map((course) => ({
      ...course.toObject(),
      progress: progressMap[course._id] || 0,
    }));

    return successResponse(res, {
      statusCode: 200,
      message: 'Student dashboard data retrieved.',
      data: {
        stats: {
          totalEnrolled,
          completed,
          inProgress: totalEnrolled - completed,
          avgProgress,
        },
        enrolledCourses: enrichedCourses,
        recentActivity: enrichedCourses.slice(0, 3),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAdminDashboard, getTeacherDashboard, getStudentDashboard };
