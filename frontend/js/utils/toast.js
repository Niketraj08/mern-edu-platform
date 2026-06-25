/**
 * Toast Notification System
 * ==========================
 * Usage: showToast('success', 'Title', 'Message', 4000)
 */

const ICONS = {
  success: '✅',
  error:   '❌',
  warning: '⚠️',
  info:    'ℹ️',
};

/**
 * Show a toast notification
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {string} title
 * @param {string} message
 * @param {number} duration - ms to show (default 4000)
 */
export const showToast = (type = 'info', title = '', message = '', duration = 4000) => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <span class="toast-icon">${ICONS[type] || 'ℹ️'}</span>
    <div class="toast-content">
      ${title ? `<div class="toast-title">${title}</div>` : ''}
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    <button class="toast-close" aria-label="Dismiss">✕</button>
  `;

  // Close button
  toast.querySelector('.toast-close').addEventListener('click', () => {
    removeToast(toast);
  });

  container.appendChild(toast);

  // Auto remove
  const timer = setTimeout(() => removeToast(toast), duration);

  // Store timer on element so it can be cleared
  toast._timer = timer;
};

const removeToast = (toast) => {
  clearTimeout(toast._timer);
  toast.style.animation = 'slideInRight 0.2s ease reverse forwards';
  setTimeout(() => toast.remove(), 200);
};
