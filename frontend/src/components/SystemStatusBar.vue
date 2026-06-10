<template>
  <footer
    class="system-status-bar"
    role="status"
    :aria-label="t('systemHealth.title')"
  >
    <div
      v-if="expandedItem"
      class="system-status-detail"
      role="note"
    >
      <strong>{{ expandedItem.label }}:</strong> {{ expandedItem.detail }}
    </div>
    <div class="system-status-bar-inner">
      <div class="system-status-items">
        <button
          v-for="item in items"
          :key="item.key"
          type="button"
          class="system-status-item"
          :class="[item.state, { clickable: item.clickable, expanded: expandedItem?.key === item.key }]"
          :disabled="!item.clickable"
          :aria-expanded="item.clickable ? expandedItem?.key === item.key : undefined"
          :title="item.clickable ? t('systemHealth.clickForDetails') : undefined"
          @click="toggleDetail(item.key)"
        >
          <span class="system-status-label">{{ item.label }}</span>
          <span class="system-status-dot" aria-hidden="true"></span>
          <span class="system-status-value">{{ item.text }}</span>
        </button>
      </div>
      <div class="system-status-meta">
        <a
          href="https://github.com/schmeckm/aspire-make-tippspiel"
          class="system-status-github"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="t('systemHealth.githubAria')"
        >
          <svg class="system-status-github-icon" viewBox="0 0 16 16" aria-hidden="true">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
          <span>{{ t('systemHealth.github') }}</span>
        </a>
        <span v-if="version" class="system-status-version">v{{ version }}</span>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { useSystemHealth } from '../composables/useSystemHealth';

const { t } = useI18n();
const { items, version, expandedItem, toggleDetail } = useSystemHealth();
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

.system-status-detail {
  margin-bottom: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  background: rgba(220, 53, 69, 0.08);
  border: 1px solid rgba(220, 53, 69, 0.2);
  color: var(--color-text);
  font-size: 0.75rem;
  line-height: 1.4;
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
  gap: 1.25rem;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}

.system-status-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.system-status-github {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-decoration: none;
  white-space: nowrap;
}

.system-status-github-icon {
  width: 0.95rem;
  height: 0.95rem;
  flex-shrink: 0;
}

.system-status-github:hover {
  color: var(--color-primary);
  text-decoration: none;
}

.system-status-github:hover span {
  text-decoration: underline;
}

.system-status-version {
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
  flex: 0 1 auto;
  min-width: 0;
  font-size: 0.75rem;
  white-space: nowrap;
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  color: inherit;
}

.system-status-item.clickable {
  cursor: pointer;
}

.system-status-item.clickable:hover .system-status-value,
.system-status-item.clickable.expanded .system-status-value {
  text-decoration: underline;
}

.system-status-item:disabled {
  cursor: default;
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
  background: var(--color-text-muted);
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
  color: var(--color-success);
}

.system-status-item.offline .system-status-dot {
  background: var(--color-danger);
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.2);
}

.system-status-item.offline .system-status-value {
  color: var(--color-danger);
}

.system-status-item.inactive .system-status-dot {
  background: var(--color-text-muted);
  opacity: 0.55;
  box-shadow: none;
}

.system-status-item.inactive .system-status-value {
  color: var(--color-text-muted);
}

.system-status-item.inactive.clickable:hover .system-status-value,
.system-status-item.inactive.clickable.expanded .system-status-value {
  text-decoration: underline;
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
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .system-status-items {
    gap: 0.5rem 0.75rem;
    justify-content: flex-start;
  }

  .system-status-meta {
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .system-status-github {
    font-size: 0.65rem;
  }

  .system-status-github-icon {
    width: 0.85rem;
    height: 0.85rem;
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
