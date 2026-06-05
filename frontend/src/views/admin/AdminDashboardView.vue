<template>
  <div>
    <div class="page-header">
      <h1>{{ t('adminPages.dashboard.title') }}</h1>
      <button class="btn btn-accent btn-sm" @click="recalculatePoints" :disabled="recalculating">
        {{ recalculating ? t('adminPages.dashboard.recalculating') : t('adminPages.dashboard.recalculate') }}
      </button>
    </div>

    <AlertMessage v-if="message" :message="message" type="success" />

    <LoadingSpinner v-if="loading" />

    <template v-else>
      <AdminManualModeBanner
        :api-configured="systemStatus.apiConfigured"
        :status-message="systemStatus.statusMessage"
        :recalculating="recalculating"
        @recalculate="recalculatePoints"
      />

      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">{{ stats.totalUsers }}</div><div class="stat-label">{{ t('adminPages.dashboard.stats.users') }}</div></div>
        <div class="stat-card"><div class="stat-value">{{ stats.totalTeams }}</div><div class="stat-label">{{ t('adminPages.dashboard.stats.teams') }}</div></div>
        <div class="stat-card"><div class="stat-value">{{ stats.totalMatches }}</div><div class="stat-label">{{ t('adminPages.dashboard.stats.totalMatches') }}</div></div>
        <div class="stat-card"><div class="stat-value">{{ stats.finishedMatches }}</div><div class="stat-label">{{ t('adminPages.dashboard.stats.finished') }}</div></div>
        <div class="stat-card"><div class="stat-value">{{ stats.openMatches }}</div><div class="stat-label">{{ t('adminPages.dashboard.stats.open') }}</div></div>
        <div class="stat-card"><div class="stat-value">{{ stats.totalPredictions }}</div><div class="stat-label">{{ t('adminPages.dashboard.stats.predictions') }}</div></div>
        <div class="stat-card accent"><div class="stat-value">{{ stats.missingPredictions }}</div><div class="stat-label">{{ t('adminPages.dashboard.stats.missing') }}</div></div>
      </div>

      <div class="card mb-2">
        <div class="card-header"><h3>{{ t('admin.leaderboard.includeAdmins') }}</h3></div>
        <div class="card-body">
          <label class="checkbox-label">
            <input v-model="includeAdminsInLeaderboard" type="checkbox" @change="saveLeaderboardSetting" />
            {{ t('admin.leaderboard.includeAdmins') }}
          </label>
          <p class="text-muted">{{ t('admin.leaderboard.includeAdminsHint') }}</p>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>🏆 {{ t('adminPages.dashboard.top10') }}</h3></div>
        <div class="card-body">
          <LeaderboardTable :entries="stats.top10 || []" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner.vue';
import LeaderboardTable from '../../components/LeaderboardTable.vue';
import AlertMessage from '../../components/AlertMessage.vue';
import AdminManualModeBanner from '../../components/AdminManualModeBanner.vue';

const { t } = useI18n();

const loading = ref(true);
const recalculating = ref(false);
const message = ref('');
const stats = ref({});
const systemStatus = ref({ apiConfigured: false, statusMessage: '' });
const includeAdminsInLeaderboard = ref(false);

async function loadDashboard() {
  loading.value = true;
  try {
    const [dashboardRes, syncRes, settingsRes] = await Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/sync/status'),
      api.get('/settings'),
    ]);
    stats.value = dashboardRes.data;
    systemStatus.value = {
      apiConfigured: syncRes.data.apiConfigured,
      statusMessage: syncRes.data.statusMessage,
    };
    includeAdminsInLeaderboard.value = !!settingsRes.data.includeAdminsInLeaderboard;
  } finally {
    loading.value = false;
  }
}

async function saveLeaderboardSetting() {
  try {
    await api.put('/admin/settings', {
      includeAdminsInLeaderboard: includeAdminsInLeaderboard.value,
    });
    message.value = t('admin.leaderboard.saved');
  } catch {
    message.value = '';
  }
}

async function recalculatePoints() {
  recalculating.value = true;
  message.value = '';
  try {
    const { data } = await api.post('/admin/recalculate-points');
    message.value = data.message + ` (${data.updated} Tipps aktualisiert)`;
    await loadDashboard();
  } catch {
    message.value = '';
  } finally {
    recalculating.value = false;
  }
}

onMounted(loadDashboard);
</script>

<style scoped>
.mb-2 { margin-bottom: 1.5rem; }
.checkbox-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
</style>
