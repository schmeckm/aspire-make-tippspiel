<template>
  <div>
    <div class="page-header"><h1>{{ t('statistics.title') }}</h1></div>
    <LoadingSpinner v-if="loading" />
    <AlertMessage v-else-if="error" :message="error" type="error" />
    <template v-else-if="stats">
      <UserStatsCards :data="stats" />
      <div class="grid-2 mt-2">
        <div class="card"><div class="card-header"><h3>{{ t('statistics.pointsOverTime') }}</h3></div><div class="card-body"><PointsChart :data="stats.pointsOverTime" /></div></div>
        <div class="card"><div class="card-header"><h3>{{ t('statistics.rankOverTime') }}</h3></div><div class="card-body"><RankChart :data="stats.rankOverTime" /></div></div>
      </div>
      <div class="card mt-2">
        <div class="card-header"><h3>{{ t('statistics.accuracyByStage') }}</h3></div>
        <div class="card-body">
          <div class="table-wrapper">
            <table>
              <thead><tr><th>{{ t('statistics.phase') }}</th><th>{{ t('statistics.tips') }}</th><th>{{ t('statistics.exact') }}</th><th>{{ t('statistics.points') }}</th></tr></thead>
              <tbody>
                <tr v-for="(val, stage) in stats.accuracyByStage" :key="stage">
                  <td>{{ stage }}</td><td>{{ formatNumber(val.total) }}</td><td>{{ formatNumber(val.exact) }}</td><td>{{ formatPoints(val.points) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import UserStatsCards from '../components/UserStatsCards.vue';
import PointsChart from '../components/PointsChart.vue';
import RankChart from '../components/RankChart.vue';
import AlertMessage from '../components/AlertMessage.vue';
import { useFormatters } from '../composables/useFormatters';

const { t } = useI18n();
const { formatNumber, formatPoints } = useFormatters();
const stats = ref(null);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  error.value = '';
  try {
    const { data } = await api.get('/statistics/me');
    stats.value = data;
  } catch (err) {
    error.value = err.response?.data?.error || t('statistics.loadFailed');
  } finally {
    loading.value = false;
  }
});
</script>
