/**
 * Main Application Entry Point
 * ==============================
 * Bootstraps the entire application:
 * 1. Initialize theme from localStorage
 * 2. Restore auth session from localStorage
 * 3. Set up Socket.io if authenticated
 * 4. Mount app shell if authenticated
 * 5. Initialize router
 */

import { store, actions, selectors } from './store/store.js';
import { authAPI } from './utils/api.js';
import { router } from './utils/router.js';
import { initSocket } from './utils/socket.js';
import { renderAppShell } from './components/layout/AppShell.js';
import { showToast } from './utils/toast.js';

// ── Application Class ───────────────────────────────────────
class App {
  constructor() {
    this.shell = null;
    this.isShellMounted = false;
  }

  async init() {
    console.log('🚀 EduPlatform initializing...');

    // 1. Apply saved theme
    this.initTheme();

    // 2. Restore authentication session
    await this.restoreSession();

    // 3. Mount app shell for authenticated users
    if (selectors.auth.isAuthenticated(store.getState())) {
      this.mountShell();
    }

    // 4. Start listening to auth state changes
    this.watchAuthState();

    // 5. Hide initial loader and start routing
    this.hideLoader();
    router.navigate();

    console.log('✅ EduPlatform ready');
  }

  /**
   * Apply theme from localStorage before first render
   */
  initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  /**
   * Restore auth session from localStorage tokens
   * Validates token by fetching /auth/me
   */
  async restoreSession() {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (!accessToken || !refreshToken) {
      console.log('No saved session found');
      return;
    }

    try {
      // Temporarily set tokens in store to enable API calls
      actions.auth.updateTokens({ accessToken, refreshToken });
      actions.auth.setLoading(true);

      // Verify tokens are still valid by fetching user data
      const res = await authAPI.getMe();
      const { user } = res.data;

      // Session is valid - restore state
      actions.auth.loginSuccess({ user, accessToken, refreshToken });

      // Re-initialize socket connection
      initSocket();

      console.log(`✅ Session restored: ${user.firstName} (${user.role})`);
    } catch (error) {
      // Tokens invalid/expired - clear everything
      console.warn('Session restore failed:', error.message);
      actions.auth.logout();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      actions.auth.setLoading(false);
    }
  }

  /**
   * Mount the persistent app shell (sidebar + navbar)
   */
  mountShell() {
    if (this.isShellMounted) return;

    // Clear existing body content (except app and overlays)
    const existingShell = document.getElementById('app-shell');
    const existingNavbar = document.getElementById('navbar');
    const existingMain = document.getElementById('main-content');

    existingShell?.remove();
    existingNavbar?.remove();
    existingMain?.remove();

    this.shell = renderAppShell();
    this.isShellMounted = true;

    console.log('✅ App shell mounted');
  }

  /**
   * Unmount the app shell (on logout)
   */
  unmountShell() {
    if (!this.isShellMounted) return;

    document.getElementById('app-shell')?.remove();
    document.getElementById('navbar')?.remove();
    document.getElementById('main-content')?.remove();
    document.getElementById('sidebar-overlay')?.remove();

    // Restore basic app container
    const app = document.getElementById('app');
    if (!app) {
      const newApp = document.createElement('div');
      newApp.id = 'app';
      document.body.appendChild(newApp);
    }

    this.isShellMounted = false;
    this.shell = null;
    console.log('✅ App shell unmounted');
  }

  /**
   * Watch for auth state changes to mount/unmount shell
   */
  watchAuthState() {
    store.select(selectors.auth.isAuthenticated, (isAuthenticated) => {
      if (isAuthenticated && !this.isShellMounted) {
        this.mountShell();
      } else if (!isAuthenticated && this.isShellMounted) {
        this.unmountShell();
      }
    });
  }

  /**
   * Hide the initial HTML loader
   */
  hideLoader() {
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.style.animation = 'fadeIn 0.3s ease reverse forwards';
      setTimeout(() => loader.remove(), 300);
    }
  }
}

// ── Bootstrap ───────────────────────────────────────────────

// Make navigate available globally for inline onclick handlers
window.navigate = (path) => {
  window.location.hash = `#${path}`;
};

// Handle unhandled errors gracefully
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);

  // Don't show toast for AbortError or routine fetch cancellations
  if (event.reason?.name === 'AbortError') return;

  showToast('error', 'Unexpected Error', event.reason?.message || 'Something went wrong');
});

// Start the application
const app = new App();
app.init().catch((error) => {
  console.error('Fatal initialization error:', error);
  document.getElementById('initial-loader').innerHTML = `
    <div style="text-align: center; color: #f43f5e; padding: 2rem;">
      <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
      <h3 style="font-family: 'Syne', sans-serif;">Failed to start EduPlatform</h3>
      <p style="margin: 8px 0; color: rgba(240,244,255,0.6);">${error.message}</p>
      <button onclick="window.location.reload()" style="
        margin-top: 1rem; padding: 10px 24px; border-radius: 8px;
        background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white;
        border: none; cursor: pointer; font-weight: 600; font-size: 0.875rem;">
        Retry
      </button>
    </div>
  `;
});
