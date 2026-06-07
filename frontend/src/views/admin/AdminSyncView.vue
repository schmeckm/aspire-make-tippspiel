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
              :disabled="!status.apiConfigured"
              @click="syncPlayerImages"
            >
              {{ t('adminPages.sync.syncPlayerImages') }}
            </button>
          </div>
          <div v-if="activePlayerImageLog" class="player-image-sync-progress">
            <div class="player-image-sync-progress__header">
              <span class="player-image-sync-progress__count">
                {{ t('adminPages.sync.playerImagesLoadedCount', playerImageProgressStats) }}
              </span>
              <strong>{{ playerImageProgressStats.percent }}%</strong>
            </div>
            <div
              class="player-image-sync-progress__track"
              role="progressbar"
              :aria-valuenow="playerImageProgressStats.resolved"
              :aria-valuemin="0"
              :aria-valuemax="playerImageProgressStats.total || 100"
              :aria-label="t('adminPages.sync.playerImagesProgressBar')"
            >
              <div
                class="player-image-sync-progress__fill"
                :style="{ width: `${playerImageProgressStats.percent}%` }"
              />
            </div>
            <p v-if="playerImageProgressStats.total" class="hint text-muted player-image-sync-progress__meta">
              {{ t('adminPages.sync.playerImagesProgressMeta', playerImageProgressStats) }}
            </p>
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
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
const playerImagePollLogId = ref(null);
const status = ref({});
const logs = ref([]);
const message = ref('');
const messageType = ref('success');
const error = ref('');

let playerImagePollTimer = null;
let playerImagePollCount = 0;
const MAX_PLAYER_IMAGE_POLLS = 500;
const PLAYER_IMAGE_POLL_MS = 3000;

const activePlayerImageLog = computed(() => logs.value.find(
  (log) => log.syncType === 'player_images'
    && log.status === 'running'
    && !isStaleRunningLog(log),
));

function parsePlayerImageLogDetails(log) {
  let details = {};
  try {
    details = typeof log?.detailsJson === 'string'
      ? JSON.parse(log.detailsJson)
      : (log?.detailsJson || {});
  } catch {
    details = {};
  }

  const total = details.totalPlayers || 0;
  const loaded = details.loadedCount
    ?? ((log?.createdCount || 0) + (log?.updatedCount || 0));
  const processed = details.processedCount ?? (
    loaded + (log?.skippedCount || 0) + (log?.errorCount || 0)
  );
  const percent = total > 0
    ? Math.min(100, Math.round((loaded / total) * 100))
    : 0;

  return {
    total,
    loaded,
    resolved: loaded,
    processed,
    skipped: log?.skippedCount || 0,
    percent,
  };
}

const playerImageProgressStats = computed(() => (
  activePlayerImageLog.value
    ? parsePlayerImageLogDetails(activePlayerImageLog.value)
    : { total: 0, loaded: 0, processed: 0, resolved: 0, skipped: 0, percent: 0 }
));

function formatDate(d) {
  if (!d) return '–';
  return new Date(d).toLocaleString(locale.value);
}

const STALE_RUNNING_MS = 30 * 60 * 1000;

function isStaleRunningLog(log) {
  if (!log || log.status !== 'running') return false;
  return Date.now() - new Date(log.startedAt).getTime() >= STALE_RUNNING_MS;
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

async function refreshLogs() {
  try {
    const { data } = await api.get('/admin/sync/logs');
    logs.value = data;
  } catch {
    // Keep existing logs visible while polling.
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
  const stats = parsePlayerImageLogDetails(log);
  return t('adminPages.sync.playerImagesLoadedCount', stats);
}

function stopPlayerImagePolling() {
  if (playerImagePollTimer) {
    clearTimeout(playerImagePollTimer);
    playerImagePollTimer = null;
  }
  playerImagePollLogId.value = null;
  playerImagePollCount = 0;
}

function schedulePlayerImagePoll() {
  if (!playerImagePollLogId.value) return;
  playerImagePollCount += 1;
  if (playerImagePollCount > MAX_PLAYER_IMAGE_POLLS) {
    error.value = t('adminPages.sync.playerImagesTimeout');
    stopPlayerImagePolling();
    return;
  }
  playerImagePollTimer = setTimeout(pollPlayerImageSyncOnce, PLAYER_IMAGE_POLL_MS);
}

async function pollPlayerImageSyncOnce() {
  const logId = playerImagePollLogId.value;
  if (!logId) return;

  try {
    const { data: pollLogs } = await api.get('/admin/sync/logs', {
      params: { syncType: 'player_images', limit: 5 },
    });
    const log = pollLogs.find((entry) => entry.id === logId);
    if (!log) {
      schedulePlayerImagePoll();
      return;
    }

    if (log.status === 'running') {
      message.value = playerImageProgressMessage(log);
      messageType.value = 'success';
      await refreshLogs();
      schedulePlayerImagePoll();
      return;
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
    await refreshLogs();
    stopPlayerImagePolling();
  } catch {
    schedulePlayerImagePoll();
  }
}

function startPlayerImagePolling(logId) {
  stopPlayerImagePolling();
  playerImagePollLogId.value = logId;
  pollPlayerImageSyncOnce();
}

async function syncPlayerImages() {
  if (activePlayerImageLog.value) {
    message.value = t('adminPages.sync.playerImagesAlreadyRunning');
    messageType.value = 'success';
    startPlayerImagePolling(activePlayerImageLog.value.id);
    return;
  }

  error.value = '';
  try {
    const { data } = await api.post('/admin/sync/player-images', {}, { timeout: 30000 });
    message.value = data.message || t('adminPages.sync.playerImagesStarted');
    messageType.value = 'success';
    if (data.logId && (data.started || data.running)) {
      await refreshLogs();
      startPlayerImagePolling(data.logId);
    } else {
      await load();
    }
  } catch (e) {
    error.value = e.response?.data?.error || t('adminPages.sync.playerImagesFailed');
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

function resumeRunningPlayerImageSync() {
  const running = activePlayerImageLog.value;
  if (!running) return;
  message.value = playerImageProgressMessage(running);
  messageType.value = 'success';
  startPlayerImagePolling(running.id);
}

onMounted(async () => {
  await load();
  resumeRunningPlayerImageSync();
});

onUnmounted(() => {
  stopPlayerImagePolling();
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
.player-image-sync-progress {
  margin-top: 0.75rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-primary-soft);
}
.player-image-sync-progress__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.625rem;
  font-size: 0.875rem;
}
.player-image-sync-progress__header strong {
  color: var(--color-primary);
  font-size: 0.95rem;
}
.player-image-sync-progress__count {
  font-weight: 600;
}
.player-image-sync-progress__track {
  height: 0.5rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.player-image-sync-progress__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-primary-dark), var(--color-primary));
  transition: width 0.4s ease;
}
.player-image-sync-progress__meta { margin: 0.5rem 0 0; }
</style>
