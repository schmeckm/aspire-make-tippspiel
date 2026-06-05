<template>
  <div>
    <div class="page-header">
      <h1>{{ t('adminPages.results.title') }}</h1>
    </div>

    <AlertMessage v-if="message" :message="message" type="success" />
    <AlertMessage v-if="error" :message="error" type="error" />

    <LoadingSpinner v-if="loading" />

    <div v-else class="card">
      <div class="card-body">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Spiel</th>
                <th>Datum</th>
                <th>Status</th>
                <th>Ergebnis</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="match in matches" :key="match.id">
                <td>{{ match.matchNumber }}</td>
                <td><strong>{{ match.homeTeam }}</strong> vs <strong>{{ match.awayTeam }}</strong></td>
                <td>{{ formatDate(match.kickoffTime) }}</td>
                <td><span :class="['badge', `badge-${match.status}`]">{{ statusLabel(match.status) }}</span></td>
                <td>
                  <div v-if="editingId === match.id" class="prediction-inputs">
                    <input v-model.number="resultForm.homeScore" type="number" min="0" class="form-control" style="width: 60px; text-align: center;" />
                    <span>:</span>
                    <input v-model.number="resultForm.awayScore" type="number" min="0" class="form-control" style="width: 60px; text-align: center;" />
                    <button class="btn btn-primary btn-sm" @click="saveResult(match)">Speichern</button>
                    <button class="btn btn-secondary btn-sm" @click="editingId = null">Abbrechen</button>
                  </div>
                  <span v-else-if="match.status === 'finished'">{{ match.homeScore }} : {{ match.awayScore }}</span>
                  <span v-else class="text-muted">–</span>
                </td>
                <td>
                  <div class="btn-group">
                    <button class="btn btn-primary btn-sm" @click="startEdit(match)">Ergebnis</button>
                    <button v-if="match.status !== 'locked' && match.status !== 'finished'" class="btn btn-secondary btn-sm" @click="lockMatch(match)">Sperren</button>
                    <button v-if="match.isManuallyLocked" class="btn btn-secondary btn-sm" @click="unlockMatch(match)">Entsperren</button>
                  </div>
                </td>
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
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner.vue';
import AlertMessage from '../../components/AlertMessage.vue';


const { t } = useI18n();

const matches = ref([]);
const loading = ref(true);
const editingId = ref(null);
const resultForm = ref({ homeScore: 0, awayScore: 0 });
const message = ref('');
const error = ref('');

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('de-DE');
}

function statusLabel(status) {
  const labels = { scheduled: 'Geplant', locked: 'Gesperrt', finished: 'Beendet' };
  return labels[status] || status;
}

async function loadMatches() {
  loading.value = true;
  try {
    const { data } = await api.get('/matches');
    matches.value = data;
  } finally {
    loading.value = false;
  }
}

function startEdit(match) {
  editingId.value = match.id;
  resultForm.value = {
    homeScore: match.homeScore ?? 0,
    awayScore: match.awayScore ?? 0,
  };
}

async function saveResult(match) {
  error.value = '';
  try {
    await api.post(`/matches/${match.id}/result`, resultForm.value);
    message.value = 'Ergebnis gespeichert und Punkte berechnet.';
    editingId.value = null;
    await loadMatches();
  } catch (err) {
    error.value = err.response?.data?.error || 'Fehler beim Speichern.';
  }
}

async function lockMatch(match) {
  try {
    await api.post(`/matches/${match.id}/lock`);
    message.value = 'Spiel gesperrt.';
    await loadMatches();
  } catch (err) {
    error.value = err.response?.data?.error || 'Sperren fehlgeschlagen.';
  }
}

async function unlockMatch(match) {
  try {
    await api.post(`/matches/${match.id}/unlock`);
    message.value = 'Spiel entsperrt.';
    await loadMatches();
  } catch (err) {
    error.value = err.response?.data?.error || 'Entsperren fehlgeschlagen.';
  }
}

onMounted(loadMatches);
</script>
