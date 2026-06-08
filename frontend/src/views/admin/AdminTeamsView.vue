<template>
  <div>
    <div class="page-header">
      <h1>{{ t('adminPages.teams.title') }}</h1>
      <div class="page-header-actions">
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          :disabled="seeding"
          @click="handleSeedDefaults"
        >
          {{ seeding ? t('adminPages.teams.seedingDefaults') : t('adminPages.teams.seedDefaults') }}
        </button>
        <button type="button" class="btn btn-primary btn-sm" @click="openCreate">+ {{ t('adminPages.teams.newTeam') }}</button>
      </div>
    </div>

    <AlertMessage v-if="message" :message="message" type="success" />
    <ErrorState v-if="loadError" :message="loadError" @retry="loadTeams" />
    <AlertMessage v-else-if="error" :message="error" type="error" />

    <LoadingSpinner v-if="loading" />

    <div v-else class="card">
      <div class="card-body">
        <AdminTable :items="teams" :columns="columns" @edit="openEdit" @delete="requestDelete">
          <template #cell-imageUrl="{ item }">
            <TeamAvatar :image-url="item.imageUrl" :name="item.name" size="sm" />
          </template>
        </AdminTable>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          :aria-label="editingTeam ? t('adminPages.teams.editTeam') : t('adminPages.teams.createTeam')"
        >
          <div class="modal-header">
            <h3>{{ editingTeam ? t('adminPages.teams.editTeam') : t('adminPages.teams.createTeam') }}</h3>
            <button type="button" class="modal-close" :aria-label="t('common.close')" @click="closeModal">&times;</button>
          </div>
          <form @submit.prevent="handleSave">
            <div class="modal-body">
              <div class="form-group">
                <label>{{ t('adminPages.teams.form.name') }}</label>
                <input v-model="form.name" class="form-control" required />
              </div>
              <div class="form-group">
                <label>{{ t('adminPages.teams.form.description') }}</label>
                <input v-model="form.description" class="form-control" />
              </div>
              <div v-if="editingTeam" class="form-group">
                <label>{{ t('adminPages.teams.teamImage') }}</label>
                <div class="team-image-editor">
                  <TeamAvatar
                    :image-url="previewUrl || editingTeam.imageUrl"
                    :name="form.name"
                    size="lg"
                  />
                  <div class="team-image-actions">
                    <input
                      ref="fileInput"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      class="form-control"
                      @change="onFileSelected"
                    />
                    <p class="text-muted team-image-hint">{{ t('adminPages.teams.uploadHint') }}</p>
                    <button
                      v-if="editingTeam.imageUrl && !selectedFile"
                      type="button"
                      class="btn btn-secondary btn-sm"
                      :disabled="imageBusy"
                      @click="removeImage"
                    >
                      {{ t('adminPages.teams.removeImage') }}
                    </button>
                  </div>
                </div>
              </div>
              <p v-else class="text-muted team-image-hint">
                {{ t('adminPages.teams.createImageHint') }}
              </p>
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
import {
  ref, computed, onMounted, onUnmounted,
} from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner.vue';
import AdminTable from '../../components/AdminTable.vue';
import AlertMessage from '../../components/AlertMessage.vue';
import ErrorState from '../../components/ErrorState.vue';
import TeamAvatar from '../../components/TeamAvatar.vue';
import ConfirmModal from '../../components/ConfirmModal.vue';
import { useConfirmModal } from '../../composables/useConfirmModal';

const { t } = useI18n();
const { confirmState, openConfirm, closeConfirm, onConfirm } = useConfirmModal();

const teams = ref([]);
const loading = ref(true);
const seeding = ref(false);
const showModal = ref(false);
const editingTeam = ref(null);
const saving = ref(false);
const imageBusy = ref(false);
const message = ref('');
const loadError = ref('');
const error = ref('');
const selectedFile = ref(null);
const previewUrl = ref('');
const fileInput = ref(null);

const columns = computed(() => [
  { key: 'imageUrl', label: t('adminPages.teams.columns.image') },
  { key: 'name', label: t('adminPages.teams.columns.name') },
  { key: 'description', label: t('adminPages.teams.columns.description') },
]);

const form = ref({ name: '', description: '' });

function closeModal() {
  showModal.value = false;
}

function onKeydown(event) {
  if (event.key === 'Escape' && showModal.value) closeModal();
}

function clearFileSelection() {
  selectedFile.value = null;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = '';
  if (fileInput.value) fileInput.value.value = '';
}

async function loadTeams() {
  loading.value = true;
  loadError.value = '';
  try {
    const { data } = await api.get('/teams');
    teams.value = data;
  } catch (err) {
    loadError.value = err.response?.data?.error || t('adminPages.teams.loadFailed');
    teams.value = [];
  } finally {
    loading.value = false;
  }
}

async function handleSeedDefaults() {
  seeding.value = true;
  error.value = '';
  try {
    const { data } = await api.post('/teams/seed-defaults');
    teams.value = data.teams || [];
    const created = data.created?.length || 0;
    message.value = created
      ? `${data.message || t('adminPages.teams.seedSuccess')} (${t('adminPages.teams.seedCreated', { count: created })})`
      : (data.message || t('adminPages.teams.seedAllPresent'));
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.teams.seedFailed');
  } finally {
    seeding.value = false;
  }
}

function openCreate() {
  editingTeam.value = null;
  form.value = { name: '', description: '' };
  clearFileSelection();
  showModal.value = true;
}

function openEdit(team) {
  editingTeam.value = team;
  form.value = { name: team.name, description: team.description || '' };
  clearFileSelection();
  showModal.value = true;
}

function onFileSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    error.value = t('adminPages.teams.imageTooLarge');
    clearFileSelection();
    return;
  }
  selectedFile.value = file;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = URL.createObjectURL(file);
}

async function uploadImage(teamId) {
  if (!selectedFile.value) return;
  const formData = new FormData();
  formData.append('image', selectedFile.value);
  await api.post(`/teams/${teamId}/image`, formData);
}

async function removeImage() {
  if (!editingTeam.value) return;
  imageBusy.value = true;
  error.value = '';
  try {
    await api.delete(`/teams/${editingTeam.value.id}/image`);
    editingTeam.value.imageUrl = null;
    message.value = t('adminPages.teams.imageRemoved');
    await loadTeams();
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.teams.imageRemoveFailed');
  } finally {
    imageBusy.value = false;
  }
}

async function handleSave() {
  saving.value = true;
  error.value = '';
  try {
    let teamId = editingTeam.value?.id;

    if (editingTeam.value) {
      await api.put(`/teams/${editingTeam.value.id}`, form.value);
    } else {
      const { data } = await api.post('/teams', form.value);
      teamId = data.id;
    }

    if (teamId && selectedFile.value) {
      await uploadImage(teamId);
    }

    message.value = selectedFile.value
      ? (editingTeam.value ? t('adminPages.teams.teamUpdatedWithImage') : t('adminPages.teams.teamCreatedWithImage'))
      : (editingTeam.value ? t('adminPages.teams.teamUpdated') : t('adminPages.teams.teamCreated'));

    showModal.value = false;
    clearFileSelection();
    await loadTeams();
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.teams.saveFailed');
  } finally {
    saving.value = false;
  }
}

function requestDelete(team) {
  openConfirm({
    title: t('common.delete'),
    message: t('adminPages.teams.confirmDelete', { name: team.name }),
    confirmLabel: t('common.delete'),
    danger: true,
    action: () => handleDelete(team),
  });
}

async function handleDelete(team) {
  try {
    await api.delete(`/teams/${team.id}`);
    message.value = t('adminPages.teams.teamDeleted');
    await loadTeams();
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.teams.deleteFailed');
  }
}

onMounted(() => {
  loadTeams();
  globalThis.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  globalThis.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
.team-image-editor {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.team-image-actions {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.team-image-hint {
  font-size: 0.8rem;
  margin: 0;
}

.page-header-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
