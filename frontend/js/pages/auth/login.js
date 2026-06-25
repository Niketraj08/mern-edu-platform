/**
 * Login Page
 * ===========
 * Features:
 * - Email/password form with validation
 * - Show/hide password
 * - Loading state on submit
 * - JWT token storage
 * - Redirect to role-appropriate dashboard
 */

import { actions, selectors } from '../../store/store.js';
import { authAPI } from '../../utils/api.js';
import { validateForm, showFormErrors, clearFormErrors, schemas } from '../../utils/validation.js';
import { showToast } from '../../utils/toast.js';
import { navigate } from '../../utils/router.js';
import { initSocket } from '../../utils/socket.js';

export default class LoginPage {
  constructor(context) {
    this.context = context;
    this.el = null;
  }

  render(container) {
    this.el = container;
    this.el.innerHTML = `
      <div class="auth-container">
        <div class="auth-card">

          <!-- Logo -->
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-flex; align-items: center; justify-content: center;
                        width: 56px; height: 56px; border-radius: 16px;
                        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                        font-family: 'Syne', sans-serif; font-weight: 800;
                        font-size: 1.5rem; color: white; margin-bottom: 16px;
                        box-shadow: 0 8px 24px rgba(59,130,246,0.35);">
              E
            </div>
            <h2 style="margin-bottom: 6px;">Welcome back</h2>
            <p style="color: var(--text-muted); font-size: 0.875rem;">
              Sign in to your EduPlatform account
            </p>
          </div>

          <!-- Login Form -->
          <form id="login-form" novalidate>

            <div class="form-group mb-md">
              <label class="form-label" for="email">Email Address</label>
              <input
                type="email"
                class="form-control"
                id="email"
                name="email"
                placeholder="you@example.com"
                autocomplete="email"
                required
              />
            </div>

            <div class="form-group mb-lg">
              <label class="form-label" for="password">
                Password
                <a href="#/forgot-password" style="float: right; font-weight: 400; font-size: 0.78rem;">
                  Forgot password?
                </a>
              </label>
              <div style="position: relative;">
                <input
                  type="password"
                  class="form-control"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  autocomplete="current-password"
                  required
                />
                <button type="button" id="toggle-password"
                        style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
                               background: none; border: none; cursor: pointer; color: var(--text-muted);
                               font-size: 1rem; padding: 0;"
                        aria-label="Toggle password visibility">
                  👁
                </button>
              </div>
            </div>

            <!-- Demo credentials hint -->
            <div style="background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.15);
                        border-radius: 10px; padding: 12px; margin-bottom: 20px; font-size: 0.78rem;">
              <div style="font-weight: 600; color: var(--brand-400); margin-bottom: 6px;">🔑 Demo Credentials</div>
              <div style="color: var(--text-muted); display: flex; gap: 16px; flex-wrap: wrap;">
                <span>Admin: admin@platform.com</span>
                <span>Student: student@test.com</span>
              </div>
              <div style="color: var(--text-muted); margin-top: 4px;">Password: Admin@123456</div>
            </div>

            <button type="submit" class="btn btn-primary w-full" id="login-btn">
              Sign In
            </button>

          </form>

          <!-- Divider -->
          <div style="display: flex; align-items: center; gap: 16px; margin: 24px 0;">
            <div style="flex: 1; height: 1px; background: var(--border-subtle);"></div>
            <span style="font-size: 0.78rem; color: var(--text-muted);">OR</span>
            <div style="flex: 1; height: 1px; background: var(--border-subtle);"></div>
          </div>

          <!-- Register link -->
          <p style="text-align: center; font-size: 0.875rem; color: var(--text-muted);">
            Don't have an account?
            <a href="#/register" style="font-weight: 600;">Create one free →</a>
          </p>

        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const form = this.el.querySelector('#login-form');
    const passwordInput = this.el.querySelector('#password');
    const toggleBtn = this.el.querySelector('#toggle-password');

    // Toggle password visibility
    toggleBtn?.addEventListener('click', () => {
      const isText = passwordInput.type === 'text';
      passwordInput.type = isText ? 'password' : 'text';
      toggleBtn.textContent = isText ? '👁' : '🙈';
    });

    // Form submit
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleLogin(form);
    });

    // Clear errors on input
    form?.querySelectorAll('.form-control').forEach((input) => {
      input.addEventListener('input', () => {
        input.classList.remove('error');
        input.nextElementSibling?.classList.contains('form-error') &&
          input.nextElementSibling.remove();
      });
    });
  }

  async handleLogin(form) {
    clearFormErrors(form);

    const values = {
      email: form.querySelector('#email').value,
      password: form.querySelector('#password').value,
    };

    // Frontend validation
    const { isValid, errors } = validateForm(values, schemas.login);
    if (!isValid) {
      showFormErrors(errors, form);
      return;
    }

    const btn = form.querySelector('#login-btn');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
      actions.auth.setLoading(true);
      const res = await authAPI.login(values);

      const { user, accessToken, refreshToken } = res.data;

      // Persist tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // Update store
      actions.auth.loginSuccess({ user, accessToken, refreshToken });

      // Initialize real-time connection
      initSocket();

      showToast('success', '✓ Signed In', `Welcome back, ${user.firstName}!`);

      // Redirect to role dashboard
      const dashboardMap = {
        admin:   '/admin/dashboard',
        teacher: '/teacher/dashboard',
        student: '/student/dashboard',
      };
      navigate(dashboardMap[user.role] || '/');

    } catch (error) {
      actions.auth.setError(error.message);
      showToast('error', 'Sign In Failed', error.message || 'Invalid credentials');

      // Show error on form
      showFormErrors(
        { email: 'Invalid email or password', password: '' },
        form
      );
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
      actions.auth.setLoading(false);
    }
  }
}
