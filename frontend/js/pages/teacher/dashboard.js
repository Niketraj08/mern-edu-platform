/**
 * Teacher Dashboard Page
 * =======================
 * Shows teaching stats, course performance, and quick actions
 */

import { dashboardAPI } from '../../utils/api.js';
import { navigate } from '../../utils/router.js';
import { onSocketEvent } from '../../utils/socket.js';
import { showToast } from '../../utils/toast.js';

export default class TeacherDashboardPage {
  constructor(context) {
    this.context = context;
    this.cleanupFns = [];
  }

  async render(container) {
    this.el = container;
    this.renderSkeleton();

    try {
      const res = await dashboardAPI.teacher();
      this.renderDashboard(res.data);
    } catch (error) {
      this.renderError(error.message);
    }

    // Real-time: new enrollment
    const unsub = onSocketEvent('course:newEnrollment', (data) => {
      showToast('success', '🎉 New Student!', `${data.studentName} enrolled in "${data.courseTitle}"`);
      // Refresh stats
      this.refreshStats();
    });
    this.cleanupFns.push(unsub);
  }

  renderSkeleton() {
    this.el.innerHTML = `
      <div class="page-header">
        <div>
          <div class="skeleton" style="width: 200px; height: 32px; margin-bottom: 8px;"></div>
          <div class="skeleton" style="width: 260px; height: 18px;"></div>
        </div>
      </div>
      <div class="stats-grid mb-xl">
        ${[1,2,3,4].map(() => `<div class="skeleton" style="height: 130px; border-radius: 16px;"></div>`).join('')}
      </div>
      <div class="skeleton" style="height: 320px; border-radius: 16px;"></div>
    `;
  }

  renderDashboard(data) {
    const { stats, topCourses, allCourses } = data;

    this.el.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Teaching Dashboard</h1>
          <p class="page-subtitle">Manage your courses and track student progress</p>
        </div>
        <div style="display: flex; gap: 12px;">
          <button class="btn btn-secondary" onclick="navigate('/teacher/courses')">My Courses</button>
          <button class="btn btn-primary" onclick="navigate('/teacher/courses/create')">
            + Create Course
          </button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid stagger-children mb-xl">
        ${this.statCard('Total Courses', stats.totalCourses, '📚', 'blue', `${stats.publishedCourses} published`)}
        ${this.statCard('Total Students', stats.totalStudents, '👥', 'green', 'across all courses')}
        ${this.statCard('Avg Rating', stats.avgRating.toFixed(1) + ' ★', '⭐', 'amber', 'student ratings')}
        ${this.statCard('Draft Courses', stats.draftCourses, '✏️', 'purple', 'awaiting publish')}
      </div>

      <!-- Content Grid -->
      <div class="content-grid">

        <!-- Course Performance Table -->
        <div class="card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
            <h3 style="margin: 0;">Course Performance</h3>
            <button class="btn btn-ghost btn-sm" onclick="navigate('/teacher/courses')">Manage →</button>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Students</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${allCourses.slice(0, 8).map((course) => `
                  <tr>
                    <td>
                      <div style="font-weight: 600; color: var(--text-primary); font-size: 0.875rem; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${course.title}
                      </div>
                    </td>
                    <td>
                      <span style="font-weight: 600; color: var(--text-primary);">${course.enrollmentCount}</span>
                    </td>
                    <td>
                      <span style="color: var(--accent-amber);">★ ${course.averageRating?.toFixed(1) || '—'}</span>
                    </td>
                    <td>
                      <span class="badge ${course.status === 'published' ? 'badge-green' : 'badge-amber'}">
                        ${course.status}
                      </span>
                    </td>
                    <td>
                      <button class="btn btn-ghost btn-sm" onclick="navigate('/teacher/courses')">Edit</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Top Courses + Quick Actions -->
        <div style="display: flex; flex-direction: column; gap: 20px;">

          <!-- Quick Actions -->
          <div class="card">
            <h4 style="margin-bottom: 16px;">Quick Actions</h4>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <button class="btn btn-primary" onclick="navigate('/teacher/courses/create')" style="justify-content: flex-start; gap: 10px;">
                ➕ Create New Course
              </button>
              <button class="btn btn-secondary" onclick="navigate('/courses')" style="justify-content: flex-start; gap: 10px;">
                🌐 Browse All Courses
              </button>
              <button class="btn btn-secondary" onclick="navigate('/profile')" style="justify-content: flex-start; gap: 10px;">
                ⚙️ Edit Profile
              </button>
            </div>
          </div>

          <!-- Top Performing Courses -->
          <div class="card">
            <h4 style="margin-bottom: 16px;">Top Performing</h4>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${topCourses.slice(0, 4).map((course, i) => `
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
                              font-size: 0.75rem; font-weight: 700;
                              background: ${['rgba(59,130,246,0.2)','rgba(139,92,246,0.2)','rgba(16,185,129,0.2)','rgba(245,158,11,0.2)'][i]};
                              color: ${['#60a5fa','#a78bfa','#34d399','#fbbf24'][i]}; flex-shrink: 0;">
                    ${i + 1}
                  </div>
                  <div style="flex: 1; overflow: hidden;">
                    <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${course.title}
                    </div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">${course.enrollmentCount} students</div>
                  </div>
                  <span style="color: var(--accent-amber); font-size: 0.75rem; font-weight: 600;">★ ${course.averageRating?.toFixed(1) || '—'}</span>
                </div>
              `).join('')}
            </div>
          </div>

        </div>
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
          <h3>Failed to load dashboard</h3>
          <p>${msg}</p>
        </div>
      </div>
    `;
  }

  async refreshStats() {
    try {
      const res = await dashboardAPI.teacher();
      this.renderDashboard(res.data);
    } catch {}
  }

  destroy() {
    this.cleanupFns.forEach((fn) => fn());
  }
}
