<template>
  <div v-if="showBanner" :class="['manual-mode-banner', apiConfigured ? 'api-mode' : 'csv-mode']">
    <div class="banner-content">
      <strong v-if="!apiConfigured">{{ t('admin.manualMode.csvTitle') }}</strong>
      <strong v-else>{{ t('admin.manualMode.apiTitle') }}</strong>
      <p>{{ statusMessage || t('admin.manualMode.defaultMessage') }}</p>
    </div>
    <div class="banner-actions">
      <router-link to="/admin/import" class="btn btn-secondary btn-sm">{{ t('admin.manualMode.csvImport') }}</router-link>
      <router-link to="/admin/results" class="btn btn-secondary btn-sm">{{ t('admin.manualMode.results') }}</router-link>
      <router-link to="/admin/matches" class="btn btn-secondary btn-sm">{{ t('admin.manualMode.editMatches') }}</router-link>
      <button class="btn btn-accent btn-sm" :disabled="recalculating" @click="$emit('recalculate')">
        {{ recalculating ? t('admin.manualMode.recalculating') : t('admin.manualMode.recalculate') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  apiConfigured: { type: Boolean, default: false },
  statusMessage: { type: String, default: '' },
  showWhenApiConfigured: { type: Boolean, default: true },
  recalculating: { type: Boolean, default: false },
});

defineEmits(['recalculate']);

const showBanner = computed(() => props.showWhenApiConfigured || !props.apiConfigured);
</script>

<style scoped>
.manual-mode-banner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: var(--radius);
  margin-bottom: 1.5rem;
  border: 1px solid var(--color-border);
}
.csv-mode {
  background: var(--color-warning-bg);
  border-left: 4px solid var(--color-warning);
}
.api-mode {
  background: var(--color-primary-soft);
  border-left: 4px solid var(--color-primary);
}
.banner-content p { margin: 0.25rem 0 0; font-size: 0.875rem; color: var(--color-text-muted); }
.banner-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
</style>
