<template>
  <div>
    <div class="page-header">
      <h1>{{ t('nav.dashboard') }}</h1>
      <span class="text-muted">{{ t('dashboard.welcome', { name: authStore.user?.firstName }) }} 👋</span>
    </div>

    <LoadingSpinner v-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="loadDashboardData" />

    <template v-else>
      <div v-if="missingCount > 0" class="card dashboard-onboarding">
        <div class="card-body">
          <h2 class="dashboard-onboarding-title">{{ t('dashboard.onboarding.title') }}</h2>
          <p class="dashboard-onboarding-text">{{ t('dashboard.onboarding.text', { count: missingCount }) }}</p>
          <div class="dashboard-onboarding-actions">
            <router-link :to="{ path: '/matches', query: { filter: 'missing' } }" class="btn btn-primary btn-sm">
              {{ t('dashboard.onboarding.tipNow') }}
            </router-link>
            <router-link to="/bonus" class="btn btn-secondary btn-sm">{{ t('dashboard.onboarding.bonus') }}</router-link>
            <router-link to="/help" class="btn btn-secondary btn-sm">{{ t('dashboard.onboarding.rules') }}</router-link>
          </div>
        </div>
      </div>

      <div v-if="lockWarning" class="alert alert-warning lock-warning" role="status">
        {{ lockWarning }}
      </div>

      <AIInsightCard />

      <MatchdayChallengeCard />

      <StreakCard />

      <ActivityFeedCard />

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
        <router-link
          :to="{ path: '/matches', query: { filter: missingCount > 0 ? 'missing' : undefined } }"
          class="stat-card stat-card--link"
          :class="{ 'stat-card--highlight': missingCount > 0 }"
        >
          <div class="stat-value">{{ formatNumber(missingCount) }}</div>
          <div class="stat-label">{{ t('dashboard.missingTips') }}</div>
          <span v-if="missingCount > 0" class="stat-card-hint">{{ t('dashboard.missingTipsAction') }}</span>
        </router-link>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <h3>⚽ {{ t('dashboard.nextMatches') }}</h3>
            <router-link to="/matches" class="btn btn-secondary btn-sm">{{ t('dashboard.allMatches') }}</router-link>
          </div>
          <div class="card-body">
            <EmptyState
              v-if="upcomingMatches.length === 0"
              icon="📅"
              :message="t('dashboard.noUpcoming')"
              :action-label="t('dashboard.allMatches')"
              action-to="/matches"
            />
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import MatchCard from '../components/MatchCard.vue';
import LeaderboardTable from '../components/LeaderboardTable.vue';
import AIInsightCard from '../components/AIInsightCard.vue';
import MatchdayChallengeCard from '../components/MatchdayChallengeCard.vue';
import StreakCard from '../components/StreakCard.vue';
import ActivityFeedCard from '../components/ActivityFeedCard.vue';
import TeamDashboardCard from '../components/TeamDashboardCard.vue';
import ErrorState from '../components/ErrorState.vue';
import EmptyState from '../components/EmptyState.vue';
import { onSocketEvent } from '../services/socket';
import { useFormatters } from '../composables/useFormatters';

const LOCK_WARNING_MS = 15 * 60 * 1000;

const { t } = useI18n();
const { formatNumber, formatPoints } = useFormatters();
const authStore = useAuthStore();
const loading = ref(true);
const error = ref('');
const matches = ref([]);
const leaderboard = ref([]);
const now = ref(Date.now());
let lockTimer = null;

const myEntry = computed(() => leaderboard.value.find((e) => e.userId === authStore.user?.id));
const myRank = computed(() => myEntry.value?.rank);
const myPoints = computed(() => myEntry.value?.totalPoints ?? 0);
const submittedCount = computed(() => myEntry.value?.submittedPredictions ?? 0);

const openMatches = computed(() => matches.value.filter((m) => m.canPredict));
const missingCount = computed(() => openMatches.value.filter((m) => !m.hasPrediction).length);

const lockWarning = computed(() => {
  const urgent = openMatches.value.filter((match) => {
    const kickoff = new Date(match.kickoffTime).getTime();
    const remaining = kickoff - now.value;
    return remaining > 0 && remaining <= LOCK_WARNING_MS;
  });

  if (urgent.length === 0) return '';

  const missing = urgent.filter((m) => !m.hasPrediction);
  if (missing.length > 0) {
    return t('matches.lockWarningMissing', { count: missing.length });
  }
  return t('matches.lockWarningSoon', { count: urgent.length });
});

const needsLockTimer = computed(() =>
  openMatches.value.some((match) => {
    const kickoff = new Date(match.kickoffTime).getTime();
    const remaining = kickoff - now.value;
    return remaining > 0 && remaining <= LOCK_WARNING_MS + 60_000;
  }),
);

const upcomingMatches = computed(() => {
  const now = new Date();
  return matches.value
    .filter((m) => new Date(m.kickoffTime) > now && m.status !== 'finished')
    .slice(0, 3);
});

const top5 = computed(() => leaderboard.value.slice(0, 5));
let unsubMatch = null;
let unsubLeaderboard = null;

function syncLockTimer() {
  if (needsLockTimer.value && !lockTimer) {
    now.value = Date.now();
    lockTimer = setInterval(() => {
      now.value = Date.now();
    }, 1000);
  } else if (!needsLockTimer.value && lockTimer) {
    clearInterval(lockTimer);
    lockTimer = null;
  }
}

function updateMatch(updated) {
  const idx = matches.value.findIndex((m) => m.id === updated.id);
  if (idx >= 0) {
    const existing = matches.value[idx];
    matches.value[idx] = { ...existing, ...updated, prediction: existing.prediction };
    syncLockTimer();
  }
}

async function refreshLeaderboard() {
  try {
    const { data } = await api.get('/leaderboard');
    leaderboard.value = data;
  } catch {
    // keep existing data on background refresh failure
  }
}

async function loadDashboardData() {
  const [matchesRes, leaderboardRes] = await Promise.all([
    api.get('/matches'),
    api.get('/leaderboard'),
  ]);
  matches.value = matchesRes.data;
  leaderboard.value = leaderboardRes.data;
  syncLockTimer();
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

  unsubMatch = onSocketEvent('match:update', updateMatch);
  unsubLeaderboard = onSocketEvent('leaderboard:update', (data) => {
    if (Array.isArray(data)) leaderboard.value = data;
    else refreshLeaderboard();
  });
});

onUnmounted(() => {
  unsubMatch?.();
  unsubLeaderboard?.();
  if (lockTimer) clearInterval(lockTimer);
});
</script>

<style scoped>
.dashboard-onboarding {
  margin-bottom: 1rem;
  border-color: rgba(0, 255, 127, 0.25);
}

.dashboard-onboarding-title {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
}

.dashboard-onboarding-text {
  margin: 0 0 0.75rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.dashboard-onboarding-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lock-warning {
  margin-bottom: 1rem;
}

.stat-card--link {
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.stat-card--link:hover {
  border-color: var(--color-primary);
  box-shadow: var(--glow-card);
}

.stat-card--highlight {
  border-color: rgba(0, 255, 127, 0.35);
}

.stat-card-hint {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-primary);
}
</style>
