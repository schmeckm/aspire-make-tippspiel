<template>
  <div>
    <div class="page-header">
      <h1>{{ t('leaderboard.title') }}</h1>
      <div class="btn-group">
        <button class="btn btn-secondary btn-sm" @click="exportCsv">{{ t('leaderboard.exportCsv') }}</button>
      </div>
    </div>

    <details class="card leaderboard-columns-help">
      <summary class="card-header leaderboard-columns-help__summary">
        {{ t('help.sections.scoring.title') }}
      </summary>
      <div class="card-body">
        <ul class="leaderboard-columns-help__list">
          <li>{{ t('help.scoring.exact', points) }}</li>
          <li>{{ t('help.scoring.goalDiff', points) }}</li>
          <li>{{ t('help.scoring.tendency', points) }}</li>
          <li class="text-muted">
            {{ t('leaderboard.correct') }} = {{ t('leaderboard.exact') }} + {{ t('leaderboard.goalDiff') }} + {{ t('leaderboard.tendency') }}
          </li>
        </ul>
        <router-link to="/rules-help" class="btn btn-secondary btn-sm">
          {{ t('help.title') }}
        </router-link>
      </div>
    </details>

    <div class="filter-bar">
      <button
        v-for="f in filters"
        :key="f.value"
        :class="['filter-btn', { active: activeFilter === f.value }]"
        :aria-pressed="activeFilter === f.value"
        @click="setFilter(f.value)"
      >
        {{ f.label }}
      </button>
    </div>

    <AILeaderboardSummary />

    <LoadingSpinner v-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="loadLeaderboard" />
    <div v-else class="card"><div class="card-body"><LeaderboardTable :entries="leaderboard" :current-user-id="authStore.user?.id" /></div></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api, { downloadAuthenticatedFile } from '../services/api';
import { useToast } from '../composables/useToast';
import { onSocketEvent } from '../services/socket';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import LeaderboardTable from '../components/LeaderboardTable.vue';
import AILeaderboardSummary from '../components/AILeaderboardSummary.vue';
import ErrorState from '../components/ErrorState.vue';
import { useAuthStore } from '../stores/authStore';
import { useScoringRules } from '../composables/useScoringRules';

const authStore = useAuthStore();

const { t } = useI18n();
const toast = useToast();
const { points } = useScoringRules();

const filters = computed(() => [
  { value: 'overall', label: t('leaderboard.filters.overall') },
  { value: 'match', label: t('leaderboard.filters.match') },
  { value: 'bonus', label: t('leaderboard.filters.bonus') },
  { value: 'group', label: t('leaderboard.filters.group') },
  { value: 'knockout', label: t('leaderboard.filters.knockout') },
]);

const activeFilter = ref('overall');
const leaderboard = ref([]);
const loading = ref(true);
const error = ref('');
let unsub = null;

async function loadLeaderboard() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/leaderboard', { params: { filter: activeFilter.value } });
    leaderboard.value = data;
  } catch (err) {
    error.value = err.response?.data?.error || t('leaderboard.loadFailed');
  } finally {
    loading.value = false;
  }
}

function setFilter(value) {
  activeFilter.value = value;
  loadLeaderboard();
}

async function exportCsv() {
  try {
    await downloadAuthenticatedFile(
      `/leaderboard/export?filter=${activeFilter.value}`,
      `hitliste-${activeFilter.value}.csv`,
    );
  } catch {
    toast.error(t('leaderboard.exportFailed'));
  }
}

onMounted(() => {
  loadLeaderboard();
  unsub = onSocketEvent('leaderboard:update', loadLeaderboard);
});

onUnmounted(() => unsub?.());
</script>

<style scoped>
.leaderboard-columns-help {
  margin-bottom: 1rem;
}

.leaderboard-columns-help__summary {
  cursor: pointer;
  user-select: none;
}

.leaderboard-columns-help__list {
  margin: 0 0 0.75rem;
  padding-left: 1.25rem;
  line-height: 1.6;
}
</style>
