<template>
  <div>
    <div class="page-header">
      <h1>{{ t('adminPages.matches.title') }}</h1>
      <button class="btn btn-primary btn-sm" @click="openCreate">+ {{ t('adminPages.matches.newMatch') }}</button>
    </div>

    <AlertMessage v-if="message" :message="message" type="success" />
    <ErrorState v-if="loadError" :message="loadError" @retry="loadMatches" />
    <AlertMessage v-else-if="error" :message="error" type="error" />

    <LoadingSpinner v-if="loading" />

    <div v-else class="card">
      <div class="card-body">
        <MatchTable :matches="matches" show-actions show-match-ref @edit="openEdit" @delete="requestDelete" />
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          :aria-label="editingMatch ? t('adminPages.matches.editMatch') : t('adminPages.matches.createMatch')"
        >
          <div class="modal-header">
            <h3>{{ editingMatch ? t('adminPages.matches.editMatch') : t('adminPages.matches.createMatch') }}</h3>
            <button type="button" class="modal-close" :aria-label="t('common.close')" @click="closeModal">&times;</button>
          </div>
          <form @submit.prevent="handleSave">
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label>{{ t('adminPages.matches.form.matchNumber') }}</label>
                  <input v-model.number="form.matchNumber" type="number" class="form-control" required />
                </div>
                <div class="form-group">
                  <label>{{ t('adminPages.matches.form.stage') }}</label>
                  <input v-model="form.stage" class="form-control" required :placeholder="t('adminPages.matches.form.stagePlaceholder')" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>{{ t('adminPages.matches.form.group') }}</label>
                  <input v-model="form.groupName" class="form-control" placeholder="A" />
                </div>
                <div class="form-group">
                  <label>{{ t('adminPages.matches.form.kickoffTime') }}</label>
                  <input v-model="form.kickoffTime" type="datetime-local" class="form-control" required />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>{{ t('adminPages.matches.form.homeTeam') }}</label>
                  <input v-model="form.homeTeam" class="form-control" required />
                </div>
                <div class="form-group">
                  <label>{{ t('adminPages.matches.form.awayTeam') }}</label>
                  <input v-model="form.awayTeam" class="form-control" required />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>{{ t('adminPages.matches.form.stadium') }}</label>
                  <input v-model="form.stadium" class="form-control" />
                </div>
                <div class="form-group">
                  <label>{{ t('adminPages.matches.form.city') }}</label>
                  <input v-model="form.city" class="form-control" />
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closeModal">{{ t('common.cancel') }}</button>
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{ saving ? t('common.saving') : t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

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
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner.vue';
import MatchTable from '../../components/MatchTable.vue';
import AlertMessage from '../../components/AlertMessage.vue';
import ErrorState from '../../components/ErrorState.vue';
import ConfirmModal from '../../components/ConfirmModal.vue';
import { useConfirmModal } from '../../composables/useConfirmModal';

const { t } = useI18n();
const { confirmState, openConfirm, closeConfirm, onConfirm } = useConfirmModal();

const matches = ref([]);
const loading = ref(true);
const showModal = ref(false);
const editingMatch = ref(null);
const saving = ref(false);
const message = ref('');
const loadError = ref('');
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

function closeModal() {
  showModal.value = false;
}

function onKeydown(event) {
  if (event.key === 'Escape' && showModal.value) closeModal();
}

async function loadMatches() {
  loading.value = true;
  loadError.value = '';
  try {
    const { data } = await api.get('/matches');
    matches.value = data;
  } catch (err) {
    loadError.value = err.response?.data?.error || t('adminPages.matches.loadFailed');
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
      message.value = t('adminPages.matches.matchUpdated');
    } else {
      await api.post('/matches', payload);
      message.value = t('adminPages.matches.matchCreated');
    }
    showModal.value = false;
    await loadMatches();
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.matches.saveFailed');
  } finally {
    saving.value = false;
  }
}

function requestDelete(match) {
  openConfirm({
    title: t('common.delete'),
    message: t('adminPages.matches.confirmDelete', { number: match.matchNumber }),
    confirmLabel: t('common.delete'),
    danger: true,
    action: () => handleDelete(match),
  });
}

async function handleDelete(match) {
  try {
    await api.delete(`/matches/${match.id}`);
    message.value = t('adminPages.matches.matchDeleted');
    await loadMatches();
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.matches.deleteFailed');
  }
}

onMounted(() => {
  loadMatches();
  globalThis.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  globalThis.removeEventListener('keydown', onKeydown);
});
</script>
