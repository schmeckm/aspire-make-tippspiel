<template>
  <div class="notification-bell" @click="toggle">
    <span class="bell-icon">🔔</span>
    <span v-if="store.unreadCount > 0" class="badge-count">{{ store.unreadCount }}</span>
    <div v-if="open" class="notification-dropdown" @click.stop>
      <div class="dropdown-header">
        <strong>{{ t('notifications.title') }}</strong>
        <button class="btn btn-sm btn-secondary" @click="store.markAllAsRead()">{{ t('notifications.markAllRead') }}</button>
      </div>
      <NotificationList />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNotificationStore } from '../stores/notificationStore';
import NotificationList from './NotificationList.vue';

const { t } = useI18n();
const store = useNotificationStore();
const open = ref(false);

function toggle() { open.value = !open.value; }
function closeOnClickOutside(e) {
  if (!e.target.closest('.notification-bell')) open.value = false;
}

onMounted(async () => {
  await store.fetchNotifications();
  store.initSocketListener();
  document.addEventListener('click', closeOnClickOutside);
});

onUnmounted(() => document.removeEventListener('click', closeOnClickOutside));
</script>

<style scoped>
.notification-bell { position: relative; cursor: pointer; padding: 0.5rem; }
.bell-icon { font-size: 1.25rem; }
.badge-count {
  position: absolute; top: 0; right: 0;
  background: #dc3545; color: white;
  font-size: 0.65rem; font-weight: 700;
  padding: 0.1rem 0.35rem; border-radius: 999px;
}
.notification-dropdown {
  position: absolute; top: 100%; right: 0;
  width: min(360px, calc(100vw - 2rem)); max-height: 400px;
  background: white; border: 1px solid var(--color-border);
  border-radius: var(--radius); box-shadow: var(--shadow-lg);
  z-index: 1000; overflow: hidden;
}
.dropdown-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.75rem 1rem; border-bottom: 1px solid var(--color-border);
}
</style>
