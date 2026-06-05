<template>
  <div>
    <div class="page-header">
      <h1>{{ t('leaderboard.title') }}</h1>
      <div class="btn-group">
        <button class="btn btn-secondary btn-sm" @click="exportCsv">{{ t('leaderboard.exportCsv') }}</button>
      </div>
    </div>

    <div class="filter-bar">
      <button v-for="f in filters" :key="f.value" :class="['filter-btn', { active: activeFilter === f.value }]" @click="setFilter(f.value)">{{ f.label }}</button>
    </div>

    <AILeaderboardSummary />

    <LoadingSpinner v-if="loading" />
    <AlertMessage v-else-if="error" :message="error" type="error" />
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
import AlertMessage from '../components/AlertMessage.vue';
import { useAuthStore } from '../stores/authStore';

const authStore = useAuthStore();

const { t } = useI18n();
const toast = useToast();

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
