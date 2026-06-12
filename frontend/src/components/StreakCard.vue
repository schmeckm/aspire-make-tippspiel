<template>
  <div class="card">
    <div class="card-header">
      <h3>🏅 {{ t('achievements.streak.title') }}</h3>
    </div>
    <div class="card-body">
      <LoadingSpinner v-if="loading" />
      <ErrorState v-else-if="error" :message="error" @retry="load" />

      <template v-else>
        <div class="streak-metrics">
          <div class="streak-metric">
            <div class="streak-value">{{ summary?.current?.count ?? 0 }}</div>
            <div class="streak-label">{{ t('achievements.streak.current') }}</div>
          </div>
          <div class="streak-metric">
            <div class="streak-value">{{ summary?.best?.count ?? 0 }}</div>
            <div class="streak-label">{{ t('achievements.streak.best') }}</div>
          </div>
        </div>

        <div class="streak-badges">
          <div
            v-for="a in (summary?.achievements || [])"
            :key="a.key"
            class="streak-badge"
            :class="{ 'streak-badge--unlocked': a.unlocked }"
          >
            <strong>{{ t(a.titleKey) }}</strong>
            <span class="text-muted">{{ t(a.descriptionKey, { threshold: a.threshold }) }}</span>
            <div class="progress">
              <div class="progress-bar" :style="{ width: `${Math.round((a.progress || 0) * 100)}%` }" />
            </div>
          </div>
        </div>

        <p class="text-muted streak-hint">
          {{ t('achievements.streak.hint') }}
        </p>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner.vue';
import ErrorState from './ErrorState.vue';

const { t } = useI18n();

const loading = ref(true);
const error = ref('');
const summary = ref(null);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/achievements/me');
    summary.value = data;
  } catch (err) {
    error.value = err.response?.data?.error || t('achievements.streak.loadFailed');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.streak-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.streak-metric {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.75rem;
  background: var(--color-surface);
}

.streak-value {
  font-size: 1.25rem;
  font-weight: 800;
}

.streak-label {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  margin-top: 0.15rem;
}

.streak-badges {
  display: grid;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
}

.streak-badge {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.02);
}

.streak-badge--unlocked {
  border-color: rgba(0, 255, 127, 0.35);
  box-shadow: var(--glow-card);
}

.progress {
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  margin-top: 0.4rem;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--color-primary);
}

.streak-hint {
  margin: 0;
}
</style>

