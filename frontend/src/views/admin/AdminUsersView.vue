<template>
  <div>
    <div class="page-header">
      <h1>{{ t('adminPages.users.title') }}</h1>
      <div class="header-actions">
        <template v-if="selectedIds.length">
          <span class="selected-count">{{ t('adminPages.users.selectedCount', { count: selectedIds.length }) }}</span>
          <button
            class="btn btn-secondary btn-sm"
            :disabled="emailBusy"
            @click="requestTipReminders"
          >
            {{ emailBusy ? t('adminPages.users.sending') : t('adminPages.users.sendTipReminders') }}
          </button>
          <button
            class="btn btn-accent btn-sm"
            :disabled="emailBusy"
            @click="requestStatusUpdates"
          >
            {{ emailBusy ? t('adminPages.users.sending') : t('adminPages.users.sendStatusUpdate') }}
          </button>
        </template>
        <button class="btn btn-primary btn-sm" @click="openCreate">+ {{ t('adminPages.users.newUser') }}</button>
      </div>
    </div>

    <AlertMessage v-if="message" :message="message" type="success" />
    <ErrorState v-if="loadError" :message="loadError" @retry="loadData" />
    <AlertMessage v-else-if="error" :message="error" type="error" />

    <LoadingSpinner v-if="loading" />

    <div v-else class="card">
      <div class="card-body">
        <AdminTable
          v-model:selected-ids="selectedIds"
          :items="users"
          :columns="columns"
          selectable
          @edit="openEdit"
          @delete="requestDelete"
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
              {{ item.role === 'admin' ? t('adminPages.users.roleAdmin') : t('adminPages.users.roleUser') }}
            </span>
          </template>
          <template #cell-emailVerified="{ item }">
            <span :class="['badge', item.emailVerified ? 'badge-success' : 'badge-warning']">
              {{ item.emailVerified ? t('adminPages.users.verified') : t('adminPages.users.pending') }}
            </span>
          </template>
          <template #cell-team="{ item }">
            {{ item.team?.name || '–' }}
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
          :aria-label="editingUser ? t('adminPages.users.editUser') : t('adminPages.users.createUser')"
        >
          <div class="modal-header">
            <h3>{{ editingUser ? t('adminPages.users.editUser') : t('adminPages.users.createUser') }}</h3>
            <button
              type="button"
              class="modal-close"
              :aria-label="t('common.close')"
              @click="closeModal"
            >
              &times;
            </button>
          </div>
          <form @submit.prevent="handleSave">
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label>{{ t('adminPages.users.form.firstName') }}</label>
                  <input v-model="form.firstName" class="form-control" required />
                </div>
                <div class="form-group">
                  <label>{{ t('adminPages.users.form.lastName') }}</label>
                  <input v-model="form.lastName" class="form-control" required />
                </div>
              </div>
              <div class="form-group">
                <label>{{ t('adminPages.users.form.email') }}</label>
                <input v-model="form.email" type="email" class="form-control" required />
              </div>
              <div class="form-group">
                <label>
                  {{ t('adminPages.users.form.password') }}
                  <span v-if="editingUser" class="text-muted">{{ t('adminPages.users.passwordOptionalHint') }}</span>
                </label>
                <input v-model="form.password" type="password" class="form-control" :required="!editingUser" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>{{ t('adminPages.users.form.role') }}</label>
                  <select v-model="form.role" class="form-control">
                    <option value="user">{{ t('adminPages.users.roleUser') }}</option>
                    <option value="admin">{{ t('adminPages.users.roleAdmin') }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>{{ t('adminPages.users.form.team') }}</label>
                  <select v-model="form.teamId" class="form-control">
                    <option :value="null">{{ t('common.noTeam') }}</option>
                    <option v-for="team in teams" :key="team.id" :value="team.id">{{ team.name }}</option>
                  </select>
                </div>
              </div>
              <div v-if="editingUser" class="form-group">
                <label>{{ t('adminPages.users.profileImage') }}</label>
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
                    <p class="text-muted user-image-hint">{{ t('adminPages.users.uploadHint') }}</p>
                    <button
                      v-if="editingUser.imageUrl && !selectedFile"
                      type="button"
                      class="btn btn-secondary btn-sm"
                      :disabled="imageBusy"
                      @click="removeImage"
                    >
                      {{ t('adminPages.users.removeImage') }}
                    </button>
                  </div>
                </div>
              </div>
              <div v-if="editingUser" class="form-group">
                <label class="checkbox-label">
                  <input v-model="form.emailVerified" type="checkbox" />
                  {{ t('adminPages.users.emailVerifiedLabel') }}
                </label>
              </div>
              <p v-else class="text-muted user-image-hint">
                {{ t('adminPages.users.createImageHint') }}
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
import UserAvatar from '../../components/UserAvatar.vue';
import ConfirmModal from '../../components/ConfirmModal.vue';

const { t } = useI18n();

const users = ref([]);
const teams = ref([]);
const loading = ref(true);
const showModal = ref(false);
const editingUser = ref(null);
const saving = ref(false);
const message = ref('');
const loadError = ref('');
const error = ref('');
const selectedIds = ref([]);
const emailBusy = ref(false);

const selectedFile = ref(null);
const previewUrl = ref('');
const imageBusy = ref(false);
const fileInput = ref(null);

const confirmState = ref({
  open: false,
  title: '',
  message: '',
  confirmLabel: '',
  danger: false,
  action: null,
});

const columns = computed(() => [
  { key: 'imageUrl', label: t('adminPages.users.columns.image') },
  { key: 'firstName', label: t('adminPages.users.columns.firstName') },
  { key: 'lastName', label: t('adminPages.users.columns.lastName') },
  { key: 'email', label: t('adminPages.users.columns.email') },
  { key: 'emailVerified', label: t('adminPages.users.columns.emailVerified') },
  { key: 'role', label: t('adminPages.users.columns.role') },
  { key: 'team', label: t('adminPages.users.columns.team') },
]);

const form = ref({
  firstName: '', lastName: '', email: '', password: '', role: 'user', teamId: null, emailVerified: true,
});

function openConfirm({ title, message, confirmLabel, danger, action }) {
  confirmState.value = {
    open: true, title, message, confirmLabel, danger, action,
  };
}

function closeConfirm() {
  confirmState.value = { ...confirmState.value, open: false, action: null };
}

function onConfirm() {
  const action = confirmState.value.action;
  closeConfirm();
  action?.();
}

function onKeydown(event) {
  if (event.key === 'Escape' && showModal.value) closeModal();
}

function closeModal() {
  showModal.value = false;
}

async function loadData() {
  loading.value = true;
  loadError.value = '';
  try {
    const [usersRes, teamsRes] = await Promise.all([
      api.get('/users'),
      api.get('/teams'),
    ]);
    users.value = usersRes.data;
    teams.value = teamsRes.data;
  } catch (err) {
    loadError.value = err.response?.data?.error || t('adminPages.users.loadFailed');
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
  form.value = {
    firstName: '', lastName: '', email: '', password: '', role: 'user', teamId: null, emailVerified: true,
  };
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
    error.value = t('adminPages.users.imageTooLarge');
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
    message.value = t('adminPages.users.imageRemoved');
    await loadData();
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.users.imageRemoveFailed');
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
      message.value = t('adminPages.users.userUpdated');
    } else {
      const { data } = await api.post('/users', payload);
      userId = data.id;
      message.value = t('adminPages.users.userCreated');
    }

    if (userId && selectedFile.value) {
      await uploadImage(userId);
      message.value = editingUser.value
        ? t('adminPages.users.userUpdatedWithImage')
        : t('adminPages.users.userCreatedWithImage');
    }

    showModal.value = false;
    clearFileSelection();
    await loadData();
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.users.saveFailed');
  } finally {
    saving.value = false;
  }
}

function requestDelete(user) {
  openConfirm({
    title: t('common.delete'),
    message: t('adminPages.users.confirmDelete', { name: `${user.firstName} ${user.lastName}` }),
    confirmLabel: t('common.delete'),
    danger: true,
    action: () => handleDelete(user),
  });
}

async function handleDelete(user) {
  try {
    await api.delete(`/users/${user.id}`);
    message.value = t('adminPages.users.userDeleted');
    selectedIds.value = selectedIds.value.filter((id) => id !== user.id);
    await loadData();
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.users.deleteFailed');
  }
}

function requestTipReminders() {
  if (selectedIds.value.length === 0) {
    error.value = t('adminPages.users.noSelection');
    return;
  }
  openConfirm({
    title: t('adminPages.users.sendTipReminders'),
    message: t('adminPages.users.confirmTipReminders', { count: selectedIds.value.length }),
    action: sendTipReminders,
  });
}

function requestStatusUpdates() {
  if (selectedIds.value.length === 0) {
    error.value = t('adminPages.users.noSelection');
    return;
  }
  openConfirm({
    title: t('adminPages.users.sendStatusUpdate'),
    message: t('adminPages.users.confirmStatusUpdate', { count: selectedIds.value.length }),
    action: sendStatusUpdates,
  });
}

async function sendTipReminders() {
  emailBusy.value = true;
  error.value = '';
  message.value = '';
  try {
    const { data } = await api.post('/admin/email/send-user-reminders', { userIds: selectedIds.value });
    message.value = data.message || t('adminPages.users.emailsSent', { count: data.sent });
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.users.emailsFailed');
  } finally {
    emailBusy.value = false;
  }
}

async function sendStatusUpdates() {
  emailBusy.value = true;
  error.value = '';
  message.value = '';
  try {
    const { data } = await api.post('/admin/email/send-status-updates', { userIds: selectedIds.value });
    message.value = data.message || t('adminPages.users.emailsSent', { count: data.sent });
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.users.statusUpdatesFailed');
  } finally {
    emailBusy.value = false;
  }
}

onMounted(() => {
  loadData();
  globalThis.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  globalThis.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.selected-count {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-right: 0.25rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
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
