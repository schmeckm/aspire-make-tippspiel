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
        <div class="card-header"><h3>football-data.org v4</h3></div>
        <div class="card-body provider-form">
          <p class="hint text-muted">
            Primärer und einziger Football-API-Provider. Authentifizierung nur im Backend via
            <code>X-Auth-Token</code>. Wettbewerb: WM 2026 (<code>WC</code>, Fallback-ID <code>2000</code>).
          </p>
          <dl class="provider-details">
            <dt>Base URL</dt><dd>https://api.football-data.org/v4</dd>
            <dt>Spielplan-Endpunkt</dt><dd><code>GET /competitions/WC/matches?season=2026</code></dd>
            <dt>Fallback</dt><dd><code>GET /competitions/2000/matches?season=2026</code></dd>
          </dl>
          <button class="btn btn-accent btn-sm" :disabled="syncing || !status.apiConfigured" @click="testConnection">
            Verbindung testen
          </button>
        </div>
      </div>

      <div class="btn-group mb-2">
        <button class="btn btn-primary" :disabled="syncing || !status.apiConfigured" @click="syncFixtures">
          {{ syncing ? 'Sync...' : 'Spielplan synchronisieren' }}
        </button>
        <button class="btn btn-accent" :disabled="syncing || !status.apiConfigured" @click="syncResults">
          {{ syncing ? 'Sync...' : 'Ergebnisse synchronisieren' }}
        </button>
        <button class="btn btn-accent" :disabled="syncing || !status.apiConfigured" @click="syncLive">
          {{ syncing ? 'Sync...' : 'Live-Scores synchronisieren' }}
        </button>
        <button class="btn btn-secondary" :disabled="syncing" @click="recalculate">Punkte neu berechnen</button>
      </div>

      <div v-if="status.recentErrors?.length && status.apiConfigured" class="card mb-2 error-card">
        <div class="card-header"><h3>Letzte Sync-Fehler</h3></div>
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
        <div class="card-header"><h3>Sync-Logs</h3></div>
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


const { t } = useI18n();

const loading = ref(true);
const syncing = ref(false);
const status = ref({});
const logs = ref([]);
const message = ref('');
const messageType = ref('success');
const error = ref('');

function formatDate(d) {
  if (!d) return '–';
  return new Date(d).toLocaleString('de-DE');
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
    message.value = data.message || 'Verbindung erfolgreich.';
    messageType.value = 'success';
  } catch (e) {
    error.value = e.response?.data?.error || 'Verbindungstest fehlgeschlagen.';
  } finally {
    syncing.value = false;
  }
}

async function syncFixtures() {
  syncing.value = true;
  error.value = '';
  message.value = '';
  try {
    const { data } = await api.post('/admin/sync/fixtures');
    message.value = data.message || 'Spielplan synchronisiert.';
    messageType.value = data.errorCount > 0 ? 'warning' : 'success';
    await load();
  } catch (e) {
    error.value = e.response?.data?.error || 'Sync fehlgeschlagen.';
  } finally {
    syncing.value = false;
  }
}

async function syncResults() {
  syncing.value = true;
  error.value = '';
  message.value = '';
  try {
    const { data } = await api.post('/admin/sync/results');
    message.value = data.message || 'Ergebnisse synchronisiert.';
    messageType.value = data.errorCount > 0 ? 'warning' : 'success';
    await load();
  } catch (e) {
    error.value = e.response?.data?.error || 'Sync fehlgeschlagen.';
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
    message.value = data.message || 'Live-Scores synchronisiert.';
    await load();
  } catch (e) {
    error.value = e.response?.data?.error || 'Live-Sync fehlgeschlagen.';
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
    error.value = e.response?.data?.error || 'Fehler.';
  } finally {
    syncing.value = false;
  }
}

onMounted(load);
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
