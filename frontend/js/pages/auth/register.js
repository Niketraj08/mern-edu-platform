/**
 * Register Page
 * ==============
 * Multi-field registration form with:
 * - Role selection (student / teacher)
 * - Full validation
 * - Password strength indicator
 */

import { actions } from '../../store/store.js';
import { authAPI } from '../../utils/api.js';
import { validateForm, showFormErrors, clearFormErrors, schemas } from '../../utils/validation.js';
import { showToast } from '../../utils/toast.js';
import { navigate } from '../../utils/router.js';
import { initSocket } from '../../utils/socket.js';

export default class RegisterPage {
  constructor(context) {
    this.context = context;
  }

  render(container) {
    this.el = container;
    this.el.innerHTML = `
      <div class="auth-container">
        <div class="auth-card" style="max-width: 500px;">

          <!-- Header -->
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="display: inline-flex; align-items: center; justify-content: center;
                        width: 52px; height: 52px; border-radius: 14px;
                        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                        font-family: 'Syne', sans-serif; font-weight: 800;
                        font-size: 1.3rem; color: white; margin-bottom: 14px;
                        box-shadow: 0 8px 24px rgba(59,130,246,0.3);">
              E
            </div>
            <h2 style="margin-bottom: 6px;">Create Account</h2>
            <p style="color: var(--text-muted); font-size: 0.875rem;">
              Join thousands of learners today
            </p>
          </div>

          <form id="register-form" novalidate>

            <!-- Name row -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
              <div class="form-group">
                <label class="form-label" for="firstName">First Name</label>
                <input type="text" class="form-control" id="firstName" name="firstName"
                       placeholder="John" autocomplete="given-name" />
              </div>
              <div class="form-group">
                <label class="form-label" for="lastName">Last Name</label>
                <input type="text" class="form-control" id="lastName" name="lastName"
                       placeholder="Doe" autocomplete="family-name" />
              </div>
            </div>

            <div class="form-group mb-md">
              <label class="form-label" for="reg-email">Email Address</label>
              <input type="email" class="form-control" id="reg-email" name="email"
                     placeholder="you@example.com" autocomplete="email" />
            </div>

            <div class="form-group mb-md">
              <label class="form-label" for="reg-password">Password</label>
              <div style="position: relative;">
                <input type="password" class="form-control" id="reg-password" name="password"
                       placeholder="Min 8 chars, uppercase & number" autocomplete="new-password" />
                <button type="button" id="reg-toggle-pw"
                        style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
                               background: none; border: none; cursor: pointer; color: var(--text-muted);">
                  👁
                </button>
              </div>
              <!-- Password strength bar -->
              <div id="pw-strength-wrap" style="margin-top: 8px; display: none;">
                <div style="height: 4px; background: var(--bg-overlay); border-radius: 4px; overflow: hidden;">
                  <div id="pw-strength-bar" style="height: 100%; width: 0%; transition: width 0.3s, background 0.3s; border-radius: 4px;"></div>
                </div>
                <div id="pw-strength-label" style="font-size: 0.72rem; margin-top: 4px; color: var(--text-muted);"></div>
              </div>
            </div>

            <!-- Role selection -->
            <div class="form-group mb-lg">
              <label class="form-label">I am a...</label>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <label style="cursor: pointer;">
                  <input type="radio" name="role" value="student" checked style="display: none;" />
                  <div class="role-option" data-value="student" style="
                    border: 2px solid var(--brand-500); border-radius: 10px; padding: 14px; text-align: center;
                    background: rgba(59,130,246,0.08); transition: all 0.2s;">
                    <div style="font-size: 1.5rem; margin-bottom: 4px;">🎓</div>
                    <div style="font-weight: 600; font-size: 0.875rem; color: var(--text-primary);">Student</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">Enroll & learn</div>
                  </div>
                </label>
                <label style="cursor: pointer;">
                  <input type="radio" name="role" value="teacher" style="display: none;" />
                  <div class="role-option" data-value="teacher" style="
                    border: 2px solid var(--border-default); border-radius: 10px; padding: 14px; text-align: center;
                    transition: all 0.2s;">
                    <div style="font-size: 1.5rem; margin-bottom: 4px;">👨‍🏫</div>
                    <div style="font-weight: 600; font-size: 0.875rem; color: var(--text-primary);">Teacher</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">Create & teach</div>
                  </div>
                </label>
              </div>
            </div>

            <button type="submit" class="btn btn-primary w-full" id="reg-btn">
              Create Account
            </button>

          </form>

          <p style="text-align: center; font-size: 0.875rem; color: var(--text-muted); margin-top: 20px;">
            Already have an account?
            <a href="#/login" style="font-weight: 600;">Sign in →</a>
          </p>

        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const form = this.el.querySelector('#register-form');

    // Password toggle
    const pwInput = form.querySelector('#reg-password');
    form.querySelector('#reg-toggle-pw')?.addEventListener('click', (e) => {
      const isText = pwInput.type === 'text';
      pwInput.type = isText ? 'password' : 'text';
      e.currentTarget.textContent = isText ? '👁' : '🙈';
    });

    // Password strength indicator
    pwInput?.addEventListener('input', () => {
      this.updatePasswordStrength(pwInput.value);
    });

    // Role selection UI
    const roleOptions = form.querySelectorAll('.role-option');
    const radioInputs = form.querySelectorAll('[name="role"]');

    roleOptions.forEach((opt) => {
      opt.addEventListener('click', () => {
        roleOptions.forEach((o) => {
          o.style.borderColor = 'var(--border-default)';
          o.style.background = '';
        });
        opt.style.borderColor = 'var(--brand-500)';
        opt.style.background = 'rgba(59,130,246,0.08)';

        // Check corresponding radio
        const val = opt.dataset.value;
        radioInputs.forEach((r) => { r.checked = r.value === val; });
      });
    });

    // Form submit
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleRegister(form);
    });
  }

  updatePasswordStrength(password) {
    const wrap = this.el.querySelector('#pw-strength-wrap');
    const bar = this.el.querySelector('#pw-strength-bar');
    const label = this.el.querySelector('#pw-strength-label');

    if (!password) {
      wrap.style.display = 'none';
      return;
    }

    wrap.style.display = 'block';

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels = [
      { pct: '20%', color: '#f43f5e', text: 'Too weak' },
      { pct: '40%', color: '#f59e0b', text: 'Weak' },
      { pct: '60%', color: '#f59e0b', text: 'Fair' },
      { pct: '80%', color: '#10b981', text: 'Strong' },
      { pct: '100%', color: '#10b981', text: 'Very strong' },
    ];

    const level = levels[Math.min(score - 1, 4)] || levels[0];
    bar.style.width = level.pct;
    bar.style.background = level.color;
    label.textContent = level.text;
    label.style.color = level.color;
  }

  async handleRegister(form) {
    clearFormErrors(form);

    const values = {
      firstName: form.querySelector('#firstName').value,
      lastName:  form.querySelector('#lastName').value,
      email:     form.querySelector('#reg-email').value,
      password:  form.querySelector('#reg-password').value,
      role:      form.querySelector('[name="role"]:checked')?.value || 'student',
    };

    const { isValid, errors } = validateForm(values, schemas.register);
    if (!isValid) {
      showFormErrors(errors, form);
      return;
    }

    const btn = form.querySelector('#reg-btn');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
      actions.auth.setLoading(true);
      const res = await authAPI.register(values);

      const { user, accessToken, refreshToken } = res.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      actions.auth.loginSuccess({ user, accessToken, refreshToken });
      initSocket();

      showToast('success', '🎉 Account Created!', `Welcome to EduPlatform, ${user.firstName}!`);

      const dashboardMap = {
        admin: '/admin/dashboard',
        teacher: '/teacher/dashboard',
        student: '/student/dashboard',
      };
      navigate(dashboardMap[user.role] || '/');

    } catch (error) {
      showToast('error', 'Registration Failed', error.message);
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
      actions.auth.setLoading(false);
    }
  }
}
