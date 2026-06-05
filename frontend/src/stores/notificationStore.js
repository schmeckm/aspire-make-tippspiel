import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../services/api';
import { onSocketEvent, connectSocket } from '../services/socket';

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref([]);
  const unreadCount = ref(0);

  async function fetchNotifications() {
    const { data } = await api.get('/notifications');
    notifications.value = data.notifications;
    unreadCount.value = data.unreadCount;
  }

  async function markAsRead(id) {
    await api.post(`/notifications/${id}/read`);
    const n = notifications.value.find((x) => x.id === id);
    if (n && !n.isRead) {
      n.isRead = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
  }

  async function markAllAsRead() {
    await api.post('/notifications/read-all');
    notifications.value.forEach((n) => { n.isRead = true; });
    unreadCount.value = 0;
  }

  function initSocketListener() {
    connectSocket();
    onSocketEvent('notification', (notification) => {
      notifications.value.unshift(notification);
      unreadCount.value++;
    });
  }

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    initSocketListener,
  };
});
