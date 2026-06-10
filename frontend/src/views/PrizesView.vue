<template>
  <div>
    <div class="page-header">
      <h1>{{ t('prizes.title') }}</h1>
      <p class="text-muted">{{ t('prizes.subtitle') }}</p>
    </div>

    <LoadingSpinner v-if="loading" />

    <ErrorState
      v-else-if="error"
      :message="error"
      @retry="loadPrizes"
    />

    <ErrorState
      v-else-if="!prizesEnabled"
      :message="t('prizes.disabled')"
      :showRetry="false"
    />

    <div v-else-if="visiblePrizes.length === 0" class="card">
      <div class="card-body text-muted">{{ t('prizes.empty') }}</div>
    </div>

    <div v-else class="prizes-podium">
      <article
        v-for="prize in visiblePrizes"
        :key="prize.rank"
        :class="['prize-card', `prize-card--rank-${prize.rank}`]"
      >
        <div class="prize-card-header">
          <RankTrophyIcon :rank="prize.rank" class="prize-trophy" />
          <span class="prize-rank">{{ t('prizes.place', { rank: prize.rank }) }}</span>
        </div>
        <div class="prize-image-wrap">
          <img
            v-if="prize.imageUrl"
            :src="appSettings.resolvePrizeImageUrl(prize.imageUrl, prize.rank)"
            :alt="prize.title || t('prizes.place', { rank: prize.rank })"
            class="prize-image"
            loading="lazy"
            decoding="async"
          />
        </div>
        <h2 class="prize-title">{{ prize.title || t('prizes.place', { rank: prize.rank }) }}</h2>
        <p v-if="prize.value" class="prize-value">{{ prize.value }}</p>
        <p v-if="prize.description" class="prize-description">{{ prize.description }}</p>
      </article>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import ErrorState from '../components/ErrorState.vue';
import RankTrophyIcon from '../components/RankTrophyIcon.vue';
import { useAppSettingsStore } from '../stores/appSettingsStore';

const { t } = useI18n();
const appSettings = useAppSettingsStore();

const loading = ref(true);
const error = ref('');
const prizesEnabled = ref(false);
const prizes = ref([]);

const visiblePrizes = computed(() =>
  [...prizes.value]
    .filter((p) => p.title || p.description || p.value || p.imageUrl)
    .sort((a, b) => a.rank - b.rank),
);

async function loadPrizes() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/settings');
    prizesEnabled.value = !!data.prizesEnabled;
    prizes.value = Array.isArray(data.prizes) ? data.prizes : [];
    prizes.value.forEach((prize) => {
      if (prize.imageUrl) appSettings.bumpPrizeImageVersion(prize.rank);
    });
    appSettings.applySettings(data);
  } catch (err) {
    error.value = err.response?.data?.error || t('prizes.loadFailed');
  } finally {
    loading.value = false;
  }
}

onMounted(loadPrizes);
</script>

<style scoped>
.prizes-podium {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  align-items: stretch;
}

.prize-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.25rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: var(--glow-card);
}

.prize-card--rank-1 {
  order: 2;
  border-color: rgba(255, 215, 0, 0.35);
  background: linear-gradient(180deg, rgba(255, 215, 0, 0.08) 0%, var(--color-surface) 100%);
}

.prize-card--rank-2 {
  order: 1;
  border-color: rgba(192, 192, 192, 0.35);
}

.prize-card--rank-3 {
  order: 3;
  border-color: rgba(205, 127, 50, 0.35);
}

@media (min-width: 768px) {
  .prizes-podium {
    grid-template-columns: 1fr 1.15fr 1fr;
  }
}

.prize-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.prize-trophy :deep(svg) {
  width: 2rem;
  height: 2rem;
}

.prize-rank {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}

.prize-title {
  font-size: 1.15rem;
  margin: 0;
}

.prize-image-wrap {
  width: 100%;
  aspect-ratio: 4 / 3;
  min-height: 10rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  overflow: hidden;
  flex-shrink: 0;
}

.prize-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}

.prize-value {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-primary);
  margin: 0;
}

.prize-description {
  margin: 0;
  line-height: 1.5;
  color: var(--color-text-muted);
  font-size: 0.925rem;
}
</style>
