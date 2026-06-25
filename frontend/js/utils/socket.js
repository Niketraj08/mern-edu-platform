/**
 * Socket.io Client Manager
 * =========================
 * Manages real-time connection with auto-reconnect,
 * event handling, and integration with the global store
 */

import { store, actions } from '../store/store.js';
import { showToast } from './toast.js';

let socket = null;
const eventHandlers = new Map();

/**
 * Initialize Socket.io connection
 * Call this after user logs in
 */
export const initSocket = () => {
  const state = store.getState();
  const { accessToken, isAuthenticated } = state.auth;

  if (!isAuthenticated || !accessToken) {
    console.warn('Socket init skipped: user not authenticated');
    return;
  }

  if (socket?.connected) {
    console.log('Socket already connected');
    return;
  }

  // Create socket connection
  socket = io('http://localhost:5000', {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  // ── Connection Events ───────────────────────────────────

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
    // Re-register all pending event handlers
    eventHandlers.forEach((handlers, event) => {
      handlers.forEach((handler) => socket.on(event, handler));
    });
  });

  socket.on('connect_error', (error) => {
    console.warn('Socket connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    if (reason === 'io server disconnect') {
      // Server forcefully disconnected - don't auto-reconnect
      console.log('Server terminated connection');
    }
  });

  socket.on('reconnect', (attempt) => {
    console.log(`Socket reconnected after ${attempt} attempts`);
    showToast('success', 'Reconnected', 'Real-time connection restored.');
  });

  socket.on('reconnect_failed', () => {
    showToast('error', 'Connection Lost', 'Unable to reconnect to server.');
  });

  // ── Server Events ────────────────────────────────────────

  // Receive notification
  socket.on('notification', (data) => {
    showToast(data.type || 'info', data.from || 'Notification', data.message);
    actions.ui.addNotification({
      id: Date.now(),
      ...data,
      timestamp: new Date().toISOString(),
    });
  });

  // Presence updates (admin dashboard)
  socket.on('presence:update', (data) => {
    // Could dispatch to update online user count in dashboard
    store.dispatch({ type: 'dashboard/updateOnlineCount', payload: data.onlineCount });
  });

  // New enrollment notification (for teachers)
  socket.on('course:newEnrollment', (data) => {
    showToast('success', '🎉 New Enrollment!', `${data.studentName} enrolled in "${data.courseTitle}"`);
  });

  // Course announcement
  socket.on('course:announcement', (data) => {
    showToast('info', `📢 ${data.from}`, data.message);
    actions.ui.addNotification({
      id: Date.now(),
      type: 'announcement',
      ...data,
    });
  });

  // Admin: new user registered
  socket.on('user:registered', (data) => {
    actions.ui.addNotification({
      id: Date.now(),
      type: 'info',
      message: `New ${data.role} registered: ${data.name}`,
      timestamp: new Date().toISOString(),
    });
  });

  return socket;
};

/**
 * Disconnect socket
 * Call this on logout
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Socket disconnected by client');
  }
};

/**
 * Get socket instance
 */
export const getSocket = () => socket;

/**
 * Join a course room for live updates
 * @param {string} courseId
 */
export const joinCourseRoom = (courseId) => {
  socket?.emit('course:join', courseId);
};

/**
 * Leave a course room
 * @param {string} courseId
 */
export const leaveCourseRoom = (courseId) => {
  socket?.emit('course:leave', courseId);
};

/**
 * Send a course announcement (teacher/admin)
 * @param {string} courseId
 * @param {string} message
 */
export const sendAnnouncement = (courseId, message) => {
  socket?.emit('course:announcement', { courseId, message });
};

/**
 * Add a persistent event listener
 * These are re-applied after reconnect
 */
export const onSocketEvent = (event, handler) => {
  if (!eventHandlers.has(event)) {
    eventHandlers.set(event, new Set());
  }
  eventHandlers.get(event).add(handler);

  if (socket?.connected) {
    socket.on(event, handler);
  }

  // Return cleanup function
  return () => offSocketEvent(event, handler);
};

/**
 * Remove an event listener
 */
export const offSocketEvent = (event, handler) => {
  eventHandlers.get(event)?.delete(handler);
  socket?.off(event, handler);
};

/**
 * Emit a socket event
 */
export const emitEvent = (event, data) => {
  if (!socket?.connected) {
    console.warn('Socket not connected. Cannot emit:', event);
    return false;
  }
  socket.emit(event, data);
  return true;
};

/**
 * Check if socket is connected
 */
export const isConnected = () => socket?.connected || false;
