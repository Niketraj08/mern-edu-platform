/**
 * Student Dashboard Page
 * =======================
 * Shows enrolled courses, progress, and learning stats
 */

import { actions } from '../../store/store.js';
import { dashboardAPI } from '../../utils/api.js';
import { navigate } from '../../utils/router.js';

export default class StudentDashboardPage {
  constructor(context) {
    this.context = context;
  }

  async render(container) {
    this.el = container;
    this.renderSkeleton();

    try {
      const res = await dashboardAPI.student();
      this.renderDashboard(res.data);
    } catch (error) {
      this.renderError(error.message);
    }
  }

  renderSkeleton() {
    this.el.innerHTML = `
      <div class="page-header">
        <div>
          <div class="skeleton" style="width: 220px; height: 32px; margin-bottom: 8px;"></div>
          <div class="skeleton" style="width: 300px; height: 18px;"></div>
        </div>
      </div>
      <div class="stats-grid mb-xl">
        ${[1,2,3,4].map(() => `<div class="skeleton" style="height: 130px; border-radius: 16px;"></div>`).join('')}
      </div>
      <div class="skeleton" style="height: 360px; border-radius: 16px;"></div>
    `;
  }

  renderDashboard(data) {
    const { stats, enrolledCourses, recentActivity } = data;

    this.el.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">My Learning</h1>
          <p class="page-subtitle">Track your progress and continue learning</p>
        </div>
        <button class="btn btn-primary" onclick="navigate('/courses')">
          Browse Courses
        </button>
      </div>

      <!-- Stats -->
      <div class="stats-grid stagger-children mb-xl">
        ${this.statCard('Total Enrolled', stats.totalEnrolled, '📚', 'blue', `${stats.inProgress} in progress`)}
        ${this.statCard('Completed', stats.completed, '✅', 'green', 'courses finished')}
        ${this.statCard('In Progress', stats.inProgress, '🔥', 'amber', 'keep going!')}
        ${this.statCard('Avg Progress', `${stats.avgProgress}%`, '📈', 'purple', 'across all courses')}
      </div>

      <!-- Continue Learning -->
      ${recentActivity?.length > 0 ? `
      <div class="card mb-xl">
        <h3 style="margin-bottom: 20px;">Continue Learning</h3>
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${recentActivity.map((course) => `
            <div style="display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: 12px; background: var(--bg-elevated); cursor: pointer;"
                 onclick="navigate('/courses/${course._id}')">
              <div style="width: 56px; height: 56px; border-radius: 12px; background: var(--bg-overlay);
                           display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0;">
                📖
              </div>
              <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${course.title}
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">
                  ${course.instructor?.firstName || ''} ${course.instructor?.lastName || ''} · ${course.category}
                </div>
                <div class="progress-bar" style="width: 100%;">
                  <div class="progress-fill" style="width: ${course.progress || 0}%;"></div>
                </div>
              </div>
              <div style="text-align: right; flex-shrink: 0;">
                <div style="font-family: 'Syne', sans-serif; font-weight: 700; font-size: 1.25rem; color: var(--brand-400);">
                  ${course.progress || 0}%
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">complete</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- All Enrolled Courses -->
      <div class="card">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <h3 style="margin: 0;">All Enrolled Courses</h3>
          <button class="btn btn-ghost btn-sm" onclick="navigate('/student/my-courses')">View All →</button>
        </div>

        ${enrolledCourses?.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <h4 style="margin-bottom: 8px;">No courses yet</h4>
            <p style="margin-bottom: 16px;">Browse our catalog and enroll in your first course!</p>
            <button class="btn btn-primary" onclick="navigate('/courses')">Browse Courses</button>
          </div>
        ` : `
          <div class="courses-grid">
            ${enrolledCourses?.slice(0, 6).map((course) => `
              <div class="course-card" onclick="navigate('/courses/${course._id}')">
                <div class="course-card-thumb">📚</div>
                <div class="course-card-body">
                  <div class="course-card-meta">
                    <span class="badge badge-blue">${course.category}</span>
                    <div class="stars">★ ${course.averageRating?.toFixed(1) || '—'}</div>
                  </div>
                  <div class="course-card-title">${course.title}</div>
                  <div style="margin-top: 10px;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">
                      <span>Progress</span>
                      <span>${course.progress || 0}%</span>
                    </div>
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${course.progress || 0}%;"></div>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }

  statCard(label, value, icon, color, trend) {
    return `
      <div class="stat-card ${color}">
        <div class="stat-card-header">
          <div>
            <div class="stat-card-label">${label}</div>
            <div class="stat-card-value">${value}</div>
          </div>
          <div class="stat-card-icon ${color}">${icon}</div>
        </div>
        <div class="stat-card-trend up">↑ ${trend}</div>
      </div>
    `;
  }

  renderError(msg) {
    this.el.innerHTML = `
      <div class="page-loader">
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Failed to load</h3>
          <p>${msg}</p>
        </div>
      </div>
    `;
  }
}
