<template>
  <div>
    <div class="page-header">
      <h1>{{ t('nav.dashboard') }}</h1>
      <span class="text-muted">{{ t('dashboard.welcome', { name: authStore.user?.firstName }) }} 👋</span>
    </div>

    <LoadingSpinner v-if="loading" />
    <AlertMessage v-else-if="error" :message="error" type="error" />

    <template v-else>
      <AIInsightCard />

      <TeamDashboardCard />

      <div class="stats-grid">
        <div class="stat-card accent">
          <div class="stat-value">#{{ myRank || '–' }}</div>
          <div class="stat-label">{{ t('dashboard.currentRank') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ formatPoints(myPoints) }}</div>
          <div class="stat-label">{{ t('dashboard.totalPoints') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ formatNumber(submittedCount) }}</div>
          <div class="stat-label">{{ t('dashboard.tipsSubmitted') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ formatNumber(missingCount) }}</div>
          <div class="stat-label">{{ t('dashboard.missingTips') }}</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <h3>⚽ {{ t('dashboard.nextMatches') }}</h3>
            <router-link to="/matches" class="btn btn-secondary btn-sm">{{ t('dashboard.allMatches') }}</router-link>
          </div>
          <div class="card-body">
            <div v-if="upcomingMatches.length === 0" class="empty-state">
              <div class="empty-icon">📅</div>
              <p>{{ t('dashboard.noUpcoming') }}</p>
            </div>
            <MatchCard
              v-for="match in upcomingMatches"
              :key="match.id"
              :match="match"
              @saved="loadDashboardData"
            />
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>🏆 {{ t('dashboard.top5') }}</h3>
            <router-link to="/leaderboard" class="btn btn-secondary btn-sm">{{ t('dashboard.fullLeaderboard') }}</router-link>
          </div>
          <div class="card-body">
            <LeaderboardTable :entries="top5" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import MatchCard from '../components/MatchCard.vue';
import LeaderboardTable from '../components/LeaderboardTable.vue';
import AIInsightCard from '../components/AIInsightCard.vue';
import TeamDashboardCard from '../components/TeamDashboardCard.vue';
import AlertMessage from '../components/AlertMessage.vue';
import { useFormatters } from '../composables/useFormatters';

const { t } = useI18n();
const { formatNumber, formatPoints } = useFormatters();
const authStore = useAuthStore();
const loading = ref(true);
const error = ref('');
const matches = ref([]);
const leaderboard = ref([]);

const myEntry = computed(() => leaderboard.value.find((e) => e.userId === authStore.user?.id));
const myRank = computed(() => myEntry.value?.rank);
const myPoints = computed(() => myEntry.value?.totalPoints ?? 0);
const submittedCount = computed(() => myEntry.value?.submittedPredictions ?? 0);

const openMatches = computed(() => matches.value.filter((m) => m.canPredict));
const missingCount = computed(() => openMatches.value.filter((m) => !m.hasPrediction).length);

const upcomingMatches = computed(() => {
  const now = new Date();
  return matches.value
    .filter((m) => new Date(m.kickoffTime) > now && m.status !== 'finished')
    .slice(0, 3);
});

const top5 = computed(() => leaderboard.value.slice(0, 5));

async function loadDashboardData() {
  const [matchesRes, leaderboardRes] = await Promise.all([
    api.get('/matches'),
    api.get('/leaderboard'),
  ]);
  matches.value = matchesRes.data;
  leaderboard.value = leaderboardRes.data;
}

onMounted(async () => {
  error.value = '';
  try {
    await loadDashboardData();
  } catch (err) {
    error.value = err.response?.data?.error || t('dashboard.loadFailed');
  } finally {
    loading.value = false;
  }
});
</script>
