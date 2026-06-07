<template>
  <div class="ai-preview">
    <button v-if="!content && !loading" class="btn btn-secondary btn-sm" @click="loadPreview()">
      🤖 {{ t('ai.showPreview') }}
    </button>
    <LoadingSpinner v-if="loading" />
    <div v-if="content" class="ai-card">
      <div class="ai-card-header">
        <h4>🤖 {{ t('ai.matchPreviewTitle') }}</h4>
        <button class="modal-close" :aria-label="t('common.close')" @click="resetPreview">&times;</button>
      </div>
      <div class="ai-card-body">{{ content }}</div>
      <div class="ai-disclaimer">{{ disclaimer }}</div>
    </div>
    <AlertMessage v-if="error" :message="error" type="error" />
  </div>
</template>

<script setup>
import { toRef } from 'vue';
import { useI18n } from 'vue-i18n';
import LoadingSpinner from './LoadingSpinner.vue';
import AlertMessage from './AlertMessage.vue';
import { useMatchPreview } from '../composables/useMatchPreview';

const { t } = useI18n();

const props = defineProps({
  matchId: { type: Number, required: true },
});

const {
  content,
  disclaimer,
  loading,
  error,
  loadPreview,
  resetPreview,
} = useMatchPreview(toRef(props, 'matchId'));
</script>

<style scoped>
.ai-preview { margin-top: 0.75rem; }
.ai-card {
  background: var(--color-primary-soft);
  border: 1px solid rgba(0, 255, 127, 0.2);
  border-radius: var(--radius);
  padding: 1rem;
  margin-top: 0.5rem;
  box-shadow: var(--glow-card);
}
.ai-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.ai-card-header h4 { margin: 0; font-size: 0.9rem; color: var(--color-primary); }
.ai-card-body { font-size: 0.875rem; line-height: 1.6; white-space: pre-wrap; }
.ai-disclaimer { font-size: 0.7rem; color: var(--color-text-muted); margin-top: 0.75rem; font-style: italic; }
.modal-close { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--color-text-muted); }
</style>
