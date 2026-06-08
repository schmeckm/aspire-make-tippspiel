<template>
  <div>
    <div class="page-header">
      <h1>{{ t('adminPages.prizes.title') }}</h1>
      <p class="text-muted">{{ t('adminPages.prizes.subtitle') }}</p>
    </div>

    <AlertMessage v-if="message" :message="message" type="success" />
    <ErrorState v-if="loadError" :message="loadError" @retry="loadPrizes" />
    <AlertMessage v-else-if="error" :message="error" type="error" />

    <LoadingSpinner v-if="loading" />

    <div v-else class="card" style="max-width: 720px;">
      <div class="card-body">
        <form @submit.prevent="handleSave">
          <label class="checkbox-label mb-2">
            <input v-model="form.prizesEnabled" type="checkbox" />
            {{ t('adminPages.prizes.enabled') }}
          </label>
          <p class="text-muted hint">{{ t('adminPages.prizes.enabledHint') }}</p>

          <div v-for="prize in form.prizes" :key="prize.rank" class="prize-form-block">
            <h3>{{ t('adminPages.prizes.place', { rank: prize.rank }) }}</h3>

            <div class="form-group">
              <label>{{ t('adminPages.prizes.fields.image') }}</label>
              <div class="prize-image-editor">
                <div v-if="getPreviewUrl(prize.rank) || prize.imageUrl" class="prize-image-preview">
                  <img
                    :src="getPreviewUrl(prize.rank) || prize.imageUrl"
                    :alt="prize.title || t('adminPages.prizes.place', { rank: prize.rank })"
                  />
                </div>
                <div class="prize-image-actions">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    class="form-control"
                    :disabled="isImageBusy(prize.rank)"
                    @change="onFileSelected($event, prize.rank)"
                  />
                  <p class="text-muted upload-hint">{{ t('adminPages.prizes.uploadHint') }}</p>
                  <button
                    v-if="prize.imageUrl && !getPreviewUrl(prize.rank)"
                    type="button"
                    class="btn btn-secondary btn-sm"
                    :disabled="isImageBusy(prize.rank)"
                    @click="removeImage(prize.rank)"
                  >
                    {{ t('adminPages.prizes.removeImage') }}
                  </button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>{{ t('adminPages.prizes.fields.title') }}</label>
              <input v-model="prize.title" type="text" class="form-control" maxlength="100" />
            </div>
            <div class="form-group">
              <label>{{ t('adminPages.prizes.fields.value') }}</label>
              <input v-model="prize.value" type="text" class="form-control" maxlength="100" :placeholder="t('adminPages.prizes.valuePlaceholder')" />
            </div>
            <div class="form-group">
              <label>{{ t('adminPages.prizes.fields.description') }}</label>
              <textarea v-model="prize.description" class="form-control" rows="3" maxlength="500" />
            </div>
          </div>

          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? t('common.saving') : t('adminPages.prizes.save') }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner.vue';
import AlertMessage from '../../components/AlertMessage.vue';
import ErrorState from '../../components/ErrorState.vue';
import { useAppSettingsStore } from '../../stores/appSettingsStore';

const { t } = useI18n();
const appSettings = useAppSettingsStore();

const loading = ref(true);
const saving = ref(false);
const message = ref('');
const loadError = ref('');
const error = ref('');
const imageBusyRanks = ref(new Set());
const previewUrls = ref({});

const form = ref({
  prizesEnabled: false,
  prizes: [
    { rank: 1, title: '', description: '', value: '', imageUrl: '' },
    { rank: 2, title: '', description: '', value: '', imageUrl: '' },
    { rank: 3, title: '', description: '', value: '', imageUrl: '' },
  ],
});

function isImageBusy(rank) {
  return imageBusyRanks.value.has(rank);
}

function setImageBusy(rank, busy) {
  const next = new Set(imageBusyRanks.value);
  if (busy) next.add(rank);
  else next.delete(rank);
  imageBusyRanks.value = next;
}

function getPreviewUrl(rank) {
  return previewUrls.value[rank] || '';
}

function clearPreview(rank) {
  const url = previewUrls.value[rank];
  if (url) URL.revokeObjectURL(url);
  const next = { ...previewUrls.value };
  delete next[rank];
  previewUrls.value = next;
}

function applyFormFromSettings(data) {
  form.value.prizesEnabled = !!data.prizesEnabled;
  const prizes = Array.isArray(data.prizes) ? data.prizes : [];
  form.value.prizes = [1, 2, 3].map((rank) => {
    const entry = prizes.find((p) => Number(p.rank) === rank) || {};
    return {
      rank,
      title: entry.title || '',
      description: entry.description || '',
      value: entry.value || '',
      imageUrl: entry.imageUrl || '',
    };
  });
}

async function loadPrizes() {
  loading.value = true;
  loadError.value = '';
  try {
    const { data } = await api.get('/settings');
    applyFormFromSettings(data);
  } catch (err) {
    loadError.value = err.response?.data?.error || t('adminPages.prizes.loadFailed');
  } finally {
    loading.value = false;
  }
}

onMounted(loadPrizes);

onUnmounted(() => {
  Object.keys(previewUrls.value).forEach((rank) => clearPreview(Number(rank)));
});

async function onFileSelected(event, rank) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    error.value = t('adminPages.prizes.fileTooLarge');
    return;
  }

  clearPreview(rank);
  previewUrls.value = {
    ...previewUrls.value,
    [rank]: URL.createObjectURL(file),
  };

  setImageBusy(rank, true);
  error.value = '';
  message.value = '';

  try {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post(`/admin/prizes/${rank}/image`, formData);
    applyFormFromSettings(data);
    appSettings.applySettings(data);
    clearPreview(rank);
    message.value = t('adminPages.prizes.imageUploaded');
  } catch (err) {
    clearPreview(rank);
    error.value = err.response?.data?.error || t('adminPages.prizes.imageUploadFailed');
  } finally {
    setImageBusy(rank, false);
  }
}

async function removeImage(rank) {
  setImageBusy(rank, true);
  error.value = '';
  message.value = '';

  try {
    const { data } = await api.delete(`/admin/prizes/${rank}/image`);
    applyFormFromSettings(data);
    appSettings.applySettings(data);
    message.value = t('adminPages.prizes.imageRemoved');
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.prizes.imageRemoveFailed');
  } finally {
    setImageBusy(rank, false);
  }
}

async function handleSave() {
  saving.value = true;
  error.value = '';
  message.value = '';
  try {
    const { data } = await api.put('/admin/settings', {
      prizesEnabled: form.value.prizesEnabled,
      prizes: form.value.prizes,
    });
    applyFormFromSettings(data);
    appSettings.applySettings(data);
    message.value = t('adminPages.prizes.saved');
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.prizes.saveFailed');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 600;
}

.mb-2 {
  margin-bottom: 0.75rem;
}

.hint,
.upload-hint {
  margin: 0.35rem 0 0;
  font-size: 0.875rem;
}

.hint {
  margin-bottom: 1.5rem;
}

.prize-form-block {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.prize-form-block:last-of-type {
  border-bottom: none;
  margin-bottom: 1rem;
}

.prize-form-block h3 {
  margin: 0 0 1rem;
  font-size: 1rem;
}

.prize-image-editor {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

.prize-image-preview {
  width: 120px;
  height: 120px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  flex-shrink: 0;
}

.prize-image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.prize-image-actions {
  flex: 1;
  min-width: 200px;
}
</style>
