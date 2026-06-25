/**
 * Client-Side Router
 * ===================
 * Hash-based SPA router with:
 * - Protected routes by authentication
 * - Role-based route access
 * - Dynamic rendering
 * - 404 handling
 */

import { store } from '../store/store.js';

// ── Route definitions ───────────────────────────────────────
const routes = [
  // Public routes
  { path: '/login',    page: 'auth/login',    public: true },
  { path: '/register', page: 'auth/register', public: true },

  // Protected routes - all authenticated users
  { path: '/',         page: 'dashboard',     auth: true },
  { path: '/profile',  page: 'profile',       auth: true },
  { path: '/courses',  page: 'courses/list',  auth: true },
  { path: '/courses/:id', page: 'courses/detail', auth: true },

  // Admin-only routes
  { path: '/admin/dashboard', page: 'admin/dashboard', auth: true, roles: ['admin'] },
  { path: '/admin/users',     page: 'admin/users',     auth: true, roles: ['admin'] },
  { path: '/admin/courses',   page: 'admin/courses',   auth: true, roles: ['admin'] },

  // Teacher routes
  { path: '/teacher/dashboard',       page: 'teacher/dashboard',     auth: true, roles: ['teacher', 'admin'] },
  { path: '/teacher/courses',         page: 'teacher/courses',       auth: true, roles: ['teacher', 'admin'] },
  { path: '/teacher/courses/create',  page: 'teacher/course-create', auth: true, roles: ['teacher', 'admin'] },

  // Student routes
  { path: '/student/dashboard',  page: 'student/dashboard', auth: true, roles: ['student', 'admin'] },
  { path: '/student/my-courses', page: 'student/my-courses', auth: true, roles: ['student', 'admin'] },

  // 404
  { path: '/404', page: '404', public: true },
];

/**
 * Match a URL path against a route pattern
 * Supports :param style dynamic segments
 */
const matchRoute = (routePath, currentPath) => {
  const routeParts = routePath.split('/').filter(Boolean);
  const currentParts = currentPath.split('/').filter(Boolean);

  if (routeParts.length !== currentParts.length) return null;

  const params = {};

  for (let i = 0; i < routeParts.length; i++) {
    if (routeParts[i].startsWith(':')) {
      params[routeParts[i].slice(1)] = currentParts[i];
    } else if (routeParts[i] !== currentParts[i]) {
      return null;
    }
  }

  return params;
};

/**
 * Router class
 */
class Router {
  constructor() {
    this.currentPage = null;
    this.pageCache = new Map();
    this.beforeNavigate = null;
    this.afterNavigate = null;

    // Listen for hash changes
    window.addEventListener('hashchange', () => this.navigate());
    window.addEventListener('load', () => this.navigate());
  }

  /**
   * Navigate to the current hash route
   */
  async navigate() {
    const hash = window.location.hash.slice(1) || '/';
    const path = hash.split('?')[0];
    const queryString = hash.split('?')[1] || '';
    const queryParams = Object.fromEntries(new URLSearchParams(queryString));

    // Find matching route
    let matchedRoute = null;
    let routeParams = {};

    for (const route of routes) {
      const params = matchRoute(route.path, path);
      if (params !== null) {
        matchedRoute = route;
        routeParams = params;
        break;
      }
    }

    // Route not found
    if (!matchedRoute) {
      window.location.hash = '#/404';
      return;
    }

    // Get current auth state
    const { isAuthenticated, user } = store.getState().auth;

    // Public route while authenticated - redirect to dashboard
    if (matchedRoute.public && isAuthenticated && (path === '/login' || path === '/register')) {
      this.redirectToDashboard(user?.role);
      return;
    }

    // Protected route - not authenticated
    if (matchedRoute.auth && !isAuthenticated) {
      window.location.hash = '#/login';
      return;
    }

    // Role-based check
    if (matchedRoute.roles && !matchedRoute.roles.includes(user?.role)) {
      this.redirectToDashboard(user?.role);
      return;
    }

    // Render the page
    await this.renderPage(matchedRoute.page, {
      params: routeParams,
      query: queryParams,
      route: matchedRoute,
    });
  }

  /**
   * Redirect to role-appropriate dashboard
   */
  redirectToDashboard(role) {
    const dashboardMap = {
      admin: '#/admin/dashboard',
      teacher: '#/teacher/dashboard',
      student: '#/student/dashboard',
    };
    window.location.hash = dashboardMap[role] || '#/';
  }

  /**
   * Dynamically import and render a page module
   */
  async renderPage(pagePath, context) {
    const app = document.getElementById('app');
    if (!app) return;

    // Show loading state
    app.innerHTML = `
      <div class="page-loader">
        <div class="spinner spinner-lg"></div>
      </div>
    `;

    try {
      // Dynamic import of page module
      const module = await import(`../pages/${pagePath}.js`);
      const Page = module.default;

      if (!Page) throw new Error(`Page module '${pagePath}' has no default export`);

      // Render the page
      app.innerHTML = '';
      const pageInstance = new Page(context);
      await pageInstance.render(app);
    } catch (error) {
      console.error('Page render error:', error);
      app.innerHTML = `
        <div class="page-loader">
          <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <h3>Failed to load page</h3>
            <p>${error.message}</p>
            <a href="#/" class="btn btn-primary" style="margin-top: 1rem;">Go Home</a>
          </div>
        </div>
      `;
    }
  }

  /**
   * Navigate programmatically
   */
  push(path) {
    window.location.hash = `#${path}`;
  }

  /**
   * Go back
   */
  back() {
    window.history.back();
  }
}

export const router = new Router();

/**
 * Helper to create navigation links that work with the router
 */
export const navigate = (path) => {
  window.location.hash = `#${path}`;
};
