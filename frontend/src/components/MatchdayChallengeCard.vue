<template>
  <div class="card">
    <div class="card-header">
      <h3>🔥 {{ t('challenges.matchdayChampion.title') }}</h3>
      <span v-if="challenge?.date" class="text-muted">{{ challenge.date }}</span>
    </div>

    <div class="card-body">
      <LoadingSpinner v-if="loading" />
      <ErrorState v-else-if="error" :message="error" @retry="load" />
      <EmptyState
        v-else-if="!challenge || (challenge.finishedMatchCount ?? 0) === 0"
        icon="🎯"
        :message="t('challenges.matchdayChampion.empty')"
      />

      <template v-else>
        <p class="text-muted challenge-subtitle">
          {{ t('challenges.matchdayChampion.subtitle', { count: challenge.finishedMatchCount }) }}
        </p>

        <div v-if="challenge.winner" class="challenge-winner">
          <strong>#1 {{ challenge.winner.firstName }} {{ challenge.winner.lastName }}</strong>
          <span class="badge badge-info">{{ t('challenges.matchdayChampion.points', { points: challenge.winner.totalPoints }) }}</span>
          <span v-if="challenge.winner.exactResults" class="badge badge-secondary">
            {{ t('challenges.matchdayChampion.exact', { count: challenge.winner.exactResults }) }}
          </span>
        </div>

        <LeaderboardTable
          :entries="challenge.standings"
          :current-user-id="authStore.user?.id"
          :show-movement="false"
          :compact="true"
        />
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
import EmptyState from './EmptyState.vue';
import LeaderboardTable from './LeaderboardTable.vue';
import { useAuthStore } from '../stores/authStore';

const { t } = useI18n();
const authStore = useAuthStore();

const loading = ref(true);
const error = ref('');
const challenge = ref(null);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/challenges/matchday');
    challenge.value = data;
  } catch (err) {
    error.value = err.response?.data?.error || t('challenges.matchdayChampion.loadFailed');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.challenge-subtitle {
  margin: 0 0 0.75rem;
}

.challenge-winner {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  margin-bottom: 0.75rem;
}
</style>

