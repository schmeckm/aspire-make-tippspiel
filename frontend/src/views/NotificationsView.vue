<template>
  <div>
    <div class="page-header">
      <h1>{{ t('notifications.title') }}</h1>
      <button class="btn btn-secondary btn-sm" @click="store.markAllAsRead()">{{ t('notifications.markAllReadLong') }}</button>
    </div>
    <div class="card"><div class="card-body"><NotificationList /></div></div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNotificationStore } from '../stores/notificationStore';
import NotificationList from '../components/NotificationList.vue';

const { t } = useI18n();
const store = useNotificationStore();
onMounted(() => store.fetchNotifications());
</script>

<style scoped>
:deep(.notification-list) { max-height: none; }
:deep(.notification-item) { padding: 1rem; }
</style>
