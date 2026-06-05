<template>
  <div>
    <div class="page-header">
      <h1>{{ t('teamRanking.title') }}</h1>
    </div>

    <LoadingSpinner v-if="loading" />

    <div v-else class="card">
      <div class="card-body">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{{ t('leaderboard.rank') }}</th>
                <th>{{ t('teamRanking.team') }}</th>
                <th>{{ t('teamRanking.members') }}</th>
                <th>{{ t('teamRanking.totalPoints') }}</th>
                <th>{{ t('teamRanking.avgPoints') }}</th>
                <th>{{ t('teamRanking.exactTips') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="team in ranking" :key="team.teamId">
                <td :class="rankClass(team.rank)">{{ team.rank }}</td>
                <td>
                  <div class="team-name-cell">
                    <TeamAvatar :image-url="team.imageUrl" :name="team.teamName" size="sm" />
                    <strong>{{ team.teamName }}</strong>
                  </div>
                </td>
                <td>{{ formatNumber(team.userCount) }}</td>
                <td>{{ formatPoints(team.totalPoints) }}</td>
                <td><strong>{{ formatPoints(team.averagePoints) }}</strong></td>
                <td>{{ formatNumber(team.exactResults) }}</td>
              </tr>
              <tr v-if="ranking.length === 0">
                <td colspan="6" class="text-center text-muted">{{ t('teamRanking.empty') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import TeamAvatar from '../components/TeamAvatar.vue';
import { useFormatters } from '../composables/useFormatters';

const { t } = useI18n();
const { formatNumber, formatPoints } = useFormatters();

const ranking = ref([]);
const loading = ref(true);

function rankClass(rank) {
  if (rank <= 3) return `rank-${rank}`;
  return '';
}

onMounted(async () => {
  try {
    const { data } = await api.get('/leaderboard/team-ranking');
    ranking.value = data;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.team-name-cell {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}
</style>
