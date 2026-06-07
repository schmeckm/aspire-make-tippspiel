<template>
  <div class="notification-bell">
    <button
      type="button"
      class="bell-button"
      :aria-label="t('notifications.toggleDropdown')"
      :aria-expanded="open"
      aria-haspopup="true"
      @click="toggle"
      @keydown.escape="open = false"
    >
      <span class="bell-icon" aria-hidden="true">🔔</span>
      <span v-if="store.unreadCount > 0" class="badge-count">{{ store.unreadCount }}</span>
    </button>
    <div v-if="open" class="notification-dropdown" role="menu" @click.stop>
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
.notification-bell { position: relative; }
.bell-button {
  position: relative;
  cursor: pointer;
  padding: 0.5rem;
  background: none;
  border: none;
  color: inherit;
  line-height: 1;
}
.bell-icon { font-size: 1.25rem; }
.badge-count {
  position: absolute; top: 0; right: 0;
  background: var(--color-danger);
  color: #fff;
  font-size: 0.65rem; font-weight: 700;
  padding: 0.1rem 0.35rem; border-radius: 999px;
}
.notification-dropdown {
  position: absolute; top: 100%; right: 0;
  width: min(360px, calc(100vw - 2rem)); max-height: 400px;
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius); box-shadow: var(--shadow-lg);
  z-index: 1000; overflow: hidden;
}
.dropdown-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.75rem 1rem; border-bottom: 1px solid var(--color-border);
}
</style>
