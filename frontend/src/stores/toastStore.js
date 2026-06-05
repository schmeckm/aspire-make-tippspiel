import { defineStore } from 'pinia';
import { ref } from 'vue';

let nextId = 1;

const DEFAULT_DURATION = {
  success: 4000,
  info: 4000,
  warning: 5000,
  error: 6000,
};

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([]);

  function dismiss(id) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  }

  function show(message, type = 'info', duration) {
    const text = String(message || '').trim();
    if (!text) return null;

    const id = nextId;
    nextId += 1;
    const resolvedDuration = duration ?? DEFAULT_DURATION[type] ?? DEFAULT_DURATION.info;

    toasts.value.push({ id, message: text, type });

    if (resolvedDuration > 0) {
      setTimeout(() => dismiss(id), resolvedDuration);
    }

    return id;
  }

  function success(message, duration) {
    return show(message, 'success', duration);
  }

  function error(message, duration) {
    return show(message, 'error', duration);
  }

  function warning(message, duration) {
    return show(message, 'warning', duration);
  }

  function info(message, duration) {
    return show(message, 'info', duration);
  }

  return {
    toasts,
    show,
    dismiss,
    success,
    error,
    warning,
    info,
  };
});
