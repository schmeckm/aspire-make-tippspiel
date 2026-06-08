<template>
  <div>
    <div class="page-header">
      <h1>{{ t('adminPages.backup.title') }}</h1>
      <button class="btn btn-secondary btn-sm" :disabled="loading" @click="loadOverview">
        {{ loading ? t('adminPages.backup.refreshing') : t('adminPages.backup.refresh') }}
      </button>
    </div>

    <AlertMessage v-if="message" :message="message" type="success" />
    <ErrorState v-if="loadError" :message="loadError" @retry="loadOverview" />
    <AlertMessage v-else-if="error" :message="error" type="error" />

    <LoadingSpinner v-if="loading" />

    <template v-else>
      <div class="card mb-2 backup-notice">
        <div class="card-body">
          <strong>{{ t('adminPages.backup.noticeTitle') }}</strong>
          <p class="text-muted">{{ t('adminPages.backup.noticeDesc') }}</p>
        </div>
      </div>

      <div class="stats-grid mb-2">
        <div class="stat-card">
          <div class="stat-value">{{ overview.current?.userCount || 0 }}</div>
          <div class="stat-label">{{ t('adminPages.backup.stats.users') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ overview.current?.teamCount || 0 }}</div>
          <div class="stat-label">{{ t('adminPages.backup.stats.teams') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ overview.current?.predictionCount || 0 }}</div>
          <div class="stat-label">{{ t('adminPages.backup.stats.predictions') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ overview.current?.bonusPredictionCount || 0 }}</div>
          <div class="stat-label">{{ t('adminPages.backup.stats.bonusPredictions') }}</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3>{{ t('adminPages.backup.createTitle') }}</h3></div>
          <div class="card-body backup-actions">
            <button class="btn btn-primary" :disabled="exporting" @click="downloadBackup">
              {{ exporting ? t('adminPages.backup.downloading') : t('adminPages.backup.download') }}
            </button>
            <button class="btn btn-secondary" :disabled="saving" @click="saveBackup">
              {{ saving ? t('adminPages.backup.saving') : t('adminPages.backup.saveOnServer') }}
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>{{ t('adminPages.backup.restoreTitle') }}</h3></div>
          <div class="card-body">
            <p class="text-muted restore-hint">{{ t('adminPages.backup.restoreHint') }}</p>
            <form @submit.prevent="requestRestore">
              <div class="form-group">
                <label>{{ t('adminPages.backup.restoreFile') }}</label>
                <input
                  type="file"
                  accept=".json,application/json"
                  class="form-control"
                  @change="onRestoreFileSelect"
                />
              </div>
              <button type="submit" class="btn btn-accent" :disabled="!restoreFile || restoring">
                {{ restoring ? t('adminPages.backup.restoring') : t('adminPages.backup.restore') }}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div v-if="restoreSummary" class="card mt-2">
        <div class="card-header"><h3>{{ t('adminPages.backup.restoreResultTitle') }}</h3></div>
        <div class="card-body">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">{{ restoreSummary.usersCreated }}</div>
              <div class="stat-label">{{ t('adminPages.backup.usersCreated') }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ restoreSummary.usersUpdated }}</div>
              <div class="stat-label">{{ t('adminPages.backup.usersUpdated') }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ restoreSummary.predictionsRestored }}</div>
              <div class="stat-label">{{ t('adminPages.backup.predictionsRestored') }}</div>
            </div>
            <div class="stat-card accent">
              <div class="stat-value">{{ restoreSummary.skippedPredictions }}</div>
              <div class="stat-label">{{ t('adminPages.backup.predictionsSkipped') }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card mt-2">
        <div class="card-header"><h3>{{ t('adminPages.backup.savedBackupsTitle') }}</h3></div>
        <div class="card-body">
          <p v-if="!overview.backups?.length" class="text-muted">{{ t('adminPages.backup.noBackups') }}</p>
          <div v-else class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{{ t('adminPages.backup.columns.filename') }}</th>
                  <th>{{ t('adminPages.backup.columns.created') }}</th>
                  <th>{{ t('adminPages.backup.columns.users') }}</th>
                  <th>{{ t('adminPages.backup.columns.predictions') }}</th>
                  <th>{{ t('adminPages.backup.columns.size') }}</th>
                  <th>{{ t('adminPages.backup.columns.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="backup in overview.backups" :key="backup.filename">
                  <td>{{ backup.filename }}</td>
                  <td>{{ formatDate(backup.createdAt) }}</td>
                  <td>{{ backup.meta?.userCount ?? '–' }}</td>
                  <td>{{ backup.meta?.predictionCount ?? '–' }}</td>
                  <td>{{ formatSize(backup.size) }}</td>
                  <td class="backup-row-actions">
                    <button class="btn btn-secondary btn-sm" @click="downloadSavedBackup(backup.filename)">
                      {{ t('adminPages.backup.download') }}
                    </button>
                    <button class="btn btn-secondary btn-sm" @click="requestDeleteBackup(backup.filename)">
                      {{ t('common.delete') }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <ConfirmModal
      :open="confirmState.open"
      :title="confirmState.title"
      :message="confirmState.message"
      :confirm-label="confirmState.confirmLabel"
      :danger="confirmState.danger"
      @confirm="onConfirm"
      @cancel="closeConfirm"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner.vue';
import AlertMessage from '../../components/AlertMessage.vue';
import ErrorState from '../../components/ErrorState.vue';
import ConfirmModal from '../../components/ConfirmModal.vue';
import { useConfirmModal } from '../../composables/useConfirmModal';

const { t, locale } = useI18n();
const { confirmState, openConfirm, closeConfirm, onConfirm } = useConfirmModal();

const loading = ref(true);
const exporting = ref(false);
const saving = ref(false);
const restoring = ref(false);
const message = ref('');
const loadError = ref('');
const error = ref('');
const overview = ref({ current: {}, backups: [] });
const restoreFile = ref(null);
const restoreSummary = ref(null);

function apiErrorMessage(err, fallback) {
  if (!err.response) return t('adminPages.backup.serverUnreachable');
  return err.response?.data?.error || fallback;
}

function formatDate(value) {
  if (!value) return '–';
  return new Date(value).toLocaleString(locale.value);
}

function formatSize(bytes) {
  if (!bytes) return '–';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function extractFilename(contentDisposition, fallback) {
  const match = contentDisposition?.match(/filename="([^"]+)"/);
  return match?.[1] || fallback;
}

async function loadOverview() {
  loading.value = true;
  loadError.value = '';
  try {
    const { data } = await api.get('/admin/backup');
    overview.value = data;
  } catch (err) {
    loadError.value = apiErrorMessage(err, t('adminPages.backup.loadFailed'));
  } finally {
    loading.value = false;
  }
}

async function downloadBackup() {
  exporting.value = true;
  error.value = '';
  message.value = '';
  try {
    const response = await api.get('/admin/backup/export', { responseType: 'blob' });
    const filename = extractFilename(
      response.headers['content-disposition'],
      `spieler-backup-${new Date().toISOString().slice(0, 10)}.json`
    );
    triggerDownload(response.data, filename);
    message.value = t('adminPages.backup.downloadSuccess');
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.backup.exportFailed');
  } finally {
    exporting.value = false;
  }
}

async function saveBackup() {
  saving.value = true;
  error.value = '';
  message.value = '';
  try {
    const { data } = await api.post('/admin/backup');
    message.value = data.message || t('adminPages.backup.saveSuccess');
    await loadOverview();
  } catch (err) {
    error.value = apiErrorMessage(err, t('adminPages.backup.saveFailed'));
  } finally {
    saving.value = false;
  }
}

async function downloadSavedBackup(filename) {
  error.value = '';
  try {
    const response = await api.get(`/admin/backup/${filename}`, { responseType: 'blob' });
    triggerDownload(response.data, filename);
    message.value = t('adminPages.backup.downloadSuccess');
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.backup.downloadFailed');
  }
}

function requestDeleteBackup(filename) {
  openConfirm({
    title: t('common.delete'),
    message: t('adminPages.backup.confirmDelete', { name: filename }),
    confirmLabel: t('common.delete'),
    danger: true,
    action: () => deleteBackup(filename),
  });
}

async function deleteBackup(filename) {
  error.value = '';
  try {
    const { data } = await api.delete(`/admin/backup/${filename}`);
    message.value = data.message || t('adminPages.backup.deleteSuccess');
    await loadOverview();
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.backup.deleteFailed');
  }
}

function onRestoreFileSelect(event) {
  restoreFile.value = event.target.files[0] || null;
  restoreSummary.value = null;
}

function requestRestore() {
  if (!restoreFile.value) return;
  openConfirm({
    title: t('adminPages.backup.restore'),
    message: t('adminPages.backup.confirmRestore'),
    action: handleRestore,
  });
}

async function handleRestore() {
  if (!restoreFile.value) return;

  restoring.value = true;
  error.value = '';
  message.value = '';
  restoreSummary.value = null;

  try {
    const formData = new FormData();
    formData.append('file', restoreFile.value);
    const { data } = await api.post('/admin/backup/restore', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    restoreSummary.value = data.summary;
    message.value = data.message || t('adminPages.backup.restoreSuccess');
    restoreFile.value = null;
    await loadOverview();
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.backup.restoreFailed');
  } finally {
    restoring.value = false;
  }
}

onMounted(loadOverview);
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.mb-2 { margin-bottom: 1.5rem; }
.mt-2 { margin-top: 1.5rem; }
.backup-notice { border-left: 3px solid var(--color-primary); }
.backup-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.restore-hint {
  font-size: 0.875rem;
  margin-bottom: 1rem;
}
.backup-row-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
