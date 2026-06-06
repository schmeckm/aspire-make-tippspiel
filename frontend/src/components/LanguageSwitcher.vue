<template>
  <div class="language-switcher">
    <label v-if="showLabel" :for="triggerId" class="language-label">{{ t('languages.label') }}</label>
    <LocalePicker
      :input-id="triggerId"
      :model-value="localeStore.locale"
      compact
      @update:model-value="onSelect"
    />
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { useLocaleStore } from '../stores/localeStore';
import { useAuthStore } from '../stores/authStore';
import LocalePicker from './LocalePicker.vue';

defineProps({
  showLabel: { type: Boolean, default: false },
});

const triggerId = `lang-${Math.random().toString(36).slice(2, 9)}`;
const { t } = useI18n();
const localeStore = useLocaleStore();
const authStore = useAuthStore();

async function onSelect(code) {
  await localeStore.setLocale(code, {
    persistProfile: authStore.isAuthenticated,
    userId: authStore.user?.id,
  });
}
</script>

<style scoped>
.language-switcher {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.language-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
  white-space: nowrap;
}
</style>
