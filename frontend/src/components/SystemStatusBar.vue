<template>
  <footer class="system-status-bar" role="status" :aria-label="t('systemHealth.title')">
    <div class="system-status-bar-inner">
      <div class="system-status-items">
        <div
          v-for="item in items"
          :key="item.key"
          class="system-status-item"
          :class="item.state"
        >
          <span class="system-status-label">{{ item.label }}</span>
          <span class="system-status-dot" aria-hidden="true"></span>
          <span class="system-status-value">{{ item.text }}</span>
        </div>
      </div>
      <span v-if="version" class="system-status-version">v{{ version }}</span>
    </div>
  </footer>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { useSystemHealth } from '../composables/useSystemHealth';

const { t } = useI18n();
const { items, version } = useSystemHealth();
</script>

<style scoped>
.system-status-bar {
  flex-shrink: 0;
  margin-top: auto;
  width: 100%;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
  padding: 0.625rem 2rem;
}

.system-status-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  width: 100%;
}

.system-status-items {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  flex: 1;
  min-width: 0;
}

.system-status-version {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.system-status-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  flex: 1;
  min-width: 0;
  font-size: 0.75rem;
  white-space: nowrap;
}

.system-status-label {
  font-weight: 600;
  color: var(--color-text-muted);
}

.system-status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.system-status-value {
  font-weight: 600;
}

.system-status-item.checking .system-status-dot {
  background: #9ca3af;
  animation: pulse 1.2s ease-in-out infinite;
}

.system-status-item.checking .system-status-value {
  color: var(--color-text-muted);
}

.system-status-item.online .system-status-dot {
  background: var(--color-success);
  box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.2);
}

.system-status-item.online .system-status-value {
  color: #166534;
}

.system-status-item.offline .system-status-dot {
  background: var(--color-danger);
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.2);
}

.system-status-item.offline .system-status-value {
  color: #991b1b;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@media (max-width: 768px) {
  .system-status-bar {
    padding: 0.625rem 1rem;
  }

  .system-status-bar-inner {
    gap: 0.75rem;
  }

  .system-status-items {
    gap: 0.75rem;
  }

  .system-status-version {
    font-size: 0.65rem;
  }

  .system-status-item {
    font-size: 0.65rem;
    gap: 0.25rem;
  }

  .system-status-label {
    display: none;
  }
}
</style>
