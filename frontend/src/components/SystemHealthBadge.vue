<template>
  <div class="system-status-panel" role="status" :aria-label="t('systemHealth.title')">
    <div class="system-status-title">{{ t('systemHealth.title') }}</div>
    <div
      v-for="item in items"
      :key="item.key"
      class="system-status-row"
      :class="item.state"
    >
      <span class="system-status-dot" aria-hidden="true"></span>
      <span class="system-status-label">{{ item.label }}</span>
      <span class="system-status-value">{{ item.text }}</span>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { useSystemHealth } from '../composables/useSystemHealth';

const { t } = useI18n();
const { items } = useSystemHealth();
</script>

<style scoped>
.system-status-panel {
  margin-bottom: 1rem;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.system-status-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.system-status-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  font-size: 0.8rem;
}

.system-status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.system-status-label {
  font-weight: 600;
  color: var(--color-text);
}

.system-status-value {
  font-weight: 600;
  text-align: right;
}

.system-status-row.checking .system-status-dot {
  background: #9ca3af;
  animation: pulse 1.2s ease-in-out infinite;
}

.system-status-row.checking .system-status-value {
  color: var(--color-text-muted);
}

.system-status-row.online .system-status-dot {
  background: var(--color-success);
  box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.2);
}

.system-status-row.online .system-status-value {
  color: #166534;
}

.system-status-row.offline .system-status-dot {
  background: var(--color-danger);
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.2);
}

.system-status-row.offline .system-status-value {
  color: #991b1b;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
