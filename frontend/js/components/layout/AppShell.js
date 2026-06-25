/**
 * Layout Components: Sidebar + Navbar
 * =====================================
 * Renders the main app shell with:
 * - Collapsible sidebar with role-based nav items
 * - Top navbar with search, notifications, theme toggle, user menu
 * - Responsive mobile sidebar
 */

import { store, actions, selectors } from '../../store/store.js';
import { navigate } from '../../utils/router.js';
import { authAPI } from '../../utils/api.js';
import { showToast } from '../../utils/toast.js';
import { disconnectSocket } from '../../utils/socket.js';

// ── Navigation items per role ───────────────────────────────
const NAV_CONFIG = {
  admin: [
    {
      section: 'Overview', items: [
        { path: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
      ]
    },
    {
      section: 'Management', items: [
        { path: '/admin/users', icon: '👥', label: 'Users' },
        { path: '/admin/courses', icon: '📚', label: 'Courses' },
      ]
    },
    {
      section: 'Account', items: [
        { path: '/profile', icon: '⚙️', label: 'Settings' },
      ]
    },
  ],
  teacher: [
    {
      section: 'Overview', items: [
        { path: '/teacher/dashboard', icon: '📊', label: 'Dashboard' },
      ]
    },
    {
      section: 'Teaching', items: [
        { path: '/teacher/courses', icon: '📚', label: 'My Courses' },
        { path: '/teacher/courses/create', icon: '➕', label: 'Create Course' },
      ]
    },
    {
      section: 'Browse', items: [
        { path: '/courses', icon: '🌐', label: 'All Courses' },
      ]
    },
    {
      section: 'Account', items: [
        { path: '/profile', icon: '⚙️', label: 'Settings' },
      ]
    },
  ],
  student: [
    {
      section: 'Overview', items: [
        { path: '/student/dashboard', icon: '📊', label: 'Dashboard' },
      ]
    },
    {
      section: 'Learning', items: [
        { path: '/student/my-courses', icon: '🎓', label: 'My Courses' },
        { path: '/courses', icon: '🌐', label: 'Browse Courses' },
      ]
    },
    {
      section: 'Account', items: [
        { path: '/profile', icon: '⚙️', label: 'Settings' },
      ]
    },
  ],
};

/**
 * Sidebar component
 */
export class Sidebar {
  constructor() {
    this.el = null;
    this.unsub = null;
    this.currentPath = window.location.hash.slice(1) || '/';

    // Update active state on route change
    window.addEventListener('hashchange', () => {
      this.currentPath = window.location.hash.slice(1) || '/';
      this.updateActiveItems();
    });
  }

  render(container) {
    const state = store.getState();
    const role = selectors.auth.role(state) || 'student';
    const collapsed = selectors.ui.sidebarCollapsed(state);
    const navConfig = NAV_CONFIG[role] || NAV_CONFIG.student;

    this.el = document.createElement('aside');
    this.el.className = `sidebar${collapsed ? ' collapsed' : ''}`;
    this.el.id = 'sidebar';
    this.el.setAttribute('role', 'navigation');
    this.el.setAttribute('aria-label', 'Main navigation');

    this.el.innerHTML = `
      <!-- Logo -->
      <div class="sidebar-logo">
        <div class="logo-icon">E</div>
        <span class="logo-text">EduPlatform</span>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav" id="sidebar-nav">
        ${navConfig.map((section) => `
          <div class="nav-section-label">${section.section}</div>
          ${section.items.map((item) => `
            <div class="nav-item${this.isActive(item.path) ? ' active' : ''}"
                 data-path="${item.path}"
                 role="menuitem"
                 tabindex="0"
                 aria-label="${item.label}">
              <span class="nav-icon" aria-hidden="true">${item.icon}</span>
              <span class="nav-label">${item.label}</span>
            </div>
          `).join('')}
        `).join('')}
      </nav>

      <!-- Footer: User info -->
      <div class="sidebar-footer">
        ${this.renderUserCard(state)}
      </div>
    `;

    container.appendChild(this.el);
    this.bindEvents();
    this.subscribeToStore();

    return this.el;
  }

  renderUserCard(state) {
    const user = selectors.auth.user(state);
    if (!user) return '';

    const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
    const roleColors = { admin: '#3b82f6', teacher: '#8b5cf6', student: '#10b981' };
    const bgColor = roleColors[user.role] || '#3b82f6';

    return `
      <div class="nav-item" data-path="/profile" style="padding: 10px; gap: 10px;">
        <div class="avatar avatar-sm" style="background: linear-gradient(135deg, ${bgColor}, ${bgColor}aa);">
          ${initials}
        </div>
        <div class="nav-label" style="overflow: hidden;">
          <div style="font-weight: 600; font-size: 0.8rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${user.firstName} ${user.lastName}
          </div>
          <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: capitalize;">
            ${user.role}
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Nav item clicks
    this.el.querySelectorAll('.nav-item[data-path]').forEach((item) => {
      item.addEventListener('click', () => {
        const path = item.dataset.path;
        navigate(path);
        // Close mobile sidebar on navigation
        actions.ui.closeMobileSidebar();
      });

      // Keyboard support
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          item.click();
        }
      });
    });
  }

  isActive(path) {
    return this.currentPath === path || this.currentPath.startsWith(path + '/');
  }

  updateActiveItems() {
    this.el?.querySelectorAll('.nav-item[data-path]').forEach((item) => {
      const path = item.dataset.path;
      item.classList.toggle('active', this.isActive(path));
    });
  }

  subscribeToStore() {
    this.unsub = store.select(selectors.ui.sidebarCollapsed, (collapsed) => {
      this.el?.classList.toggle('collapsed', collapsed);
    });
  }

  destroy() {
    this.unsub?.();
  }
}

/**
 * Navbar component
 */
export class Navbar {
  constructor() {
    this.el = null;
    this.notificationCount = 0;
    this.unsub = null;
  }

  render(container) {
    const state = store.getState();
    const user = selectors.auth.user(state);
    const theme = selectors.ui.theme(state);
    const collapsed = selectors.ui.sidebarCollapsed(state);

    this.el = document.createElement('header');
    this.el.className = `navbar${collapsed ? ' sidebar-collapsed' : ''}`;
    this.el.id = 'navbar';
    this.el.setAttribute('role', 'banner');

    this.el.innerHTML = `
      <div class="navbar-left">
        <!-- Mobile menu button -->
        <button class="sidebar-toggle" id="mobile-menu-btn" aria-label="Toggle menu">
          ☰
        </button>

        <!-- Desktop sidebar collapse -->
        <button class="sidebar-toggle" id="sidebar-toggle-btn" aria-label="Collapse sidebar">
          ◀
        </button>

        <!-- Search -->
        <div class="search-bar" role="search">
          <span aria-hidden="true">🔍</span>
          <input
            type="search"
            placeholder="Search courses, users..."
            id="global-search"
            autocomplete="off"
            aria-label="Global search"
          />
        </div>
      </div>

      <div class="navbar-right">
        <!-- Theme toggle -->
        <button class="theme-toggle" id="theme-toggle" title="Toggle theme" aria-label="Toggle dark/light mode">
          ${theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <!-- Notifications -->
        <button class="notification-btn" id="notification-btn" aria-label="Notifications">
          🔔
          <span class="notification-badge" id="notif-badge" style="display:none">0</span>
        </button>

        <!-- User menu -->
        <div class="dropdown" id="user-menu-wrapper">
          <button class="btn btn-ghost" id="user-menu-btn" style="gap: 8px; padding: 6px 10px;" aria-expanded="false" aria-haspopup="true">
            ${this.renderAvatar(user)}
            <span style="font-size: 0.85rem; font-weight: 600; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${user?.firstName || 'User'}
            </span>
            <span style="font-size: 0.7rem;">▼</span>
          </button>

          <div class="dropdown-menu" id="user-dropdown" style="display: none;" role="menu">
            <div style="padding: 8px 12px; border-bottom: 1px solid var(--border-subtle); margin-bottom: 4px;">
              <div style="font-weight: 600; font-size: 0.875rem; color: var(--text-primary);">
                ${user?.firstName} ${user?.lastName}
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${user?.email}</div>
            </div>
            <div class="dropdown-item" data-action="profile" role="menuitem">
              <span>👤</span> My Profile
            </div>
            <div class="dropdown-item" data-action="settings" role="menuitem">
              <span>⚙️</span> Settings
            </div>
            <div class="dropdown-divider" role="separator"></div>
            <div class="dropdown-item danger" data-action="logout" role="menuitem">
              <span>🚪</span> Sign Out
            </div>
          </div>
        </div>
      </div>
    `;

    container.appendChild(this.el);
    this.bindEvents();
    this.subscribeToStore();

    return this.el;
  }

  renderAvatar(user) {
    if (!user) return '<div class="avatar avatar-sm" style="background:#3b82f6">?</div>';

    const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
    const roleColors = { admin: '#3b82f6', teacher: '#8b5cf6', student: '#10b981' };
    const bg = roleColors[user.role] || '#3b82f6';

    return `
      <div class="avatar avatar-sm" style="background: linear-gradient(135deg, ${bg}, ${bg}cc);">
        ${initials}
      </div>
    `;
  }

  bindEvents() {
    // Desktop sidebar toggle
    this.el.querySelector('#sidebar-toggle-btn')?.addEventListener('click', () => {
      actions.ui.toggleSidebar();
    });

    // Mobile sidebar toggle
    this.el.querySelector('#mobile-menu-btn')?.addEventListener('click', () => {
      actions.ui.toggleMobileSidebar();
    });

    // Theme toggle
    this.el.querySelector('#theme-toggle')?.addEventListener('click', () => {
      actions.ui.toggleTheme();
    });

    // User dropdown
    const menuBtn = this.el.querySelector('#user-menu-btn');
    const dropdown = this.el.querySelector('#user-dropdown');

    menuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.style.display !== 'none';
      dropdown.style.display = isOpen ? 'none' : 'block';
      menuBtn.setAttribute('aria-expanded', !isOpen);
    });

    // Close dropdown on outside click
    document.addEventListener('click', () => {
      if (dropdown) dropdown.style.display = 'none';
    });

    // Dropdown items
    this.el.querySelectorAll('.dropdown-item[data-action]').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleMenuAction(item.dataset.action);
        dropdown.style.display = 'none';
      });
    });

    // Global search
    const searchInput = this.el.querySelector('#global-search');
    let searchTimeout;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const query = e.target.value.trim();
        if (query.length >= 2) {
          navigate(`/courses?search=${encodeURIComponent(query)}`);
        }
      }, 400);
    });
  }

  async handleMenuAction(action) {
    switch (action) {
      case 'profile':
        navigate('/profile');
        break;

      case 'settings':
        navigate('/profile');
        break;

      case 'logout':
        await this.handleLogout();
        break;
    }
  }

  async handleLogout() {
    try {
      const { refreshToken } = store.getState().auth;
      await authAPI.logout(refreshToken);
    } catch (e) {
      // Continue logout even if API fails
    } finally {
      // Clear everything
      disconnectSocket();
      actions.auth.logout();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      showToast('success', 'Signed Out', 'See you next time!');
      navigate('/login');
    }
  }

  subscribeToStore() {
    // Update theme toggle icon
    this.unsub = store.select(selectors.ui.theme, (theme) => {
      const btn = document.getElementById('theme-toggle');
      if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    });

    // Update notification badge
    store.select(selectors.ui.notifications, (notifications) => {
      const badge = document.getElementById('notif-badge');
      if (!badge) return;
      const count = notifications.length;
      badge.textContent = count > 9 ? '9+' : count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });

    // Update sidebar class on collapse
    store.select(selectors.ui.sidebarCollapsed, (collapsed) => {
      this.el?.classList.toggle('sidebar-collapsed', collapsed);
    });
  }

  destroy() {
    this.unsub?.();
  }
}

/**
 * Render the full app shell (sidebar + navbar + content wrapper)
 */
export const renderAppShell = () => {
  const state = store.getState();
  if (!selectors.auth.isAuthenticated(state)) return;

  // Create overlay for mobile
  let overlay = document.getElementById('sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.className = 'sidebar-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);

    overlay.addEventListener('click', () => {
      actions.ui.closeMobileSidebar();
    });
  }

  // Subscribe to mobile sidebar state
  store.select(selectors.ui.isMobileSidebarOpen, (isOpen) => {
    const sidebar = document.getElementById('sidebar');
    overlay.classList.toggle('active', isOpen);
    sidebar?.classList.toggle('mobile-open', isOpen);
  });

  // Create shell
  const shell = document.createElement('div');
  shell.className = 'app-shell';
  shell.id = 'app-shell';

  document.body.appendChild(shell);

  // Render sidebar
  const sidebar = new Sidebar();
  sidebar.render(shell);

  // Render navbar
  const navbar = new Navbar();
  navbar.render(document.body);

  // Create main content area
  const main = document.createElement('main');
  main.id = 'main-content';
  main.className = 'main-content';
  main.setAttribute('role', 'main');
  main.setAttribute('aria-label', 'Main content');
  document.body.appendChild(main);

  return { sidebar, navbar, main };
};
