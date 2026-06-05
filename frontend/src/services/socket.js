import { io } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

let socket = null;

export function connectSocket() {
  const authStore = useAuthStore();
  if (!authStore.isAuthenticated || socket?.connected) return socket;

  const url = import.meta.env.VITE_SOCKET_URL || window.location.origin;

  socket = io(url, {
    transports: ['websocket', 'polling'],
    auth: { token: authStore.token },
  });

  socket.on('connect', () => {
    if (authStore.user?.id) {
      socket.emit('join', authStore.user.id);
    }
    socket.emit('join-leaderboard');
    socket.emit('join-matches');
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}

export function onSocketEvent(event, callback) {
  if (!socket) connectSocket();
  socket?.on(event, callback);
  return () => socket?.off(event, callback);
}
