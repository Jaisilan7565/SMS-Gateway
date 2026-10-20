import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = () => {
  const token = localStorage.getItem('sms_admin_token');
  if (!token) return null;

  if (socket && socket.connected) {
    return socket;
  }

  // Connect to backend origin or proxy host
  const rawApiBase = import.meta.env.VITE_API_BASE_URL || '';
  const socketOrigin = rawApiBase
    ? rawApiBase.startsWith('http://') || rawApiBase.startsWith('https://')
      ? rawApiBase
      : `https://${rawApiBase}`
    : window.location.origin;

  socket = io(socketOrigin, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to real-time gateway:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected from gateway:', reason);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
