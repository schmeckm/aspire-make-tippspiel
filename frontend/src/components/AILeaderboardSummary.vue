<template>
  <div v-if="content || loading || error" class="ai-leaderboard-summary">
    <LoadingSpinner v-if="loading" />
    <div v-else-if="content" class="ai-summary-card">
      <div class="summary-header">
        <h4>🎙️ {{ t('ai.leaderboardSummaryTitle') }}</h4>
        <span v-if="cached" class="badge badge-info">{{ t('ai.cached') }}</span>
      </div>
      <p class="summary-text">{{ content }}</p>
      <p class="ai-disclaimer">{{ disclaimer }}</p>
    </div>
    <AlertMessage v-else-if="error" :message="error" type="warning" inline />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner.vue';
import AlertMessage from './AlertMessage.vue';

const { t } = useI18n();

const content = ref('');
const disclaimer = ref('');
const cached = ref(false);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    const { data } = await api.get('/ai/leaderboard-summary');
    if (data.unavailable || !data.content) {
      error.value = data.error || t('ai.leaderboardSummaryUnavailable');
      return;
    }
    content.value = data.content;
    disclaimer.value = data.disclaimer || t('ai.disclaimer');
    cached.value = data.cached;
  } catch (err) {
    const status = err.response?.status;
    if (status === 429) {
      error.value = err.response?.data?.error || t('ai.leaderboardSummaryRateLimit');
    } else {
      error.value = err.response?.data?.error || t('ai.leaderboardSummaryUnavailable');
    }
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.ai-summary-card {
  background: var(--color-primary-soft);
  border: 1px solid rgba(0, 255, 127, 0.2);
  border-radius: var(--radius);
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  box-shadow: var(--glow-card);
}
.summary-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
.summary-header h4 { margin: 0; color: var(--color-primary-dark); }
.summary-text { font-size: 0.95rem; line-height: 1.6; margin: 0; }
.ai-disclaimer { font-size: 0.7rem; color: var(--color-text-muted); margin-top: 0.75rem; font-style: italic; }
</style>
