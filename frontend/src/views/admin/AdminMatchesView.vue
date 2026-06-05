<template>
  <div>
    <div class="page-header">
      <h1>{{ t('adminPages.matches.title') }}</h1>
      <button class="btn btn-primary btn-sm" @click="openCreate">+ Neues Spiel</button>
    </div>

    <AlertMessage v-if="message" :message="message" type="success" />
    <AlertMessage v-if="error" :message="error" type="error" />

    <LoadingSpinner v-if="loading" />

    <div v-else class="card">
      <div class="card-body">
        <MatchTable :matches="matches" show-actions show-match-ref @edit="openEdit" @delete="handleDelete" />
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingMatch ? 'Spiel bearbeiten' : 'Neues Spiel' }}</h3>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <form @submit.prevent="handleSave">
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label>Spielnummer</label>
                <input v-model.number="form.matchNumber" type="number" class="form-control" required />
              </div>
              <div class="form-group">
                <label>Phase</label>
                <input v-model="form.stage" class="form-control" required placeholder="Group Stage" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Gruppe</label>
                <input v-model="form.groupName" class="form-control" placeholder="A" />
              </div>
              <div class="form-group">
                <label>Anstoßzeit</label>
                <input v-model="form.kickoffTime" type="datetime-local" class="form-control" required />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Heimteam</label>
                <input v-model="form.homeTeam" class="form-control" required />
              </div>
              <div class="form-group">
                <label>Auswärtsteam</label>
                <input v-model="form.awayTeam" class="form-control" required />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Stadion</label>
                <input v-model="form.stadium" class="form-control" />
              </div>
              <div class="form-group">
                <label>Stadt</label>
                <input v-model="form.city" class="form-control" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showModal = false">Abbrechen</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? 'Speichern...' : 'Speichern' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner.vue';
import MatchTable from '../../components/MatchTable.vue';
import AlertMessage from '../../components/AlertMessage.vue';

const { t } = useI18n();

const matches = ref([]);
const loading = ref(true);
const showModal = ref(false);
const editingMatch = ref(null);
const saving = ref(false);
const message = ref('');
const error = ref('');

const form = ref({
  matchNumber: 1,
  stage: 'Group Stage',
  groupName: '',
  homeTeam: '',
  awayTeam: '',
  kickoffTime: '',
  stadium: '',
  city: '',
});

async function loadMatches() {
  loading.value = true;
  try {
    const { data } = await api.get('/matches');
    matches.value = data;
  } finally {
    loading.value = false;
  }
}

function toLocalDatetime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function openCreate() {
  editingMatch.value = null;
  form.value = {
    matchNumber: matches.value.length + 1,
    stage: 'Group Stage',
    groupName: '',
    homeTeam: '',
    awayTeam: '',
    kickoffTime: '',
    stadium: '',
    city: '',
  };
  showModal.value = true;
}

function openEdit(match) {
  editingMatch.value = match;
  form.value = {
    matchNumber: match.matchNumber,
    stage: match.stage,
    groupName: match.groupName || '',
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    kickoffTime: toLocalDatetime(match.kickoffTime),
    stadium: match.stadium || '',
    city: match.city || '',
  };
  showModal.value = true;
}

async function handleSave() {
  saving.value = true;
  error.value = '';
  try {
    const payload = {
      ...form.value,
      kickoffTime: new Date(form.value.kickoffTime).toISOString(),
      groupName: form.value.groupName || null,
    };

    if (editingMatch.value) {
      await api.put(`/matches/${editingMatch.value.id}`, payload);
      message.value = 'Spiel aktualisiert.';
    } else {
      await api.post('/matches', payload);
      message.value = 'Spiel erstellt.';
    }
    showModal.value = false;
    await loadMatches();
  } catch (err) {
    error.value = err.response?.data?.error || 'Fehler beim Speichern.';
  } finally {
    saving.value = false;
  }
}

async function handleDelete(match) {
  if (!confirm(`Spiel #${match.matchNumber} wirklich löschen?`)) return;
  try {
    await api.delete(`/matches/${match.id}`);
    message.value = 'Spiel gelöscht.';
    await loadMatches();
  } catch (err) {
    error.value = err.response?.data?.error || 'Löschen fehlgeschlagen.';
  }
}

onMounted(loadMatches);
</script>
