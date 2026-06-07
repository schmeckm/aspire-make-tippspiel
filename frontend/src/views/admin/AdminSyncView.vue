<template>
  <div>
    <div class="page-header"><h1>{{ t('adminPages.sync.title') }}</h1></div>
    <AlertMessage v-if="message" :message="message" :type="messageType" />
    <AlertMessage v-if="error" :message="error" type="error" />

    <LoadingSpinner v-if="loading" />
    <template v-else>
      <AdminManualModeBanner
        :api-configured="status.apiConfigured"
        :status-message="status.statusMessage"
        :show-when-api-configured="false"
        :recalculating="syncing"
        @recalculate="recalculate"
      />

      <SyncStatusCard :status="status" class="mb-2" />

      <div class="card mb-2">
        <div class="card-header"><h3>{{ t('adminPages.sync.footballDataTitle') }}</h3></div>
        <div class="card-body provider-form">
          <p class="hint text-muted">{{ t('adminPages.sync.footballDataHint') }}</p>
          <dl class="provider-details">
            <dt>{{ t('adminPages.sync.baseUrl') }}</dt><dd>https://api.football-data.org/v4</dd>
            <dt>{{ t('adminPages.sync.fixturesEndpoint') }}</dt><dd><code>GET /competitions/WC/matches?season=2026</code></dd>
            <dt>{{ t('adminPages.sync.fallback') }}</dt><dd><code>GET /competitions/2000/matches?season=2026</code></dd>
          </dl>
          <button class="btn btn-accent btn-sm" :disabled="syncing || !status.apiConfigured" @click="testConnection">
            {{ t('adminPages.sync.testConnection') }}
          </button>
        </div>
      </div>

      <div class="card mb-2">
        <div class="card-header"><h3>{{ t('adminPages.sync.theSportsDbTitle') }}</h3></div>
        <div class="card-body provider-form">
          <p class="hint text-muted">{{ t('adminPages.sync.theSportsDbHint') }}</p>
          <p class="hint text-muted">{{ t('adminPages.sync.playerImagesHint') }}</p>
          <div class="btn-group">
            <button class="btn btn-accent btn-sm" :disabled="syncing" @click="testTheSportsDb">
              {{ t('adminPages.sync.testTheSportsDb') }}
            </button>
            <button class="btn btn-secondary btn-sm" :disabled="syncing" @click="enrichVenues">
              {{ syncing ? t('adminPages.sync.syncing') : t('adminPages.sync.enrichVenues') }}
            </button>
            <button
              class="btn btn-primary btn-sm"
              :disabled="syncingPlayerImages || !status.apiConfigured"
              @click="syncPlayerImages"
            >
              {{ syncingPlayerImages ? t('adminPages.sync.loadingImages') : t('adminPages.sync.syncPlayerImages') }}
            </button>
          </div>
        </div>
      </div>

      <div class="btn-group mb-2">
        <button class="btn btn-primary" :disabled="syncing || !status.apiConfigured" @click="syncOfficialSchedule">
          {{ syncing ? t('adminPages.sync.syncing') : t('adminPages.sync.syncOfficialSchedule') }}
        </button>
        <button class="btn btn-secondary" :disabled="syncing || !status.apiConfigured" @click="syncFixtures">
          {{ syncing ? t('adminPages.sync.syncing') : t('adminPages.sync.syncFixtures') }}
        </button>
        <button class="btn btn-accent" :disabled="syncing || !status.apiConfigured" @click="syncResults">
          {{ syncing ? t('adminPages.sync.syncing') : t('adminPages.sync.syncResults') }}
        </button>
        <button class="btn btn-accent" :disabled="syncing || !status.apiConfigured" @click="syncLive">
          {{ syncing ? t('adminPages.sync.syncing') : t('adminPages.sync.syncLive') }}
        </button>
        <button class="btn btn-secondary" :disabled="syncing" @click="recalculate">
          {{ t('adminPages.sync.recalculate') }}
        </button>
      </div>

      <div v-if="status.recentErrors?.length && status.apiConfigured" class="card mb-2 error-card">
        <div class="card-header"><h3>{{ t('adminPages.sync.recentErrors') }}</h3></div>
        <div class="card-body">
          <ul class="error-list">
            <li v-for="log in status.recentErrors" :key="log.id">
              <strong>{{ log.syncType }}</strong> – {{ log.errorMessage || log.status }}
              <span class="text-muted">({{ formatDate(log.startedAt) }})</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>{{ t('adminPages.sync.syncLogs') }}</h3></div>
        <div class="card-body"><SyncLogTable :logs="logs" /></div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner.vue';
import AlertMessage from '../../components/AlertMessage.vue';
import SyncStatusCard from '../../components/SyncStatusCard.vue';
import SyncLogTable from '../../components/SyncLogTable.vue';
import AdminManualModeBanner from '../../components/AdminManualModeBanner.vue';

const { t, locale } = useI18n();

const loading = ref(true);
const syncing = ref(false);
const syncingPlayerImages = ref(false);
const status = ref({});
const logs = ref([]);
const message = ref('');
const messageType = ref('success');
const error = ref('');

function formatDate(d) {
  if (!d) return '–';
  return new Date(d).toLocaleString(locale.value);
}

async function load() {
  loading.value = true;
  try {
    const [statusRes, logsRes] = await Promise.all([
      api.get('/admin/sync/status'),
      api.get('/admin/sync/logs'),
    ]);
    status.value = statusRes.data;
    logs.value = logsRes.data;
  } finally {
    loading.value = false;
  }
}

async function testConnection() {
  syncing.value = true;
  error.value = '';
  message.value = '';
  try {
    const { data } = await api.post('/admin/sync/test-connection');
    message.value = data.message || t('adminPages.sync.connectionSuccess');
    messageType.value = 'success';
  } catch (e) {
    error.value = e.response?.data?.error || t('adminPages.sync.connectionFailed');
  } finally {
    syncing.value = false;
  }
}

function formatVenueEnrichment(data) {
  const venue = data?.venueEnrichment;
  if (!venue || venue.skipped) return '';
  if (venue.message) return ` ${venue.message}`;
  return ` ${t('adminPages.sync.venuesEnrichedCount', { count: venue.enrichedCount || 0 })}`;
}

async function syncFixtures() {
  syncing.value = true;
  error.value = '';
  message.value = '';
  try {
    const { data } = await api.post('/admin/sync/fixtures');
    message.value = `${data.message || t('adminPages.sync.fixturesSynced')}${formatVenueEnrichment(data)}`;
    messageType.value = data.errorCount > 0 ? 'warning' : 'success';
    await load();
  } catch (e) {
    error.value = e.response?.data?.error || t('adminPages.sync.syncFailed');
  } finally {
    syncing.value = false;
  }
}

async function syncOfficialSchedule() {
  syncing.value = true;
  error.value = '';
  message.value = '';
  try {
    const { data } = await api.post('/admin/sync/official-schedule');
    const parts = [
      data.message,
      data.cleanupResult?.removedCount
        ? t('adminPages.sync.officialCleanup', { count: data.cleanupResult.removedCount })
        : '',
    ].filter(Boolean);
    message.value = parts.join(' ') || t('adminPages.sync.officialSynced');
    const fixtureErrors = data.fixtureResult?.errorCount || 0;
    messageType.value = fixtureErrors > 0 ? 'warning' : 'success';
    await load();
  } catch (e) {
    error.value = e.response?.data?.error || t('adminPages.sync.syncFailed');
  } finally {
    syncing.value = false;
  }
}

async function testTheSportsDb() {
  syncing.value = true;
  error.value = '';
  message.value = '';
  try {
    const { data } = await api.post('/admin/sync/test-thesportsdb');
    message.value = data.message || t('adminPages.sync.theSportsDbConnected');
    messageType.value = 'success';
  } catch (e) {
    error.value = e.response?.data?.error || t('adminPages.sync.theSportsDbTestFailed');
  } finally {
    syncing.value = false;
  }
}

async function enrichVenues() {
  syncing.value = true;
  error.value = '';
  message.value = '';
  try {
    const { data } = await api.post('/admin/sync/enrich-venues');
    message.value = data.message || t('adminPages.sync.venuesEnriched');
    messageType.value = data.skipped ? 'warning' : 'success';
    await load();
  } catch (e) {
    error.value = e.response?.data?.error || t('adminPages.sync.venueEnrichFailed');
  } finally {
    syncing.value = false;
  }
}

function playerImageProgressMessage(log) {
  const resolved = (log.createdCount || 0) + (log.updatedCount || 0);
  let details = {};
  try {
    details = typeof log.detailsJson === 'string'
      ? JSON.parse(log.detailsJson)
      : (log.detailsJson || {});
  } catch {
    details = {};
  }
  const total = details.totalPlayers;
  const processed = details.processedCount;
  const progress = processed && total ? ` (${processed}/${total})` : '';
  return t('adminPages.sync.playerImagesProgress', {
    resolved,
    skipped: log.skippedCount || 0,
    progress,
  });
}

async function pollPlayerImageSync(logId) {
  const maxPolls = 500;
  for (let i = 0; i < maxPolls; i += 1) {
    await new Promise((resolve) => { setTimeout(resolve, 3000); });
    const { data: pollLogs } = await api.get('/admin/sync/logs', {
      params: { syncType: 'player_images', limit: 5 },
    });
    const log = pollLogs.find((entry) => entry.id === logId) || pollLogs[0];
    if (!log) continue;

    if (log.status === 'running') {
      message.value = playerImageProgressMessage(log);
      messageType.value = 'success';
      await load();
      continue;
    }

    if (log.status === 'success') {
      message.value = t('adminPages.sync.playerImagesFinished', {
        created: log.createdCount || 0,
        updated: log.updatedCount || 0,
      });
      messageType.value = 'success';
    } else {
      message.value = log.errorMessage || t('adminPages.sync.playerImagesErrors');
      messageType.value = 'warning';
    }
    await load();
    return;
  }
  error.value = t('adminPages.sync.playerImagesTimeout');
}

async function syncPlayerImages() {
  syncingPlayerImages.value = true;
  error.value = '';
  message.value = '';
  try {
    const { data } = await api.post('/admin/sync/player-images', {}, { timeout: 30000 });
    message.value = data.message || t('adminPages.sync.playerImagesStarted');
    messageType.value = 'success';
    if (data.logId && (data.started || data.running)) {
      await pollPlayerImageSync(data.logId);
    } else {
      await load();
    }
  } catch (e) {
    error.value = e.response?.data?.error || t('adminPages.sync.playerImagesFailed');
  } finally {
    syncingPlayerImages.value = false;
  }
}

async function syncResults() {
  syncing.value = true;
  error.value = '';
  message.value = '';
  try {
    const { data } = await api.post('/admin/sync/results');
    message.value = data.message || t('adminPages.sync.resultsSynced');
    messageType.value = data.errorCount > 0 ? 'warning' : 'success';
    await load();
  } catch (e) {
    error.value = e.response?.data?.error || t('adminPages.sync.syncFailed');
  } finally {
    syncing.value = false;
  }
}

async function syncLive() {
  syncing.value = true;
  error.value = '';
  message.value = '';
  try {
    const { data } = await api.post('/admin/sync/live-scores');
    message.value = data.message || t('adminPages.sync.liveSynced');
    await load();
  } catch (e) {
    error.value = e.response?.data?.error || t('adminPages.sync.liveSyncFailed');
  } finally {
    syncing.value = false;
  }
}

async function recalculate() {
  syncing.value = true;
  try {
    const { data } = await api.post('/admin/sync/recalculate-points');
    message.value = data.message;
    await load();
  } catch (e) {
    error.value = e.response?.data?.error || t('adminPages.sync.genericError');
  } finally {
    syncing.value = false;
  }
}

async function resumeRunningPlayerImageSync() {
  const running = logs.value.find(
    (log) => log.syncType === 'player_images' && log.status === 'running',
  );
  if (!running) return;
  syncingPlayerImages.value = true;
  message.value = playerImageProgressMessage(running);
  messageType.value = 'success';
  try {
    await pollPlayerImageSync(running.id);
  } finally {
    syncingPlayerImages.value = false;
  }
}

onMounted(async () => {
  await load();
  await resumeRunningPlayerImageSync();
});
</script>

<style scoped>
.mb-2 { margin-bottom: 1.5rem; }
.provider-form .hint { font-size: 0.85rem; margin: 0 0 0.75rem; }
.provider-details { display: grid; grid-template-columns: auto 1fr; gap: 0.25rem 1rem; font-size: 0.85rem; margin: 0 0 1rem; }
.provider-details dt { font-weight: 600; color: var(--color-text-muted); }
.provider-details dd { margin: 0; }
.provider-details code { font-size: 0.8rem; }
.error-list { margin: 0; padding-left: 1.25rem; font-size: 0.875rem; }
.error-card { border-left: 3px solid var(--color-danger); }
</style>
