<template>
  <div v-if="inline && message" :class="['alert', `alert-${type}`]">
    {{ message }}
  </div>
</template>

<script setup>
import { watch } from 'vue';
import { useToastStore } from '../stores/toastStore';

const props = defineProps({
  message: { type: String, default: '' },
  type: { type: String, default: 'info' },
  inline: { type: Boolean, default: false },
  toast: { type: Boolean, default: true },
});

const toastStore = useToastStore();

watch(
  () => props.message,
  (message) => {
    if (!message || props.inline || !props.toast) return;
    toastStore.show(message, props.type);
  },
  { immediate: true },
);
</script>
