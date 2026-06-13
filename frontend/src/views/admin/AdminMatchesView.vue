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
              <div class="form-row">
                <div class="form-group" style="flex: 1;">
                  <label>{{ t('adminPages.matches.form.highlightsUrl') }}</label>
                  <input v-model="form.highlightsUrl" type="url" class="form-control" placeholder="https://www.youtube.com/watch?v=…" />
                </div>
                <div class="form-group" style="align-self: end;">
                  <button type="button" class="btn btn-secondary btn-sm" @click="openYoutubeSearch">
                    {{ t('adminPages.matches.form.searchYoutube') }}
                  </button>
                </div>
                <div class="form-group" style="align-self: end;">
                  <button type="button" class="btn btn-secondary btn-sm" :disabled="loadingSuggestions" @click="loadYoutubeSuggestions">
                    {{ loadingSuggestions ? t('common.loading') : t('adminPages.matches.form.suggestYoutube') }}
                  </button>
                </div>
              </div>
              <div v-if="suggestError" class="text-muted" style="margin-top: 0.5rem;">
                {{ suggestError }}
              </div>
              <div v-else-if="youtubeSuggestions.length > 0" class="card" style="margin-top: 0.5rem;">
                <div class="card-body" style="padding: 0.75rem;">
                  <div class="text-muted" style="margin-bottom: 0.5rem;">{{ t('adminPages.matches.form.suggestionsTitle') }}</div>
                  <div v-for="s in youtubeSuggestions" :key="s.videoId" style="display:flex; gap:0.75rem; align-items:center; margin-bottom:0.5rem;">
                    <img v-if="s.thumbnailUrl" :src="s.thumbnailUrl" alt="" style="width: 72px; height: 40px; object-fit: cover; border-radius: 6px; border: 1px solid var(--color-border);" />
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-weight: 600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ s.title }}</div>
                      <div class="text-muted" style="font-size: 0.85rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        {{ s.channelTitle }}<span v-if="s.viewCount"> · {{ formatViews(s.viewCount) }}</span>
                      </div>
                    </div>
                    <button type="button" class="btn btn-primary btn-sm" @click="useSuggestion(s)">
                      {{ t('adminPages.matches.form.useSuggestion') }}
                    </button>
                  </div>
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
const youtubeSuggestions = ref([]);
const loadingSuggestions = ref(false);
const suggestError = ref('');

const form = ref({
  matchNumber: 1,
  stage: 'Group Stage',
  groupName: '',
  homeTeam: '',
  awayTeam: '',
  kickoffTime: '',
  stadium: '',
  city: '',
  highlightsUrl: '',
});

function closeModal() {
  showModal.value = false;
  youtubeSuggestions.value = [];
  suggestError.value = '';
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
  youtubeSuggestions.value = [];
  suggestError.value = '';
  form.value = {
    matchNumber: matches.value.length + 1,
    stage: 'Group Stage',
    groupName: '',
    homeTeam: '',
    awayTeam: '',
    kickoffTime: '',
    stadium: '',
    city: '',
    highlightsUrl: '',
  };
  showModal.value = true;
}

function openEdit(match) {
  editingMatch.value = match;
  youtubeSuggestions.value = [];
  suggestError.value = '';
  form.value = {
    matchNumber: match.matchNumber,
    stage: match.stage,
    groupName: match.groupName || '',
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    kickoffTime: toLocalDatetime(match.kickoffTime),
    stadium: match.stadium || '',
    city: match.city || '',
    highlightsUrl: match.highlightsUrl || '',
  };
  showModal.value = true;
}

function openYoutubeSearch() {
  const home = String(form.value.homeTeam || '').trim();
  const away = String(form.value.awayTeam || '').trim();
  const date = form.value.kickoffTime ? form.value.kickoffTime.slice(0, 10) : '';
  const query = [home, away, date, 'highlights'].filter(Boolean).join(' ');
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function formatViews(n) {
  if (!Number.isFinite(n)) return '';
  if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M views`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K views`;
  if (n >= 1000) return `${Math.round(n / 100) / 10}K views`;
  return `${n} views`;
}

function useSuggestion(s) {
  if (!s?.url) return;
  form.value.highlightsUrl = s.url;
}

async function loadYoutubeSuggestions() {
  if (!editingMatch.value?.id) {
    suggestError.value = t('adminPages.matches.form.suggestionsNeedSavedMatch');
    return;
  }
  loadingSuggestions.value = true;
  suggestError.value = '';
  youtubeSuggestions.value = [];
  try {
    const { data } = await api.get(`/matches/${editingMatch.value.id}/highlight-suggestions`);
    youtubeSuggestions.value = Array.isArray(data?.items) ? data.items : [];
    if (youtubeSuggestions.value.length === 0) {
      suggestError.value = t('adminPages.matches.form.suggestionsEmpty');
    }
  } catch (err) {
    suggestError.value = err.response?.data?.error || t('adminPages.matches.form.suggestionsFailed');
  } finally {
    loadingSuggestions.value = false;
  }
}

async function handleSave() {
  saving.value = true;
  error.value = '';
  try {
    const payload = {
      ...form.value,
      kickoffTime: new Date(form.value.kickoffTime).toISOString(),
      groupName: form.value.groupName || null,
      highlightsUrl: form.value.highlightsUrl || null,
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
