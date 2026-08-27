import { io, Socket } from 'socket.io-client';

const getSocketUrl = (): string => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
  }
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : window.location.origin;
};

let socket: Socket | null = null;

export const getSocket = (token?: string, userId?: string): Socket => {
  const authToken = token || localStorage.getItem('voxa_token') || undefined;
  const savedUser = localStorage.getItem('voxa_user');
  const authedUserId = userId || (savedUser ? JSON.parse(savedUser).id : undefined);

  if (!socket) {
    const socketUrl = getSocketUrl();
    console.log('[Socket.IO] Initializing connection to:', socketUrl);

    socket = io(socketUrl, {
      auth: { token: authToken },
      query: { userId: authedUserId },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[Socket.IO] ✅ Connected to VOXA server:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket.IO] ⚠️ Connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason);
    });
  } else if (authToken && !(socket.auth && typeof socket.auth === 'object' && 'token' in socket.auth && socket.auth.token)) {
    socket.auth = { token: authToken };
    if (!socket.connected) {
      socket.connect();
    }
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
