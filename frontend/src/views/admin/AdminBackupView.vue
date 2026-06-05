<template>
  <div>
    <div class="page-header">
      <h1>{{ t('adminPages.backup.title') }}</h1>
      <button class="btn btn-secondary btn-sm" :disabled="loading" @click="loadOverview">
        {{ loading ? 'Lädt...' : 'Aktualisieren' }}
      </button>
    </div>

    <AlertMessage v-if="message" :message="message" type="success" />
    <AlertMessage v-if="error" :message="error" type="error" />

    <LoadingSpinner v-if="loading" />

    <template v-else>
      <div class="card mb-2 backup-notice">
        <div class="card-body">
          <strong>💾 Spieler- und Benutzerdaten sichern</strong>
          <p class="text-muted">
            Erstellt eine Sicherungskopie aller Benutzer, Teams, Tipps und Bonus-Tipps.
            Im Problemfall kann die Datei wieder hochgeladen und die Daten wiederhergestellt werden.
          </p>
        </div>
      </div>

      <div class="stats-grid mb-2">
        <div class="stat-card">
          <div class="stat-value">{{ overview.current?.userCount || 0 }}</div>
          <div class="stat-label">Benutzer</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ overview.current?.teamCount || 0 }}</div>
          <div class="stat-label">Teams</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ overview.current?.predictionCount || 0 }}</div>
          <div class="stat-label">Tipps</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ overview.current?.bonusPredictionCount || 0 }}</div>
          <div class="stat-label">Bonus-Tipps</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3>Backup erstellen</h3></div>
          <div class="card-body backup-actions">
            <button
              class="btn btn-primary"
              :disabled="exporting"
              @click="downloadBackup"
            >
              {{ exporting ? 'Exportiere...' : 'Als Datei herunterladen' }}
            </button>
            <button
              class="btn btn-secondary"
              :disabled="saving"
              @click="saveBackup"
            >
              {{ saving ? 'Speichere...' : 'Auf Server speichern' }}
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Daten wiederherstellen</h3></div>
          <div class="card-body">
            <p class="text-muted restore-hint">
              Bestehende Benutzer werden anhand der E-Mail-Adresse aktualisiert.
              Fehlende Benutzer werden neu angelegt. Tipps werden den passenden Spielen zugeordnet.
            </p>
            <form @submit.prevent="handleRestore">
              <div class="form-group">
                <label>Backup-Datei (JSON)</label>
                <input
                  type="file"
                  accept=".json,application/json"
                  class="form-control"
                  @change="onRestoreFileSelect"
                />
              </div>
              <button
                type="submit"
                class="btn btn-accent"
                :disabled="!restoreFile || restoring"
              >
                {{ restoring ? 'Stelle wieder her...' : 'Wiederherstellen' }}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div v-if="restoreSummary" class="card mt-2">
        <div class="card-header"><h3>Wiederherstellungs-Ergebnis</h3></div>
        <div class="card-body">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">{{ restoreSummary.usersCreated }}</div>
              <div class="stat-label">Benutzer neu</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ restoreSummary.usersUpdated }}</div>
              <div class="stat-label">Benutzer aktualisiert</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ restoreSummary.predictionsRestored }}</div>
              <div class="stat-label">Tipps wiederhergestellt</div>
            </div>
            <div class="stat-card accent">
              <div class="stat-value">{{ restoreSummary.skippedPredictions }}</div>
              <div class="stat-label">Tipps übersprungen</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card mt-2">
        <div class="card-header"><h3>Gespeicherte Backups</h3></div>
        <div class="card-body">
          <p v-if="!overview.backups?.length" class="text-muted">Noch keine Backups auf dem Server gespeichert.</p>
          <div v-else class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Dateiname</th>
                  <th>Erstellt</th>
                  <th>Benutzer</th>
                  <th>Tipps</th>
                  <th>Größe</th>
                  <th>Aktionen</th>
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
                    <button
                      class="btn btn-secondary btn-sm"
                      @click="downloadSavedBackup(backup.filename)"
                    >
                      Download
                    </button>
                    <button
                      class="btn btn-secondary btn-sm"
                      @click="deleteBackup(backup.filename)"
                    >
                      Löschen
                    </button>
                  </td>
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
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner.vue';
import AlertMessage from '../../components/AlertMessage.vue';


const { t } = useI18n();

const loading = ref(true);
const exporting = ref(false);
const saving = ref(false);
const restoring = ref(false);
const message = ref('');
const error = ref('');
const overview = ref({ current: {}, backups: [] });
const restoreFile = ref(null);
const restoreSummary = ref(null);

function apiErrorMessage(err, fallback) {
  if (!err.response) {
    return 'Server nicht erreichbar. Bitte prüfen, ob das Backend läuft (Port 3000).';
  }
  return err.response?.data?.error || fallback;
}

function formatDate(value) {
  if (!value) return '–';
  return new Date(value).toLocaleString('de-DE');
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
  error.value = '';
  try {
    const { data } = await api.get('/admin/backup');
    overview.value = data;
  } catch (err) {
    error.value = apiErrorMessage(err, 'Backup-Übersicht konnte nicht geladen werden.');
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
    message.value = 'Backup wurde heruntergeladen.';
  } catch (err) {
    error.value = err.response?.data?.error || 'Backup-Export fehlgeschlagen.';
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
    message.value = data.message || 'Backup gespeichert.';
    await loadOverview();
  } catch (err) {
    error.value = apiErrorMessage(err, 'Backup konnte nicht gespeichert werden.');
  } finally {
    saving.value = false;
  }
}

async function downloadSavedBackup(filename) {
  error.value = '';
  try {
    const response = await api.get(`/admin/backup/${filename}`, { responseType: 'blob' });
    triggerDownload(response.data, filename);
    message.value = 'Backup wurde heruntergeladen.';
  } catch (err) {
    error.value = err.response?.data?.error || 'Backup-Download fehlgeschlagen.';
  }
}

async function deleteBackup(filename) {
  if (!confirm(`Backup "${filename}" wirklich löschen?`)) return;
  error.value = '';
  try {
    const { data } = await api.delete(`/admin/backup/${filename}`);
    message.value = data.message || 'Backup gelöscht.';
    await loadOverview();
  } catch (err) {
    error.value = err.response?.data?.error || 'Backup konnte nicht gelöscht werden.';
  }
}

function onRestoreFileSelect(event) {
  restoreFile.value = event.target.files[0] || null;
  restoreSummary.value = null;
}

async function handleRestore() {
  if (!restoreFile.value) return;
  if (!confirm(
    'Daten aus dem Backup wiederherstellen? Bestehende Benutzer werden anhand der E-Mail aktualisiert.'
  )) return;

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
    message.value = data.message || 'Daten wiederhergestellt.';
    restoreFile.value = null;
    await loadOverview();
  } catch (err) {
    error.value = err.response?.data?.error || 'Wiederherstellung fehlgeschlagen.';
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
