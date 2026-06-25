/**
 * Global State Management (Redux-like Store)
 * ===========================================
 * Implements Redux Toolkit patterns without a build step:
 * - Slice-based state management
 * - Action creators
 * - Reducers
 * - Subscriptions (like React-Redux's connect)
 * - Middleware support
 *
 * In a real React + Vite project, replace this with:
 * import { configureStore, createSlice } from '@reduxjs/toolkit'
 */

// ── AUTH SLICE ──────────────────────────────────────────────
const AUTH_INITIAL_STATE = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authReducer = (state = AUTH_INITIAL_STATE, action) => {
  switch (action.type) {
    case 'auth/setLoading':
      return { ...state, isLoading: action.payload, error: null };

    case 'auth/loginSuccess':
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case 'auth/logout':
      return { ...AUTH_INITIAL_STATE };

    case 'auth/setError':
      return { ...state, isLoading: false, error: action.payload };

    case 'auth/updateUser':
      return { ...state, user: { ...state.user, ...action.payload } };

    case 'auth/updateTokens':
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
      };

    default:
      return state;
  }
};

// ── UI SLICE ────────────────────────────────────────────────
const UI_INITIAL_STATE = {
  theme: localStorage.getItem('theme') || 'dark',
  sidebarCollapsed: false,
  isMobileSidebarOpen: false,
  notifications: [],
  globalLoading: false,
};

const uiReducer = (state = UI_INITIAL_STATE, action) => {
  switch (action.type) {
    case 'ui/toggleTheme':
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      return { ...state, theme: newTheme };

    case 'ui/toggleSidebar':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };

    case 'ui/toggleMobileSidebar':
      return { ...state, isMobileSidebarOpen: !state.isMobileSidebarOpen };

    case 'ui/closeMobileSidebar':
      return { ...state, isMobileSidebarOpen: false };

    case 'ui/addNotification':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, 20),
      };

    case 'ui/clearNotifications':
      return { ...state, notifications: [] };

    case 'ui/setGlobalLoading':
      return { ...state, globalLoading: action.payload };

    default:
      return state;
  }
};

// ── COURSES SLICE ───────────────────────────────────────────
const COURSES_INITIAL_STATE = {
  list: [],
  current: null,
  isLoading: false,
  error: null,
  meta: { total: 0, page: 1, limit: 12, totalPages: 0 },
  filters: { search: '', category: '', level: '', status: 'published' },
};

const coursesReducer = (state = COURSES_INITIAL_STATE, action) => {
  switch (action.type) {
    case 'courses/setLoading':
      return { ...state, isLoading: action.payload };

    case 'courses/setCourses':
      return {
        ...state,
        list: action.payload.courses,
        meta: action.payload.meta,
        isLoading: false,
        error: null,
      };

    case 'courses/setCurrent':
      return { ...state, current: action.payload, isLoading: false };

    case 'courses/addCourse':
      return { ...state, list: [action.payload, ...state.list] };

    case 'courses/updateCourse':
      return {
        ...state,
        list: state.list.map((c) =>
          c._id === action.payload._id ? { ...c, ...action.payload } : c
        ),
        current: state.current?._id === action.payload._id
          ? { ...state.current, ...action.payload }
          : state.current,
      };

    case 'courses/removeCourse':
      return {
        ...state,
        list: state.list.filter((c) => c._id !== action.payload),
      };

    case 'courses/setFilters':
      return { ...state, filters: { ...state.filters, ...action.payload } };

    case 'courses/setError':
      return { ...state, isLoading: false, error: action.payload };

    default:
      return state;
  }
};

// ── USERS SLICE ─────────────────────────────────────────────
const USERS_INITIAL_STATE = {
  list: [],
  stats: null,
  isLoading: false,
  error: null,
  meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
};

const usersReducer = (state = USERS_INITIAL_STATE, action) => {
  switch (action.type) {
    case 'users/setLoading':
      return { ...state, isLoading: action.payload };

    case 'users/setUsers':
      return {
        ...state,
        list: action.payload.users,
        meta: action.payload.meta,
        isLoading: false,
        error: null,
      };

    case 'users/setStats':
      return { ...state, stats: action.payload };

    case 'users/updateUser':
      return {
        ...state,
        list: state.list.map((u) =>
          u._id === action.payload._id ? { ...u, ...action.payload } : u
        ),
      };

    case 'users/removeUser':
      return { ...state, list: state.list.filter((u) => u._id !== action.payload) };

    case 'users/setError':
      return { ...state, isLoading: false, error: action.payload };

    default:
      return state;
  }
};

// ── DASHBOARD SLICE ─────────────────────────────────────────
const DASHBOARD_INITIAL_STATE = {
  data: null,
  isLoading: false,
  error: null,
  lastFetched: null,
};

const dashboardReducer = (state = DASHBOARD_INITIAL_STATE, action) => {
  switch (action.type) {
    case 'dashboard/setLoading':
      return { ...state, isLoading: action.payload };

    case 'dashboard/setData':
      return {
        ...state,
        data: action.payload,
        isLoading: false,
        error: null,
        lastFetched: Date.now(),
      };

    case 'dashboard/setError':
      return { ...state, isLoading: false, error: action.payload };

    default:
      return state;
  }
};

// ── ROOT STORE ──────────────────────────────────────────────
const createStore = () => {
  // Root state
  let state = {
    auth: authReducer(undefined, {}),
    ui: uiReducer(undefined, {}),
    courses: coursesReducer(undefined, {}),
    users: usersReducer(undefined, {}),
    dashboard: dashboardReducer(undefined, {}),
  };

  // Subscriber callbacks
  const subscribers = new Set();

  // Reducer map
  const reducers = {
    auth: authReducer,
    ui: uiReducer,
    courses: coursesReducer,
    users: usersReducer,
    dashboard: dashboardReducer,
  };

  /**
   * Dispatch an action
   * @param {Object} action - { type: string, payload?: any }
   */
  const dispatch = (action) => {
    // Apply all reducers
    const nextState = {};
    let hasChanged = false;

    for (const key in reducers) {
      const prevSlice = state[key];
      const nextSlice = reducers[key](prevSlice, action);
      nextState[key] = nextSlice;
      if (nextSlice !== prevSlice) hasChanged = true;
    }

    if (hasChanged) {
      state = nextState;
      // Notify all subscribers
      subscribers.forEach((cb) => cb(state));
    }

    return action;
  };

  /**
   * Get current state
   */
  const getState = () => state;

  /**
   * Subscribe to state changes
   * @param {Function} callback - Called with new state on change
   * @returns {Function} Unsubscribe function
   */
  const subscribe = (callback) => {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  };

  /**
   * Select a slice with memoization
   * @param {Function} selector - (state) => selectedValue
   * @param {Function} callback - Called when selected value changes
   */
  const select = (selector, callback) => {
    let prevValue = selector(state);
    return subscribe((newState) => {
      const nextValue = selector(newState);
      if (nextValue !== prevValue) {
        prevValue = nextValue;
        callback(nextValue);
      }
    });
  };

  return { dispatch, getState, subscribe, select };
};

// Create and export global store instance
export const store = createStore();

// ── ACTION CREATORS ─────────────────────────────────────────
export const actions = {
  auth: {
    setLoading: (v) => store.dispatch({ type: 'auth/setLoading', payload: v }),
    loginSuccess: (data) => store.dispatch({ type: 'auth/loginSuccess', payload: data }),
    logout: () => store.dispatch({ type: 'auth/logout' }),
    setError: (err) => store.dispatch({ type: 'auth/setError', payload: err }),
    updateUser: (data) => store.dispatch({ type: 'auth/updateUser', payload: data }),
    updateTokens: (data) => store.dispatch({ type: 'auth/updateTokens', payload: data }),
  },
  ui: {
    toggleTheme: () => store.dispatch({ type: 'ui/toggleTheme' }),
    toggleSidebar: () => store.dispatch({ type: 'ui/toggleSidebar' }),
    toggleMobileSidebar: () => store.dispatch({ type: 'ui/toggleMobileSidebar' }),
    closeMobileSidebar: () => store.dispatch({ type: 'ui/closeMobileSidebar' }),
    addNotification: (n) => store.dispatch({ type: 'ui/addNotification', payload: n }),
    setGlobalLoading: (v) => store.dispatch({ type: 'ui/setGlobalLoading', payload: v }),
  },
  courses: {
    setLoading: (v) => store.dispatch({ type: 'courses/setLoading', payload: v }),
    setCourses: (data) => store.dispatch({ type: 'courses/setCourses', payload: data }),
    setCurrent: (c) => store.dispatch({ type: 'courses/setCurrent', payload: c }),
    addCourse: (c) => store.dispatch({ type: 'courses/addCourse', payload: c }),
    updateCourse: (c) => store.dispatch({ type: 'courses/updateCourse', payload: c }),
    removeCourse: (id) => store.dispatch({ type: 'courses/removeCourse', payload: id }),
    setFilters: (f) => store.dispatch({ type: 'courses/setFilters', payload: f }),
    setError: (e) => store.dispatch({ type: 'courses/setError', payload: e }),
  },
  users: {
    setLoading: (v) => store.dispatch({ type: 'users/setLoading', payload: v }),
    setUsers: (data) => store.dispatch({ type: 'users/setUsers', payload: data }),
    setStats: (s) => store.dispatch({ type: 'users/setStats', payload: s }),
    updateUser: (u) => store.dispatch({ type: 'users/updateUser', payload: u }),
    removeUser: (id) => store.dispatch({ type: 'users/removeUser', payload: id }),
  },
  dashboard: {
    setLoading: (v) => store.dispatch({ type: 'dashboard/setLoading', payload: v }),
    setData: (d) => store.dispatch({ type: 'dashboard/setData', payload: d }),
    setError: (e) => store.dispatch({ type: 'dashboard/setError', payload: e }),
  },
};

// ── SELECTORS ───────────────────────────────────────────────
export const selectors = {
  auth: {
    user: (s) => s.auth.user,
    role: (s) => s.auth.user?.role,
    isAuthenticated: (s) => s.auth.isAuthenticated,
    isLoading: (s) => s.auth.isLoading,
    error: (s) => s.auth.error,
    accessToken: (s) => s.auth.accessToken,
  },
  ui: {
    theme: (s) => s.ui.theme,
    sidebarCollapsed: (s) => s.ui.sidebarCollapsed,
    isMobileSidebarOpen: (s) => s.ui.isMobileSidebarOpen,
    notifications: (s) => s.ui.notifications,
  },
  courses: {
    list: (s) => s.courses.list,
    current: (s) => s.courses.current,
    isLoading: (s) => s.courses.isLoading,
    meta: (s) => s.courses.meta,
    filters: (s) => s.courses.filters,
  },
  users: {
    list: (s) => s.users.list,
    stats: (s) => s.users.stats,
    isLoading: (s) => s.users.isLoading,
    meta: (s) => s.users.meta,
  },
  dashboard: {
    data: (s) => s.dashboard.data,
    isLoading: (s) => s.dashboard.isLoading,
  },
};
