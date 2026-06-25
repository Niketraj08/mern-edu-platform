/**
 * Admin Dashboard Page
 * =====================
 * Displays platform analytics:
 * - Key metrics stat cards
 * - Recent users table
 * - Recent courses list
 * - Real-time online user count
 */

import { store, actions, selectors } from '../../store/store.js';
import { dashboardAPI } from '../../utils/api.js';
import { showToast } from '../../utils/toast.js';
import { navigate } from '../../utils/router.js';
import { onSocketEvent } from '../../utils/socket.js';

export default class AdminDashboardPage {
  constructor(context) {
    this.context = context;
    this.el = null;
    this.cleanupFns = [];
  }

  async render(container) {
    this.el = container;

    // Show skeleton loading
    this.renderSkeleton();

    // Fetch dashboard data
    try {
      actions.dashboard.setLoading(true);
      const res = await dashboardAPI.admin();
      actions.dashboard.setData(res.data);
      this.renderDashboard(res.data);
    } catch (error) {
      this.renderError(error.message);
    } finally {
      actions.dashboard.setLoading(false);
    }

    // Real-time: update online count
    const unsub = onSocketEvent('presence:update', (data) => {
      const el = document.getElementById('online-count');
      if (el) el.textContent = data.onlineCount;
    });
    this.cleanupFns.push(unsub);

    // Real-time: new user registered
    const unsub2 = onSocketEvent('user:registered', (data) => {
      showToast('info', '👤 New User', `${data.name} just registered as ${data.role}`);
      // Refresh stats
      this.refreshStats();
    });
    this.cleanupFns.push(unsub2);
  }

  renderSkeleton() {
    this.el.innerHTML = `
      <div class="page-header">
        <div>
          <div class="skeleton" style="width: 200px; height: 32px; margin-bottom: 8px;"></div>
          <div class="skeleton" style="width: 280px; height: 18px;"></div>
        </div>
      </div>

      <div class="stats-grid stagger-children mb-xl">
        ${[1,2,3,4].map(() => `
          <div class="skeleton" style="height: 140px; border-radius: 16px;"></div>
        `).join('')}
      </div>

      <div class="content-grid">
        <div class="skeleton" style="height: 400px; border-radius: 16px;"></div>
        <div class="skeleton" style="height: 400px; border-radius: 16px;"></div>
      </div>
    `;
  }

  renderDashboard(data) {
    const { stats, recentUsers, recentCourses, categoryStats } = data;

    this.el.innerHTML = `
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Admin Dashboard</h1>
          <p class="page-subtitle">Platform overview and real-time analytics</p>
        </div>
        <div style="display: flex; gap: 12px; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: 8px; padding: 8px 14px;">
            <div class="online-dot pulse"></div>
            <span style="font-size: 0.825rem; color: var(--text-secondary);">
              <span id="online-count">—</span> online now
            </span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="navigate('/admin/users')">
            + Add User
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid stagger-children mb-xl">
        ${this.renderStatCard({
          label: 'Total Users',
          value: stats.users.total.toLocaleString(),
          icon: '👥',
          color: 'blue',
          trend: `+${stats.users.newThisWeek} this week`,
          trendUp: true,
        })}
        ${this.renderStatCard({
          label: 'Students',
          value: stats.users.students.toLocaleString(),
          icon: '🎓',
          color: 'green',
          trend: `${Math.round(stats.users.students / stats.users.total * 100)}% of users`,
          trendUp: true,
        })}
        ${this.renderStatCard({
          label: 'Total Courses',
          value: stats.courses.total.toLocaleString(),
          icon: '📚',
          color: 'purple',
          trend: `${stats.courses.published} published`,
          trendUp: true,
        })}
        ${this.renderStatCard({
          label: 'New This Month',
          value: stats.users.newThisMonth.toLocaleString(),
          icon: '📈',
          color: 'amber',
          trend: `${stats.users.newThisWeek} this week`,
          trendUp: stats.users.newThisMonth > 0,
        })}
      </div>

      <!-- Content Grid -->
      <div class="content-grid">

        <!-- Recent Users -->
        <div class="card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
            <h3 style="margin: 0;">Recent Users</h3>
            <button class="btn btn-ghost btn-sm" onclick="navigate('/admin/users')">View All →</button>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${recentUsers.map((user) => `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="avatar avatar-sm" style="background: linear-gradient(135deg, ${this.getRoleColor(user.role)}, ${this.getRoleColor(user.role)}aa);">
                          ${(user.firstName[0] + user.lastName[0]).toUpperCase()}
                        </div>
                        <div>
                          <div style="font-weight: 600; color: var(--text-primary); font-size: 0.875rem;">${user.firstName} ${user.lastName}</div>
                          <div style="font-size: 0.75rem; color: var(--text-muted);">${user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="badge badge-${this.getRoleBadgeColor(user.role)}">${user.role}</span>
                    </td>
                    <td style="font-size: 0.8rem;">${this.formatDate(user.createdAt)}</td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="width: 6px; height: 6px; border-radius: 50%; background: var(--accent-emerald);"></div>
                        <span style="font-size: 0.8rem; color: var(--accent-emerald);">Active</span>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Right Column -->
        <div style="display: flex; flex-direction: column; gap: 20px;">

          <!-- Category Breakdown -->
          <div class="card">
            <h3 style="margin-bottom: 16px;">Courses by Category</h3>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${categoryStats.map((cat, i) => `
                <div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span style="font-size: 0.825rem; font-weight: 500; color: var(--text-secondary); text-transform: capitalize;">${cat._id}</span>
                    <span style="font-size: 0.825rem; font-weight: 600; color: var(--text-primary);">${cat.count}</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min(100, (cat.count / categoryStats[0].count) * 100)}%;
                      background: ${['linear-gradient(90deg, #3b82f6, #06b6d4)',
                        'linear-gradient(90deg, #8b5cf6, #ec4899)',
                        'linear-gradient(90deg, #10b981, #06b6d4)',
                        'linear-gradient(90deg, #f59e0b, #f43f5e)',
                        'linear-gradient(90deg, #f43f5e, #fb7185)'][i % 5]}">
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Recent Courses -->
          <div class="card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <h3 style="margin: 0;">Recent Courses</h3>
              <button class="btn btn-ghost btn-sm" onclick="navigate('/admin/courses')">View All →</button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${recentCourses.map((course) => `
                <div style="display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 10px; background: var(--bg-elevated);">
                  <div style="width: 40px; height: 40px; border-radius: 10px; background: var(--bg-overlay); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0;">
                    📚
                  </div>
                  <div style="flex: 1; overflow: hidden;">
                    <div style="font-weight: 600; font-size: 0.825rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${course.title}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">by ${course.instructor?.firstName || ''} ${course.instructor?.lastName || ''}</div>
                  </div>
                  <span class="badge ${course.status === 'published' ? 'badge-green' : 'badge-amber'}">${course.status}</span>
                </div>
              `).join('')}
            </div>
          </div>

        </div>
      </div>
    `;
  }

  renderStatCard({ label, value, icon, color, trend, trendUp }) {
    return `
      <div class="stat-card ${color}">
        <div class="stat-card-header">
          <div>
            <div class="stat-card-label">${label}</div>
            <div class="stat-card-value">${value}</div>
          </div>
          <div class="stat-card-icon ${color}">${icon}</div>
        </div>
        <div class="stat-card-trend ${trendUp ? 'up' : 'down'}">
          <span>${trendUp ? '↑' : '↓'}</span>
          ${trend}
        </div>
      </div>
    `;
  }

  renderError(message) {
    this.el.innerHTML = `
      <div class="page-loader">
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Failed to load dashboard</h3>
          <p>${message}</p>
          <button class="btn btn-primary" style="margin-top: 1rem;" onclick="window.location.reload()">
            Retry
          </button>
        </div>
      </div>
    `;
  }

  async refreshStats() {
    try {
      const res = await dashboardAPI.admin();
      actions.dashboard.setData(res.data);
      // Re-render stats section only
      const statCards = this.el?.querySelector('.stats-grid');
      if (statCards && res.data.stats) {
        statCards.style.animation = 'fadeIn 0.3s ease';
      }
    } catch (e) {/* silent fail */}
  }

  getRoleColor(role) {
    return { admin: '#3b82f6', teacher: '#8b5cf6', student: '#10b981' }[role] || '#3b82f6';
  }

  getRoleBadgeColor(role) {
    return { admin: 'blue', teacher: 'purple', student: 'green' }[role] || 'gray';
  }

  formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  destroy() {
    this.cleanupFns.forEach((fn) => fn());
  }
}
