<template>
  <div>
    <div class="page-header">
      <h1>{{ t('adminPages.users.title') }}</h1>
      <button class="btn btn-primary btn-sm" @click="openCreate">+ Neuer Benutzer</button>
    </div>

    <AlertMessage v-if="message" :message="message" type="success" />
    <AlertMessage v-if="error" :message="error" type="error" />

    <LoadingSpinner v-if="loading" />

    <div v-else class="card">
      <div class="card-body">
        <AdminTable
          :items="users"
          :columns="columns"
          @edit="openEdit"
          @delete="handleDelete"
        >
          <template #cell-imageUrl="{ item }">
            <UserAvatar
              :image-url="item.imageUrl"
              :first-name="item.firstName"
              :last-name="item.lastName"
              size="sm"
            />
          </template>
          <template #cell-role="{ item }">
            <span :class="['badge', item.role === 'admin' ? 'badge-admin' : 'badge-info']">
              {{ item.role === 'admin' ? 'Admin' : 'Benutzer' }}
            </span>
          </template>
          <template #cell-emailVerified="{ item }">
            <span :class="['badge', item.emailVerified ? 'badge-success' : 'badge-warning']">
              {{ item.emailVerified ? 'Bestätigt' : 'Offen' }}
            </span>
          </template>
          <template #cell-team="{ item }">
            {{ item.team?.name || '–' }}
          </template>
        </AdminTable>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingUser ? 'Benutzer bearbeiten' : 'Neuer Benutzer' }}</h3>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <form @submit.prevent="handleSave">
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label>Vorname</label>
                <input v-model="form.firstName" class="form-control" required />
              </div>
              <div class="form-group">
                <label>Nachname</label>
                <input v-model="form.lastName" class="form-control" required />
              </div>
            </div>
            <div class="form-group">
              <label>E-Mail</label>
              <input v-model="form.email" type="email" class="form-control" required />
            </div>
            <div class="form-group">
              <label>Passwort {{ editingUser ? '(leer = unverändert)' : '' }}</label>
              <input v-model="form.password" type="password" class="form-control" :required="!editingUser" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Rolle</label>
                <select v-model="form.role" class="form-control">
                  <option value="user">Benutzer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div class="form-group">
                <label>Team</label>
                <select v-model="form.teamId" class="form-control">
                  <option :value="null">Kein Team</option>
                  <option v-for="t in teams" :key="t.id" :value="t.id">{{ t.name }}</option>
                </select>
              </div>
            </div>
            <div v-if="editingUser" class="form-group">
              <label>Profilbild</label>
              <div class="user-image-editor">
                <UserAvatar
                  :image-url="previewUrl || editingUser.imageUrl"
                  :first-name="form.firstName"
                  :last-name="form.lastName"
                  size="lg"
                />
                <div class="user-image-actions">
                  <input
                    ref="fileInput"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    class="form-control"
                    @change="onFileSelected"
                  />
                  <p class="text-muted user-image-hint">JPG, PNG, WebP oder GIF, max. 2 MB</p>
                  <button
                    v-if="editingUser.imageUrl && !selectedFile"
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
            <div v-if="editingUser" class="form-group">
              <label class="checkbox-label">
                <input v-model="form.emailVerified" type="checkbox" />
                E-Mail bestätigt
              </label>
            </div>
            <p v-else class="text-muted user-image-hint">
              Nach dem Erstellen kannst du ein Profilbild hochladen.
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
import UserAvatar from '../../components/UserAvatar.vue';


const { t } = useI18n();

const users = ref([]);
const teams = ref([]);
const loading = ref(true);
const showModal = ref(false);
const editingUser = ref(null);
const saving = ref(false);
const message = ref('');
const error = ref('');

const selectedFile = ref(null);
const previewUrl = ref('');
const imageBusy = ref(false);
const fileInput = ref(null);

const columns = [
  { key: 'imageUrl', label: 'Bild' },
  { key: 'firstName', label: 'Vorname' },
  { key: 'lastName', label: 'Nachname' },
  { key: 'email', label: 'E-Mail' },
  { key: 'emailVerified', label: 'Bestätigt' },
  { key: 'role', label: 'Rolle' },
  { key: 'team', label: 'Team' },
];

const form = ref({ firstName: '', lastName: '', email: '', password: '', role: 'user', teamId: null, emailVerified: true });

async function loadData() {
  loading.value = true;
  try {
    const [usersRes, teamsRes] = await Promise.all([
      api.get('/users'),
      api.get('/teams'),
    ]);
    users.value = usersRes.data;
    teams.value = teamsRes.data;
  } finally {
    loading.value = false;
  }
}

function clearFileSelection() {
  selectedFile.value = null;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = '';
  if (fileInput.value) fileInput.value.value = '';
}

function openCreate() {
  editingUser.value = null;
  form.value = { firstName: '', lastName: '', email: '', password: '', role: 'user', teamId: null, emailVerified: true };
  clearFileSelection();
  showModal.value = true;
}

function openEdit(user) {
  editingUser.value = user;
  form.value = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    password: '',
    role: user.role,
    teamId: user.teamId,
    emailVerified: !!user.emailVerified,
  };
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

async function uploadImage(userId) {
  if (!selectedFile.value) return;
  const formData = new FormData();
  formData.append('image', selectedFile.value);
  await api.post(`/users/${userId}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

async function removeImage() {
  if (!editingUser.value) return;
  imageBusy.value = true;
  error.value = '';
  try {
    await api.delete(`/users/${editingUser.value.id}/image`);
    editingUser.value.imageUrl = null;
    message.value = 'Profilbild entfernt.';
    await loadData();
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
    const payload = { ...form.value };
    if (editingUser.value && !payload.password) delete payload.password;

    let userId = editingUser.value?.id;

    if (editingUser.value) {
      await api.put(`/users/${editingUser.value.id}`, payload);
      message.value = 'Benutzer aktualisiert.';
    } else {
      const { data } = await api.post('/users', payload);
      userId = data.id;
      message.value = 'Benutzer erstellt.';
    }

    if (userId && selectedFile.value) {
      await uploadImage(userId);
      message.value = editingUser.value ? 'Benutzer und Profilbild aktualisiert.' : 'Benutzer erstellt und Profilbild hochgeladen.';
    }

    showModal.value = false;
    clearFileSelection();
    await loadData();
  } catch (err) {
    error.value = err.response?.data?.error || 'Fehler beim Speichern.';
  } finally {
    saving.value = false;
  }
}

async function handleDelete(user) {
  if (!confirm(`Benutzer "${user.firstName} ${user.lastName}" wirklich löschen?`)) return;
  try {
    await api.delete(`/users/${user.id}`);
    message.value = 'Benutzer gelöscht.';
    await loadData();
  } catch (err) {
    error.value = err.response?.data?.error || 'Löschen fehlgeschlagen.';
  }
}

onMounted(loadData);
</script>

<style scoped>
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.badge-success {
  background: var(--color-success-bg, #e8f5e9);
  color: var(--color-success, #107e3e);
}

.badge-warning {
  background: var(--color-warning-bg, #fff3e0);
  color: var(--color-warning, #e9730c);
}

.user-image-editor {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.user-image-actions {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.user-image-hint {
  font-size: 0.8rem;
  margin: 0;
}
</style>
