import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import { ROLES } from '../constants/roles.js';

let io = null;

export const initSocket = (httpServer, corsOrigin) => {
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin === '*' ? true : corsOrigin || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingInterval: 25000,
    pingTimeout: 20000
  });

  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'techglora_jwt_secret_dev_key_32chars_minimum_2026!');
      socket.user = decoded;
      return next();
    } catch (err) {
      return next(new Error('Invalid or expired authentication token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket client connected: ${socket.id} (User: ${socket.user?.id}, Role: ${socket.user?.role})`);

    // If Admin, join the dedicated 'admins' room
    if (socket.user?.role === ROLES.ADMIN) {
      socket.join('admins');
      logger.info(`Admin socket joined 'admins' broadcast room: ${socket.id}`);
    }

    socket.on('disconnect', (reason) => {
      logger.info(`Socket client disconnected: ${socket.id} (Reason: ${reason})`);
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};

/**
 * Emits live sync completion or updates directly to connected Admins
 */
export const notifyAdmins = (event, payload) => {
  if (io) {
    io.to('admins').emit(event, payload);
    logger.debug(`Broadcasted event '${event}' to 'admins' room`);
  }
};

export default {
  initSocket,
  getIO,
  notifyAdmins
};
