<template>
  <div>
    <div class="page-header">
      <h1>{{ t('adminPages.results.title') }}</h1>
    </div>

    <AlertMessage v-if="message" :message="message" type="success" />
    <ErrorState v-if="loadError" :message="loadError" @retry="loadMatches" />
    <AlertMessage v-else-if="error" :message="error" type="error" />

    <LoadingSpinner v-if="loading" />

    <div v-else class="card">
      <div class="card-body">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{{ t('adminPages.results.columns.number') }}</th>
                <th>{{ t('adminPages.results.columns.match') }}</th>
                <th>{{ t('adminPages.results.columns.date') }}</th>
                <th>{{ t('adminPages.results.columns.status') }}</th>
                <th>{{ t('adminPages.results.columns.result') }}</th>
                <th>{{ t('adminPages.results.columns.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="match in matches" :key="match.id">
                <td>{{ match.matchNumber }}</td>
                <td><strong>{{ match.homeTeam }}</strong> {{ t('common.vs') }} <strong>{{ match.awayTeam }}</strong></td>
                <td>{{ formatDate(match.kickoffTime) }}</td>
                <td><span :class="['badge', `badge-${match.status}`]">{{ statusLabel(match.status) }}</span></td>
                <td>
                  <div v-if="editingId === match.id" class="prediction-inputs">
                    <input v-model.number="resultForm.homeScore" type="number" min="0" class="form-control" style="width: 60px; text-align: center;" />
                    <span>:</span>
                    <input v-model.number="resultForm.awayScore" type="number" min="0" class="form-control" style="width: 60px; text-align: center;" />
                    <button class="btn btn-primary btn-sm" @click="saveResult(match)">{{ t('common.save') }}</button>
                    <button class="btn btn-secondary btn-sm" @click="editingId = null">{{ t('common.cancel') }}</button>
                  </div>
                  <span v-else-if="match.status === 'finished'">{{ match.homeScore }} : {{ match.awayScore }}</span>
                  <span v-else class="text-muted">–</span>
                </td>
                <td>
                  <div class="btn-group">
                    <button class="btn btn-primary btn-sm" @click="startEdit(match)">{{ t('adminPages.results.setResult') }}</button>
                    <button v-if="match.status !== 'locked' && match.status !== 'finished'" class="btn btn-secondary btn-sm" @click="lockMatch(match)">{{ t('adminPages.results.lock') }}</button>
                    <button v-if="match.isManuallyLocked" class="btn btn-secondary btn-sm" @click="unlockMatch(match)">{{ t('adminPages.results.unlock') }}</button>
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
import ErrorState from '../../components/ErrorState.vue';

const { t, locale } = useI18n();

const matches = ref([]);
const loading = ref(true);
const editingId = ref(null);
const resultForm = ref({ homeScore: 0, awayScore: 0 });
const message = ref('');
const loadError = ref('');
const error = ref('');

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(locale.value);
}

function statusLabel(status) {
  return t(`adminPages.results.statusLabels.${status}`, status);
}

async function loadMatches() {
  loading.value = true;
  loadError.value = '';
  try {
    const { data } = await api.get('/matches');
    matches.value = data;
  } catch (err) {
    loadError.value = err.response?.data?.error || t('adminPages.results.loadFailed');
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
    message.value = t('adminPages.results.resultSaved');
    editingId.value = null;
    await loadMatches();
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.results.saveFailed');
  }
}

async function lockMatch(match) {
  try {
    await api.post(`/matches/${match.id}/lock`);
    message.value = t('adminPages.results.matchLocked');
    await loadMatches();
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.results.lockFailed');
  }
}

async function unlockMatch(match) {
  try {
    await api.post(`/matches/${match.id}/unlock`);
    message.value = t('adminPages.results.matchUnlocked');
    await loadMatches();
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.results.unlockFailed');
  }
}

onMounted(loadMatches);
</script>
