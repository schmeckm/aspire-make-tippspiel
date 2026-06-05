<template>
  <div>
    <div class="page-header">
      <h1>{{ t('adminPlayerImages.title') }}</h1>
      <button class="btn btn-primary btn-sm" @click="openCreate">
        + {{ t('adminPlayerImages.addRecord') }}
      </button>
    </div>

    <AlertMessage v-if="message" :message="message" type="success" />
    <AlertMessage v-if="error" :message="error" type="error" />

    <div class="card mb-3">
      <div class="card-body">
        <div class="player-image-search-bar">
          <input
            v-model="searchQuery"
            type="search"
            class="form-control"
            :placeholder="t('adminPlayerImages.searchPlaceholder')"
            @keyup.enter="loadRecords"
          />
          <button class="btn btn-secondary btn-sm" @click="loadRecords">
            {{ t('adminPlayerImages.search') }}
          </button>
        </div>
        <p v-if="status" class="text-muted player-image-status">
          {{ t('adminPlayerImages.statusEnabled') }}:
          {{ status.enabled ? t('common.yes') : t('common.no') }}
        </p>
        <ul v-if="status?.providers?.length" class="provider-status-list">
          <li v-for="provider in status.providers" :key="provider.id">
            <strong>{{ provider.label }}</strong>
            <span v-if="provider.requiresApiKey">
              – {{ provider.configured ? t('adminPlayerImages.providerConfigured') : t('adminPlayerImages.providerNotConfigured') }}
            </span>
          </li>
        </ul>
      </div>
    </div>

    <LoadingSpinner v-if="loading" />

    <div v-else class="card">
      <div class="card-body">
        <div v-if="records.length === 0" class="empty-state">
          <p>{{ t('adminPlayerImages.empty') }}</p>
        </div>
        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{{ t('adminPlayerImages.preview') }}</th>
                <th>{{ t('adminPlayerImages.player') }}</th>
                <th>{{ t('adminPlayerImages.team') }}</th>
                <th>{{ t('adminPlayerImages.source') }}</th>
                <th>{{ t('adminPlayerImages.approved') }}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in records" :key="record.id">
                <td>
                  <PlayerAvatar :image-url="record.imageUrl" :name="record.playerName" size="sm" />
                </td>
                <td><strong>{{ record.playerName }}</strong></td>
                <td>{{ record.teamName || '–' }}</td>
                <td>{{ record.source || '–' }}</td>
                <td>
                  <span :class="record.isManuallyApproved ? 'badge badge-success' : 'badge badge-secondary'">
                    {{ record.isManuallyApproved ? t('common.yes') : t('common.no') }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-secondary btn-sm" @click="openEdit(record)">
                    {{ t('common.edit') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>{{ editingRecord ? t('adminPlayerImages.editTitle') : t('adminPlayerImages.createTitle') }}</h3>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>
        <form @submit.prevent="handleSave">
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label>{{ t('adminPlayerImages.player') }}</label>
                <input v-model="form.playerName" class="form-control" required />
              </div>
              <div class="form-group">
                <label>{{ t('adminPlayerImages.team') }}</label>
                <input v-model="form.teamName" class="form-control" />
              </div>
              <div class="form-group">
                <label>{{ t('adminPlayerImages.countryCode') }}</label>
                <input v-model="form.countryCode" class="form-control" maxlength="3" />
              </div>
            </div>

            <div class="player-image-editor">
              <PlayerAvatar
                :image-url="previewUrl || selectedResult?.imageUrl || editingRecord?.imageUrl"
                :name="form.playerName"
                size="lg"
              />
              <div class="player-image-editor-actions">
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  :disabled="searchBusy || !form.playerName.trim()"
                  @click="searchProviders"
                >
                  {{ searchBusy ? t('adminPlayerImages.searching') : t('adminPlayerImages.searchProviders') }}
                </button>
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  class="form-control"
                  @change="onFileSelected"
                />
                <p class="text-muted">{{ t('adminPlayerImages.uploadHint') }}</p>
              </div>
            </div>

            <div v-if="providerResults.length" class="provider-results">
              <h4>{{ t('adminPlayerImages.providerResults') }}</h4>
              <div
                v-for="(result, idx) in providerResults"
                :key="idx"
                class="provider-result-card"
                :class="{ selected: selectedResult === result }"
                @click="selectedResult = result"
              >
                <PlayerAvatar :image-url="result.imageUrl" :name="form.playerName" size="md" />
                <div>
                  <strong>{{ result.provider || result.source }}</strong>
                  <p class="text-muted">{{ result.attributionText || result.licenseInfo }}</p>
                  <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    @click.stop="applyProviderResult(result)"
                  >
                    {{ t('adminPlayerImages.useImage') }}
                  </button>
                </div>
              </div>
            </div>

            <div v-if="currentRecord" class="license-info">
              <h4>{{ t('adminPlayerImages.licenseInfo') }}</h4>
              <p><strong>{{ t('adminPlayerImages.source') }}:</strong> {{ currentRecord.source || '–' }}</p>
              <p><strong>{{ t('adminPlayerImages.sourceId') }}:</strong> {{ currentRecord.sourceId || '–' }}</p>
              <p><strong>{{ t('adminPlayerImages.license') }}:</strong> {{ currentRecord.licenseInfo || '–' }}</p>
              <p><strong>{{ t('adminPlayerImages.attribution') }}:</strong> {{ currentRecord.attributionText || '–' }}</p>
              <p><strong>{{ t('adminPlayerImages.lastChecked') }}:</strong> {{ formatDate(currentRecord.lastCheckedAt) }}</p>
            </div>

            <div v-if="currentRecord" class="form-group">
              <label>{{ t('adminPlayerImages.license') }}</label>
              <textarea v-model="form.licenseInfo" class="form-control" rows="2" />
            </div>
            <div v-if="currentRecord" class="form-group">
              <label>{{ t('adminPlayerImages.attribution') }}</label>
              <textarea v-model="form.attributionText" class="form-control" rows="2" />
            </div>
          </div>
          <div class="modal-footer">
            <button
              v-if="currentRecord?.imageUrl"
              type="button"
              class="btn btn-secondary"
              :disabled="busy"
              @click="removeImage"
            >
              {{ t('adminPlayerImages.removeImage') }}
            </button>
            <button
              v-if="currentRecord && !currentRecord.isManuallyApproved"
              type="button"
              class="btn btn-secondary"
              :disabled="busy"
              @click="approveImage"
            >
              {{ t('adminPlayerImages.approve') }}
            </button>
            <button type="button" class="btn btn-secondary" @click="closeModal">
              {{ t('common.cancel') }}
            </button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? t('common.saving') : t('common.save') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner.vue';
import AlertMessage from '../../components/AlertMessage.vue';
import PlayerAvatar from '../../components/PlayerAvatar.vue';
import { useFormatters } from '../../composables/useFormatters';

const { t } = useI18n();
const { formatDate } = useFormatters();

const records = ref([]);
const status = ref(null);
const loading = ref(true);
const searchQuery = ref('');
const showModal = ref(false);
const editingRecord = ref(null);
const saving = ref(false);
const busy = ref(false);
const searchBusy = ref(false);
const message = ref('');
const error = ref('');
const providerResults = ref([]);
const selectedResult = ref(null);
const selectedFile = ref(null);
const previewUrl = ref('');
const fileInput = ref(null);

const form = ref({
  playerName: '',
  teamName: '',
  countryCode: '',
  licenseInfo: '',
  attributionText: '',
});

const currentRecord = computed(() => editingRecord.value);

async function loadStatus() {
  try {
    const { data } = await api.get('/admin/player-images/status');
    status.value = data;
  } catch {
    status.value = { enabled: false };
  }
}

async function loadRecords() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/admin/player-images', {
      params: { search: searchQuery.value.trim() },
    });
    records.value = data.items || [];
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPlayerImages.loadFailed');
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.value = {
    playerName: '',
    teamName: '',
    countryCode: '',
    licenseInfo: '',
    attributionText: '',
  };
  providerResults.value = [];
  selectedResult.value = null;
  clearFileSelection();
}

function openCreate() {
  editingRecord.value = null;
  resetForm();
  showModal.value = true;
}

function openEdit(record) {
  editingRecord.value = { ...record };
  form.value = {
    playerName: record.playerName,
    teamName: record.teamName || '',
    countryCode: record.countryCode || '',
    licenseInfo: record.licenseInfo || '',
    attributionText: record.attributionText || '',
  };
  providerResults.value = [];
  selectedResult.value = null;
  clearFileSelection();
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  clearFileSelection();
}

function clearFileSelection() {
  selectedFile.value = null;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = '';
  if (fileInput.value) fileInput.value.value = '';
}

function onFileSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    error.value = t('adminPlayerImages.fileTooLarge');
    clearFileSelection();
    return;
  }
  selectedFile.value = file;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = URL.createObjectURL(file);
}

async function searchProviders() {
  searchBusy.value = true;
  error.value = '';
  try {
    const { data } = await api.post('/admin/player-images/search', {
      playerName: form.value.playerName,
      teamName: form.value.teamName,
      countryCode: form.value.countryCode,
    });
    providerResults.value = data.results || [];
    if (!providerResults.value.length) {
      message.value = t('adminPlayerImages.noProviderResults');
    }
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPlayerImages.searchFailed');
  } finally {
    searchBusy.value = false;
  }
}

async function ensureRecordId() {
  if (editingRecord.value?.id) return editingRecord.value.id;

  const { data } = await api.post('/admin/player-images', {
    playerName: form.value.playerName,
    teamName: form.value.teamName,
    countryCode: form.value.countryCode,
    licenseInfo: form.value.licenseInfo,
    attributionText: form.value.attributionText,
  });
  editingRecord.value = data;
  return data.id;
}

async function uploadImage(recordId) {
  if (!selectedFile.value) return;
  const formData = new FormData();
  formData.append('image', selectedFile.value);
  const { data } = await api.post(`/admin/player-images/${recordId}/image`, formData);
  editingRecord.value = data;
}

async function applyProviderResult(result) {
  busy.value = true;
  error.value = '';
  try {
    const recordId = await ensureRecordId();
    const { data } = await api.post(`/admin/player-images/${recordId}/apply`, result);
    editingRecord.value = data;
    form.value.licenseInfo = data.licenseInfo || '';
    form.value.attributionText = data.attributionText || '';
    message.value = t('adminPlayerImages.imageApplied');
    await loadRecords();
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPlayerImages.applyFailed');
  } finally {
    busy.value = false;
  }
}

async function approveImage() {
  if (!editingRecord.value?.id) return;
  busy.value = true;
  error.value = '';
  try {
    const { data } = await api.post(`/admin/player-images/${editingRecord.value.id}/approve`);
    editingRecord.value = data;
    message.value = t('adminPlayerImages.approved');
    await loadRecords();
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPlayerImages.approveFailed');
  } finally {
    busy.value = false;
  }
}

async function removeImage() {
  if (!editingRecord.value?.id) return;
  busy.value = true;
  error.value = '';
  try {
    const { data } = await api.delete(`/admin/player-images/${editingRecord.value.id}/image`);
    editingRecord.value = data;
    clearFileSelection();
    message.value = t('adminPlayerImages.imageRemoved');
    await loadRecords();
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPlayerImages.removeFailed');
  } finally {
    busy.value = false;
  }
}

async function handleSave() {
  saving.value = true;
  error.value = '';
  try {
    const recordId = await ensureRecordId();

    if (selectedFile.value) {
      await uploadImage(recordId);
    }

    if (form.value.licenseInfo || form.value.attributionText) {
      const { data } = await api.put(`/admin/player-images/${recordId}`, {
        licenseInfo: form.value.licenseInfo,
        attributionText: form.value.attributionText,
        playerName: form.value.playerName,
        teamName: form.value.teamName,
        countryCode: form.value.countryCode,
      });
      editingRecord.value = data;
    }

    message.value = t('adminPlayerImages.saved');
    showModal.value = false;
    clearFileSelection();
    await loadRecords();
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPlayerImages.saveFailed');
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await loadStatus();
  await loadRecords();
});
</script>

<style scoped>
.provider-status-list {
  margin: 0.5rem 0 0;
  padding-left: 1.25rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.provider-status-list li {
  margin: 0.15rem 0;
}

.player-image-search-bar {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.player-image-status {
  margin-top: 0.75rem;
  margin-bottom: 0;
  font-size: 0.85rem;
}

.player-image-editor {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
  margin: 1rem 0;
}

.player-image-editor-actions {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
}

.provider-results {
  margin-top: 1rem;
}

.provider-result-card {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  margin-bottom: 0.5rem;
  cursor: pointer;
}

.provider-result-card.selected,
.provider-result-card:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.license-info {
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
}

.license-info p {
  margin: 0.25rem 0;
}

.modal-lg {
  max-width: 720px;
}
</style>
