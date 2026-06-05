<template>
  <div>
    <div class="page-header">
      <h1>{{ t('adminPages.import.title') }}</h1>
    </div>

    <AlertMessage v-if="message" :message="message" :type="messageType" />
    <AlertMessage v-if="error" :message="error" type="error" />

    <div class="card mb-2 default-mode-notice">
      <div class="card-body">
        <strong>📋 Standard-Betriebsmodus</strong>
        <p class="text-muted">
          Importieren Sie den offiziellen Spielplan per CSV. Ergebnisse tragen Sie anschließend unter
          <router-link to="/admin/results">Ergebnisverwaltung</router-link> manuell ein.
          Punkte und Hitliste werden automatisch berechnet.
        </p>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>Spiele importieren</h3></div>
        <div class="card-body">
          <p class="text-muted mb-2" style="font-size: 0.875rem;">
            Laden Sie eine CSV-Datei mit folgenden Spalten hoch:
          </p>
          <code class="csv-columns">
            matchNumber,stage,groupName,homeTeam,awayTeam,kickoffTime,stadium,city
          </code>

          <form @submit.prevent="handleImport">
            <div class="form-group">
              <label>CSV-Datei</label>
              <input type="file" accept=".csv" @change="onFileSelect" class="form-control" required />
            </div>
            <button type="submit" class="btn btn-primary" :disabled="!selectedFile || importing">
              {{ importing ? 'Importiere...' : 'Import starten' }}
            </button>
          </form>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Beispiel-CSV</h3></div>
        <div class="card-body">
          <pre class="csv-example">matchNumber,stage,groupName,homeTeam,awayTeam,kickoffTime,stadium,city
1,Group Stage,A,Deutschland,Frankreich,2026-06-11T21:00:00,MetLife Stadium,New York
2,Group Stage,A,Brasilien,Japan,2026-06-12T18:00:00,SoFi Stadium,Los Angeles</pre>
        </div>
      </div>
    </div>

    <div v-if="summary" class="card mt-2">
      <div class="card-header"><h3>Import-Ergebnis</h3></div>
      <div class="card-body">
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-value">{{ summary.created }}</div><div class="stat-label">Erstellt</div></div>
          <div class="stat-card"><div class="stat-value">{{ summary.updated }}</div><div class="stat-label">Aktualisiert</div></div>
          <div class="stat-card"><div class="stat-value">{{ summary.skipped }}</div><div class="stat-label">Übersprungen</div></div>
          <div class="stat-card accent"><div class="stat-value">{{ summary.errors?.length || 0 }}</div><div class="stat-label">Fehler</div></div>
        </div>

        <div v-if="summary.errors?.length" class="mt-2">
          <h4>Fehlerdetails</h4>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr><th>Zeile</th><th>Fehlermeldung</th></tr>
              </thead>
              <tbody>
                <tr v-for="(err, i) in summary.errors" :key="i">
                  <td>{{ err.row }}</td>
                  <td>{{ err.message }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';
import AlertMessage from '../../components/AlertMessage.vue';


const { t } = useI18n();

const selectedFile = ref(null);
const importing = ref(false);
const message = ref('');
const messageType = ref('success');
const error = ref('');
const summary = ref(null);

function onFileSelect(event) {
  selectedFile.value = event.target.files[0] || null;
}

async function handleImport() {
  if (!selectedFile.value) return;

  importing.value = true;
  error.value = '';
  message.value = '';
  summary.value = null;

  try {
    const formData = new FormData();
    formData.append('file', selectedFile.value);

    const { data } = await api.post('/admin/matches/import-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    summary.value = data.summary;
    message.value = data.message;
    messageType.value = data.summary.errors?.length ? 'warning' : 'success';
  } catch (err) {
    error.value = err.response?.data?.error || 'Import fehlgeschlagen.';
  } finally {
    importing.value = false;
  }
}
</script>

<style scoped>
.mb-2 { margin-bottom: 1.5rem; }
.mt-2 { margin-top: 1.5rem; }
.default-mode-notice { border-left: 3px solid var(--color-primary); }
.csv-columns {
  display: block;
  padding: 0.75rem;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  margin-bottom: 1rem;
}
.csv-example {
  font-size: 0.8rem;
  background: var(--color-bg);
  padding: 1rem;
  border-radius: var(--radius-sm);
  overflow-x: auto;
}
</style>
