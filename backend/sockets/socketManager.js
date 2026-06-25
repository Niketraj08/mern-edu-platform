/**
 * Socket.io Manager - Server Side
 * ================================
 * Real-time bidirectional communication
 *
 * Features:
 * - User-specific rooms (user:<id>)
 * - Role-specific rooms (room:admin, room:teacher, room:student)
 * - Online presence tracking
 * - Real-time notifications
 * - Live enrollment updates
 */

const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/jwtHelper');
const User = require('../models/User');

let io;

// Track online users: Map<socketId, { userId, role, name }>
const onlineUsers = new Map();

/**
 * Initialize Socket.io server
 * @param {http.Server} httpServer - The HTTP server instance
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ── Authentication Middleware ────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        // Allow unauthenticated sockets (public features)
        socket.user = null;
        return next();
      }

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id).select('firstName lastName role isActive');

      if (!user || !user.isActive) {
        socket.user = null;
        return next();
      }

      socket.user = {
        id: user._id.toString(),
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
      };

      next();
    } catch (err) {
      // Don't block connection on auth error, just no user
      socket.user = null;
      next();
    }
  });

  // ── Connection Handler ──────────────────────────────
  io.on('connection', (socket) => {
    const user = socket.user;

    if (user) {
      // Join user-specific room
      socket.join(`user:${user.id}`);

      // Join role-specific room
      socket.join(`room:${user.role}`);

      // Track online presence
      onlineUsers.set(socket.id, user);

      console.log(`🔌 Socket connected: ${user.name} (${user.role}) | ID: ${socket.id}`);

      // Notify admins of new online user
      socket.to('room:admin').emit('user:online', {
        userId: user.id,
        name: user.name,
        role: user.role,
        onlineCount: onlineUsers.size,
      });

      // Send current online count to newly connected user
      socket.emit('presence:update', {
        onlineCount: onlineUsers.size,
      });
    }

    // ── Event Handlers ──────────────────────────────────

    // Ping/pong heartbeat
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // User joins a specific course room for live updates
    socket.on('course:join', (courseId) => {
      socket.join(`course:${courseId}`);
      console.log(`${user?.name || 'Guest'} joined course room: ${courseId}`);
    });

    // User leaves a course room
    socket.on('course:leave', (courseId) => {
      socket.leave(`course:${courseId}`);
    });

    // Admin sends notification to specific role
    socket.on('admin:notify', (data) => {
      if (user?.role !== 'admin') return; // Only admins can broadcast

      const { targetRole, message, type = 'info' } = data;

      if (targetRole && ['student', 'teacher'].includes(targetRole)) {
        io.to(`room:${targetRole}`).emit('notification', {
          message,
          type,
          from: 'Admin',
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Teacher sends announcement to enrolled students
    socket.on('course:announcement', (data) => {
      if (!['teacher', 'admin'].includes(user?.role)) return;

      const { courseId, message } = data;
      socket.to(`course:${courseId}`).emit('course:announcement', {
        message,
        from: user.name,
        courseId,
        timestamp: new Date().toISOString(),
      });
    });

    // Typing indicator for chat
    socket.on('chat:typing', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('chat:typing', {
        userId: user?.id,
        name: user?.name,
      });
    });

    // ── Disconnect Handler ──────────────────────────────
    socket.on('disconnect', (reason) => {
      if (user) {
        onlineUsers.delete(socket.id);

        // Notify admins
        socket.to('room:admin').emit('user:offline', {
          userId: user.id,
          name: user.name,
          onlineCount: onlineUsers.size,
          reason,
        });

        console.log(`🔌 Socket disconnected: ${user.name} | Reason: ${reason}`);
      }
    });

    // ── Error Handler ───────────────────────────────────
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('✅ Socket.io initialized');
  return io;
};

/**
 * Get the io instance (for use in controllers)
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Call initSocket(server) first.');
  }
  return io;
};

/**
 * Get count of online users
 */
const getOnlineCount = () => onlineUsers.size;

/**
 * Get list of online users (for admin dashboard)
 */
const getOnlineUsers = () => Array.from(onlineUsers.values());

module.exports = { initSocket, getIO, getOnlineCount, getOnlineUsers };
