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
          {{ seeding ? 'Lade Teams...' : 'Standard-Teams laden' }}
        </button>
        <button type="button" class="btn btn-primary btn-sm" @click="openCreate">+ Neues Team</button>
      </div>
    </div>

    <AlertMessage v-if="message" :message="message" type="success" />
    <AlertMessage v-if="error" :message="error" type="error" />

    <LoadingSpinner v-if="loading" />

    <div v-else class="card">
      <div class="card-body">
        <AdminTable :items="teams" :columns="columns" @edit="openEdit" @delete="handleDelete">
          <template #cell-imageUrl="{ item }">
            <TeamAvatar :image-url="item.imageUrl" :name="item.name" size="sm" />
          </template>
        </AdminTable>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingTeam ? 'Team bearbeiten' : 'Neues Team' }}</h3>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <form @submit.prevent="handleSave">
          <div class="modal-body">
            <div class="form-group">
              <label>Name</label>
              <input v-model="form.name" class="form-control" required />
            </div>
            <div class="form-group">
              <label>Beschreibung</label>
              <input v-model="form.description" class="form-control" />
            </div>
            <div v-if="editingTeam" class="form-group">
              <label>Team-Bild</label>
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
                  <p class="text-muted team-image-hint">JPG, PNG, WebP oder GIF, max. 2 MB</p>
                  <button
                    v-if="editingTeam.imageUrl && !selectedFile"
                    type="button"
                    class="btn btn-secondary btn-sm"
                    :disabled="imageBusy"
                    @click="removeImage"
                  >
                    Bild entfernen
                  </button>
                </div>
              </div>
            </div>
            <p v-else class="text-muted team-image-hint">
              Nach dem Erstellen kannst du ein Team-Bild hochladen.
            </p>
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
import AdminTable from '../../components/AdminTable.vue';
import AlertMessage from '../../components/AlertMessage.vue';
import TeamAvatar from '../../components/TeamAvatar.vue';


const { t } = useI18n();

const teams = ref([]);
const loading = ref(true);
const seeding = ref(false);
const showModal = ref(false);
const editingTeam = ref(null);
const saving = ref(false);
const imageBusy = ref(false);
const message = ref('');
const error = ref('');
const selectedFile = ref(null);
const previewUrl = ref('');
const fileInput = ref(null);

const columns = [
  { key: 'imageUrl', label: 'Bild' },
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Beschreibung' },
];

const form = ref({ name: '', description: '' });

function clearFileSelection() {
  selectedFile.value = null;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = '';
  if (fileInput.value) fileInput.value.value = '';
}

async function loadTeams() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/teams');
    teams.value = data;
  } catch (err) {
    error.value = err.response?.data?.error || 'Teams konnten nicht geladen werden.';
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
      ? `${data.message || 'Standard-Teams geladen.'} (${created} neu)`
      : (data.message || 'Alle Standard-Teams sind bereits vorhanden.');
  } catch (err) {
    error.value = err.response?.data?.error || 'Standard-Teams konnten nicht geladen werden.';
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
    error.value = 'Bild ist zu groß (max. 2 MB).';
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
    message.value = 'Team-Bild entfernt.';
    await loadTeams();
  } catch (err) {
    error.value = err.response?.data?.error || 'Bild konnte nicht entfernt werden.';
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
      ? (editingTeam.value ? 'Team und Bild aktualisiert.' : 'Team erstellt und Bild hochgeladen.')
      : (editingTeam.value ? 'Team aktualisiert.' : 'Team erstellt.');

    showModal.value = false;
    clearFileSelection();
    await loadTeams();
  } catch (err) {
    error.value = err.response?.data?.error || 'Fehler beim Speichern.';
  } finally {
    saving.value = false;
  }
}

async function handleDelete(team) {
  if (!confirm(`Team "${team.name}" wirklich löschen?`)) return;
  try {
    await api.delete(`/teams/${team.id}`);
    message.value = 'Team gelöscht.';
    await loadTeams();
  } catch (err) {
    error.value = err.response?.data?.error || 'Löschen fehlgeschlagen.';
  }
}

onMounted(loadTeams);
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
