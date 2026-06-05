<template>
  <div class="app-brand" :class="{ compact, centered }">
    <div class="app-brand-icon" aria-hidden="true">
      <NavIcon name="trophy" size="lg" />
    </div>
    <div v-if="showTitle" class="app-brand-copy">
      <strong>{{ title || t('brand.title') }}</strong>
      <span v-if="subtitle">{{ subtitle }}</span>
      <span v-else-if="showSubtitle">{{ t('brand.subtitle') }}</span>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import NavIcon from './NavIcon.vue';

defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  showTitle: { type: Boolean, default: true },
  showSubtitle: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
  centered: { type: Boolean, default: false },
});

const { t } = useI18n();
</script>
