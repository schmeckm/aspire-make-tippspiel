<template>
  <div class="toast-container" aria-live="polite" aria-relevant="additions">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        :class="['toast', `toast-${toast.type}`]"
        role="status"
      >
        <span class="toast-icon" aria-hidden="true">{{ iconFor(toast.type) }}</span>
        <p class="toast-message">{{ toast.message }}</p>
        <button
          type="button"
          class="toast-close"
          :aria-label="t('common.close')"
          @click="toastStore.dismiss(toast.id)"
        >
          ×
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { useToastStore } from '../stores/toastStore';

const { t } = useI18n();
const toastStore = useToastStore();

function iconFor(type) {
  return ({
    success: '✓',
    error: '!',
    warning: '⚠',
    info: 'i',
  })[type] || 'i';
}
</script>
