<template>
  <div class="notification-list">
    <div v-if="store.notifications.length === 0" class="empty">{{ t('notifications.empty') }}</div>
    <div
      v-for="n in store.notifications"
      :key="n.id"
      :class="['notification-item', { unread: !n.isRead }]"
      @click="handleClick(n)"
    >
      <div class="notification-title">{{ n.title }}</div>
      <div class="notification-message">{{ n.message }}</div>
      <div class="notification-time">{{ formatTime(n.createdAt) }}</div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useNotificationStore } from '../stores/notificationStore';
import { useFormatters } from '../composables/useFormatters';

const store = useNotificationStore();
const router = useRouter();
const { t } = useI18n();
const { formatDateTime } = useFormatters();

function formatTime(dateStr) {
  return formatDateTime(dateStr);
}

async function handleClick(n) {
  await store.markAsRead(n.id);
  if (n.link) router.push(n.link);
}
</script>

<style scoped>
.notification-list { max-height: 320px; overflow-y: auto; }
.notification-item {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 0.2s;
  color: var(--color-text);
}

.notification-item:hover { background: var(--color-bg); }
.notification-item.unread { background: var(--color-primary-soft); border-left: 3px solid var(--color-primary); }
.notification-title { font-weight: 600; font-size: 0.85rem; }
.notification-message { font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.25rem; }
.notification-time { font-size: 0.7rem; color: var(--color-text-muted); margin-top: 0.25rem; }
.empty { padding: 2rem; text-align: center; color: var(--color-text-muted); }
</style>
