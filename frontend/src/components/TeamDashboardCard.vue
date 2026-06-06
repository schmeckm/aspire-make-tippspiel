<template>
  <div v-if="authStore.user?.teamId" class="card team-dashboard mb-2">
    <div class="card-header">
      <h3>👥 {{ t('teamDashboard.title') }}</h3>
      <router-link to="/team-ranking" class="btn btn-secondary btn-sm">
        {{ t('teamDashboard.fullRanking') }}
      </router-link>
    </div>
    <div class="card-body">
      <LoadingSpinner v-if="loading" />
      <template v-else-if="myTeamStats">
        <div class="team-dashboard-header">
          <TeamAvatar :image-url="myTeamStats.imageUrl" :name="myTeamStats.teamName" size="md" />
          <strong>{{ myTeamStats.teamName }}</strong>
          <span class="badge badge-info">#{{ myTeamStats.rank }}</span>
        </div>
        <div class="stats-grid team-stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ formatPoints(myTeamStats.averagePoints) }}</div>
            <div class="stat-label">{{ t('teamDashboard.avgPoints') }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ formatNumber(myTeamStats.totalPoints) }}</div>
            <div class="stat-label">{{ t('teamDashboard.totalPoints') }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ formatNumber(myTeamStats.userCount) }}</div>
            <div class="stat-label">{{ t('teamDashboard.members') }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ myRankInTeam ? `#${myRankInTeam}` : '–' }}</div>
            <div class="stat-label">{{ t('teamDashboard.myRankInTeam') }}</div>
          </div>
        </div>
        <div v-if="teamColleagues.length" class="team-colleagues">
          <h4>{{ t('teamDashboard.colleagues') }}</h4>
          <ul class="colleague-list">
            <li v-for="member in teamColleagues.slice(0, 5)" :key="member.userId">
              <span class="colleague-name">
                <UserAvatar
                  :image-url="member.imageUrl"
                  :avatar-color="member.avatarColor"
                  :first-name="member.firstName"
                  :last-name="member.lastName"
                  size="xs"
                />
                {{ member.firstName }} {{ member.lastName }}
              </span>
              <span class="text-muted">#{{ member.rank }} · {{ formatPoints(member.totalPoints) }} {{ t('bonus.pointsShort') }}</span>
            </li>
          </ul>
        </div>
      </template>
    </div>
  </div>
  <div v-else class="card team-dashboard mb-2">
    <div class="card-body">
      <p class="text-muted mb-0">
        {{ t('teamDashboard.noTeam') }}
        <router-link to="/profile">{{ t('teamDashboard.goToProfile') }}</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner.vue';
import TeamAvatar from './TeamAvatar.vue';
import UserAvatar from './UserAvatar.vue';
import { useFormatters } from '../composables/useFormatters';

const { t } = useI18n();
const authStore = useAuthStore();
const { formatNumber, formatPoints } = useFormatters();

const loading = ref(true);
const teamRanking = ref([]);
const leaderboard = ref([]);

const myTeamStats = computed(() => {
  const teamId = authStore.user?.teamId;
  if (!teamId) return null;
  return teamRanking.value.find((t) => t.teamId === teamId) || null;
});

const teamColleagues = computed(() => {
  const teamId = authStore.user?.teamId;
  if (!teamId) return [];
  return leaderboard.value
    .filter((e) => e.teamId === teamId)
    .sort((a, b) => a.rank - b.rank);
});

const myRankInTeam = computed(() => {
  const idx = teamColleagues.value.findIndex((e) => e.userId === authStore.user?.id);
  return idx >= 0 ? idx + 1 : null;
});

onMounted(async () => {
  if (!authStore.user?.teamId) {
    loading.value = false;
    return;
  }
  try {
    const [rankRes, lbRes] = await Promise.all([
      api.get('/leaderboard/team-ranking'),
      api.get('/leaderboard'),
    ]);
    teamRanking.value = rankRes.data;
    leaderboard.value = lbRes.data;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.team-dashboard-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.team-stats-grid {
  margin-bottom: 1rem;
}

.team-colleagues h4 {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  color: var(--color-text-muted);
}

.colleague-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.colleague-list li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.875rem;
}

.colleague-list li:last-child {
  border-bottom: none;
}

.colleague-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
