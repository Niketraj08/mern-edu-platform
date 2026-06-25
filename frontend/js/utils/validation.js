/**
 * Frontend Form Validation
 * =========================
 * Validates forms before API calls
 * Returns { isValid: bool, errors: { field: message } }
 */

const PATTERNS = {
  email: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,10})+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  phone: /^\+?[1-9]\d{1,14}$/,
};

/**
 * Validate a single field
 */
export const validateField = (name, value, rules = {}) => {
  if (rules.required && !value?.trim()) {
    return `${rules.label || name} is required`;
  }

  if (!value) return null; // Skip other rules if empty (not required)

  if (rules.email && !PATTERNS.email.test(value)) {
    return 'Please enter a valid email address';
  }

  if (rules.password && !PATTERNS.password.test(value)) {
    return 'Password needs uppercase, lowercase, and a number (min 8 chars)';
  }

  if (rules.minLength && value.length < rules.minLength) {
    return `Must be at least ${rules.minLength} characters`;
  }

  if (rules.maxLength && value.length > rules.maxLength) {
    return `Cannot exceed ${rules.maxLength} characters`;
  }

  if (rules.match && value !== rules.match) {
    return rules.matchMessage || 'Values do not match';
  }

  return null; // Valid
};

/**
 * Validate an entire form
 * @param {Object} values - Form field values
 * @param {Object} schema - Validation rules per field
 * @returns {{ isValid: boolean, errors: Object }}
 */
export const validateForm = (values, schema) => {
  const errors = {};

  for (const field in schema) {
    const error = validateField(field, values[field], schema[field]);
    if (error) errors[field] = error;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Show inline validation errors on form DOM elements
 * @param {Object} errors - { fieldName: errorMessage }
 * @param {HTMLElement} form - The form element
 */
export const showFormErrors = (errors, form) => {
  // Clear all previous errors first
  form.querySelectorAll('.form-control').forEach((input) => {
    input.classList.remove('error');
  });
  form.querySelectorAll('.form-error').forEach((el) => el.remove());

  // Show new errors
  for (const field in errors) {
    const input = form.querySelector(`[name="${field}"], #${field}`);
    if (!input) continue;

    input.classList.add('error');

    const errorEl = document.createElement('span');
    errorEl.className = 'form-error';
    errorEl.innerHTML = `⚠ ${errors[field]}`;
    input.parentNode.insertBefore(errorEl, input.nextSibling);
  }

  // Focus first error field
  const firstErrorField = Object.keys(errors)[0];
  if (firstErrorField) {
    const input = form.querySelector(`[name="${firstErrorField}"], #${firstErrorField}`);
    input?.focus();
  }
};

/**
 * Clear all form errors
 */
export const clearFormErrors = (form) => {
  form.querySelectorAll('.form-control.error').forEach((el) => el.classList.remove('error'));
  form.querySelectorAll('.form-error').forEach((el) => el.remove());
};

// ── Pre-built Schemas ───────────────────────────────────────
export const schemas = {
  register: {
    firstName: { required: true, label: 'First name', minLength: 2 },
    lastName:  { required: true, label: 'Last name', minLength: 2 },
    email:     { required: true, label: 'Email', email: true },
    password:  { required: true, label: 'Password', password: true },
  },
  login: {
    email:    { required: true, label: 'Email', email: true },
    password: { required: true, label: 'Password' },
  },
  updateProfile: {
    firstName: { label: 'First name', minLength: 2, maxLength: 50 },
    lastName:  { label: 'Last name', minLength: 2, maxLength: 50 },
    bio:       { label: 'Bio', maxLength: 500 },
  },
  createCourse: {
    title:       { required: true, label: 'Title', minLength: 5, maxLength: 100 },
    description: { required: true, label: 'Description', minLength: 20, maxLength: 2000 },
    category:    { required: true, label: 'Category' },
  },
};
