/**
 * Axios API Client
 * =================
 * Production-grade HTTP client with:
 * - Base URL configuration
 * - JWT auth header injection
 * - Automatic token refresh on 401
 * - Request/response interceptors
 * - Global error handling
 * - Request queuing during token refresh
 */

import { store, actions } from '../store/store.js';
import { showToast } from '../utils/toast.js';

const BASE_URL = 'http://localhost:5000/api';

// ── Axios-like HTTP Client (vanilla JS + Fetch) ─────────────
// In a real React project, import axios directly:
// import axios from 'axios';

/**
 * Core fetch wrapper with axios-like interface
 */
const createClient = (baseURL) => {
  let isRefreshing = false;
  let failedQueue = []; // Queue of requests waiting for token refresh

  /**
   * Process the failed request queue after token refresh
   */
  const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    failedQueue = [];
  };

  /**
   * Make an HTTP request with all interceptors applied
   */
  const request = async (endpoint, options = {}) => {
    const state = store.getState();
    const { accessToken } = state.auth;

    // ── Request Interceptor ─────────────────────────────

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Inject Bearer token if available
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Build request config
    const config = {
      method: options.method || 'GET',
      headers,
      ...(options.body && { body: JSON.stringify(options.body) }),
    };

    const url = `${baseURL}${endpoint}`;

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      // ── Response Interceptor ────────────────────────────

      // Handle 401 - Unauthorized (expired token)
      if (response.status === 401 && !options._retry) {
        const { refreshToken } = store.getState().auth;

        if (!refreshToken) {
          // No refresh token - force logout
          actions.auth.logout();
          window.location.hash = '#/login';
          return Promise.reject(data);
        }

        // If already refreshing, queue this request
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((newToken) => {
            // Retry with new token
            return request(endpoint, {
              ...options,
              _retry: true,
              headers: { Authorization: `Bearer ${newToken}` },
            });
          }).catch((err) => Promise.reject(err));
        }

        // Start token refresh
        isRefreshing = true;
        options._retry = true;

        try {
          const refreshResponse = await fetch(`${baseURL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          const refreshData = await refreshResponse.json();

          if (!refreshResponse.ok) throw new Error('Token refresh failed');

          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshData.data;

          // Update store with new tokens
          actions.auth.updateTokens({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          });

          // Persist to localStorage
          localStorage.setItem('accessToken', newAccessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          // Process queued requests
          processQueue(null, newAccessToken);

          // Retry original request with new token
          return request(endpoint, {
            ...options,
            headers: { Authorization: `Bearer ${newAccessToken}` },
          });
        } catch (refreshError) {
          processQueue(refreshError, null);
          actions.auth.logout();
          localStorage.clear();
          window.location.hash = '#/login';
          showToast('error', 'Session Expired', 'Please log in again.');
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // Handle non-OK responses
      if (!response.ok) {
        const error = new Error(data.message || 'Request failed');
        error.statusCode = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      // Network error
      if (!error.statusCode) {
        showToast('error', 'Network Error', 'Unable to connect to server.');
      }
      throw error;
    }
  };

  // ── Convenience Methods ─────────────────────────────────
  return {
    get: (endpoint, options = {}) =>
      request(endpoint, { ...options, method: 'GET' }),

    post: (endpoint, body, options = {}) =>
      request(endpoint, { ...options, method: 'POST', body }),

    put: (endpoint, body, options = {}) =>
      request(endpoint, { ...options, method: 'PUT', body }),

    patch: (endpoint, body, options = {}) =>
      request(endpoint, { ...options, method: 'PATCH', body }),

    delete: (endpoint, options = {}) =>
      request(endpoint, { ...options, method: 'DELETE' }),
  };
};

// Export the API client instance
export const api = createClient(BASE_URL);

// ── API SERVICE MODULES ─────────────────────────────────────

/**
 * Auth API services
 */
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  logoutAll: () => api.post('/auth/logout-all'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  getMe: () => api.get('/auth/me'),
};

/**
 * User API services
 */
export const userAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/users?${query}`);
  },
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  changePassword: (id, data) => api.patch(`/users/${id}/change-password`, data),
  delete: (id) => api.delete(`/users/${id}`),
  toggleStatus: (id) => api.patch(`/users/${id}/toggle-status`),
  getStats: () => api.get('/users/stats'),
};

/**
 * Course API services
 */
export const courseAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/courses?${query}`);
  },
  getById: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  togglePublish: (id) => api.patch(`/courses/${id}/publish`),
  enroll: (id) => api.post(`/courses/${id}/enroll`),
  delete: (id) => api.delete(`/courses/${id}`),
};

/**
 * Dashboard API services
 */
export const dashboardAPI = {
  admin: () => api.get('/dashboard/admin'),
  teacher: () => api.get('/dashboard/teacher'),
  student: () => api.get('/dashboard/student'),
};
