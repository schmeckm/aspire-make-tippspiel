<template>
  <div class="admin-predictions">
    <div class="page-header">
      <div>
        <h1>{{ t('adminPages.predictions.title') }}</h1>
        <p v-if="!loading" class="page-subtitle">{{ t('adminPages.predictions.count', { count: predictions.length }) }}</p>
      </div>
    </div>

    <AlertMessage v-if="message" :message="message" type="success" />
    <AlertMessage v-if="error" :message="error" type="error" />

    <div v-if="!loading" class="filter-bar">
      <input
        v-model="search"
        type="search"
        class="form-control admin-predictions-search"
        :placeholder="t('adminPages.predictions.searchPlaceholder')"
      />
    </div>

    <LoadingSpinner v-if="loading" />

    <div v-else class="card">
      <div class="card-body card-body-table">
        <div class="table-wrapper">
          <table class="admin-predictions-table">
            <thead>
              <tr>
                <th>{{ t('adminPages.predictions.columns.user') }}</th>
                <th>{{ t('adminPages.predictions.columns.team') }}</th>
                <th>{{ t('adminPages.predictions.columns.match') }}</th>
                <th class="text-center">{{ t('adminPages.predictions.columns.tip') }}</th>
                <th class="text-center">{{ t('adminPages.predictions.columns.result') }}</th>
                <th class="text-center">{{ t('adminPages.predictions.columns.points') }}</th>
                <th>{{ t('adminPages.predictions.columns.submitted') }}</th>
                <th>{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pred in filteredPredictions" :key="pred.id">
                <td>
                  <div class="admin-predictions-user">
                    <UserAvatar
                      :image-url="pred.user?.imageUrl"
                      :first-name="pred.user?.firstName"
                      :last-name="pred.user?.lastName"
                      size="sm"
                    />
                    <span class="admin-predictions-user-name">
                      {{ pred.user?.firstName }} {{ pred.user?.lastName }}
                    </span>
                  </div>
                </td>
                <td>
                  <span v-if="pred.user?.team?.name" class="badge badge-info">{{ pred.user.team.name }}</span>
                  <span v-else class="text-muted">{{ t('common.noTeam') }}</span>
                </td>
                <td>
                  <div class="admin-predictions-match">
                    <span class="match-ref">#{{ pred.match?.matchNumber }}</span>
                    <div class="admin-predictions-teams">
                      <TeamFlag :name="pred.match?.homeTeam" inline hide-name />
                      <span class="admin-predictions-vs">{{ t('common.vs') }}</span>
                      <TeamFlag :name="pred.match?.awayTeam" inline hide-name />
                    </div>
                    <span class="admin-predictions-match-label">
                      {{ pred.match?.homeTeam }} {{ t('common.vs') }} {{ pred.match?.awayTeam }}
                    </span>
                    <span :class="['badge', `badge-${pred.match?.status}`]">
                      {{ statusLabel(pred.match?.status) }}
                    </span>
                  </div>
                </td>
                <td class="text-center">
                  <span class="admin-score-pill admin-score-pill-tip">
                    {{ pred.predictedHomeScore }}<span class="admin-score-sep">:</span>{{ pred.predictedAwayScore }}
                  </span>
                </td>
                <td class="text-center">
                  <span
                    v-if="pred.match?.status === 'finished'"
                    class="admin-score-pill admin-score-pill-result"
                  >
                    {{ pred.match.homeScore }}<span class="admin-score-sep">:</span>{{ pred.match.awayScore }}
                  </span>
                  <span v-else class="text-muted">–</span>
                </td>
                <td class="text-center">
                  <span v-if="pred.points !== null && pred.points !== undefined" class="badge badge-success">
                    {{ formatPoints(pred.points) }}
                  </span>
                  <span v-else class="text-muted">–</span>
                </td>
                <td class="admin-predictions-date">{{ formatDateTime(pred.submittedAt) }}</td>
                <td>
                  <div class="btn-group">
                    <button class="btn btn-secondary btn-sm" @click="openEdit(pred)">
                      {{ t('common.edit') }}
                    </button>
                    <button class="btn btn-danger btn-sm" :disabled="saving" @click="handleDelete(pred)">
                      {{ t('common.delete') }}
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredPredictions.length === 0">
                <td colspan="8" class="text-center text-muted admin-predictions-empty">
                  {{ search ? t('adminPages.predictions.emptyFiltered') : t('adminPages.predictions.empty') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal admin-predictions-modal">
        <div class="modal-header">
          <h3>{{ t('adminPages.predictions.editTitle') }}</h3>
          <button class="modal-close" type="button" @click="closeModal">&times;</button>
        </div>
        <form @submit.prevent="handleSave">
          <div class="modal-body">
            <div v-if="editingPred" class="admin-predictions-modal-context">
              <div class="admin-predictions-modal-user">
                <UserAvatar
                  :image-url="editingPred.user?.imageUrl"
                  :first-name="editingPred.user?.firstName"
                  :last-name="editingPred.user?.lastName"
                  size="md"
                />
                <div>
                  <strong>{{ editingPred.user?.firstName }} {{ editingPred.user?.lastName }}</strong>
                  <div v-if="editingPred.user?.team?.name" class="text-muted">
                    {{ editingPred.user.team.name }}
                  </div>
                </div>
              </div>

              <div class="admin-predictions-modal-match">
                <span class="match-ref">#{{ editingPred.match?.matchNumber }}</span>
                <div class="admin-predictions-modal-teams">
                  <TeamFlag :name="editingPred.match?.homeTeam" />
                  <span class="admin-predictions-vs">{{ t('common.vs') }}</span>
                  <TeamFlag :name="editingPred.match?.awayTeam" />
                </div>
                <span :class="['badge', `badge-${editingPred.match?.status}`]">
                  {{ statusLabel(editingPred.match?.status) }}
                </span>
              </div>
            </div>

            <p class="admin-predictions-modal-hint">{{ t('adminPages.predictions.editHint') }}</p>

            <div class="admin-predictions-modal-scores">
              <div class="admin-predictions-score-field">
                <label for="admin-pred-home">{{ editingPred?.match?.homeTeam }}</label>
                <input
                  id="admin-pred-home"
                  v-model.number="editForm.homeScore"
                  type="number"
                  min="0"
                  max="20"
                  required
                  class="form-control admin-predictions-score-input"
                />
              </div>
              <span class="prediction-separator">:</span>
              <div class="admin-predictions-score-field">
                <label for="admin-pred-away">{{ editingPred?.match?.awayTeam }}</label>
                <input
                  id="admin-pred-away"
                  v-model.number="editForm.awayScore"
                  type="number"
                  min="0"
                  max="20"
                  required
                  class="form-control admin-predictions-score-input"
                />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" :disabled="saving" @click="closeModal">
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
import { useFormatters } from '../../composables/useFormatters';
import LoadingSpinner from '../../components/LoadingSpinner.vue';
import AlertMessage from '../../components/AlertMessage.vue';
import UserAvatar from '../../components/UserAvatar.vue';
import TeamFlag from '../../components/TeamFlag.vue';

const { t } = useI18n();
const { formatDateTime, formatPoints } = useFormatters();

const predictions = ref([]);
const loading = ref(true);
const saving = ref(false);
const search = ref('');
const showModal = ref(false);
const editingPred = ref(null);
const editForm = ref({ homeScore: 0, awayScore: 0 });
const message = ref('');
const error = ref('');

const filteredPredictions = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return predictions.value;

  return predictions.value.filter((pred) => {
    const user = `${pred.user?.firstName || ''} ${pred.user?.lastName || ''}`.toLowerCase();
    const team = (pred.user?.team?.name || '').toLowerCase();
    const match = `${pred.match?.homeTeam || ''} ${pred.match?.awayTeam || ''} #${pred.match?.matchNumber || ''}`.toLowerCase();
    return user.includes(q) || team.includes(q) || match.includes(q);
  });
});

function statusLabel(status) {
  return t(`matchStatus.${status}`, status);
}

async function loadPredictions() {
  loading.value = true;
  try {
    const { data } = await api.get('/admin/predictions');
    predictions.value = data;
  } finally {
    loading.value = false;
  }
}

function openEdit(pred) {
  editingPred.value = pred;
  editForm.value = {
    homeScore: pred.predictedHomeScore,
    awayScore: pred.predictedAwayScore,
  };
  message.value = '';
  error.value = '';
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  editingPred.value = null;
}

async function handleSave() {
  if (!editingPred.value) return;

  saving.value = true;
  message.value = '';
  error.value = '';
  try {
    await api.put(`/predictions/${editingPred.value.id}`, {
      predictedHomeScore: editForm.value.homeScore,
      predictedAwayScore: editForm.value.awayScore,
    });
    closeModal();
    message.value = t('adminPages.predictions.saved');
    await loadPredictions();
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.predictions.saveFailed');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(pred) {
  if (!confirm(t('adminPages.predictions.deleteConfirm'))) return;

  message.value = '';
  error.value = '';
  try {
    await api.delete(`/predictions/${pred.id}`);
    if (editingPred.value?.id === pred.id) {
      closeModal();
    }
    await loadPredictions();
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.predictions.deleteFailed');
  }
}

onMounted(loadPredictions);
</script>

<style scoped>
.page-subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.admin-predictions-search {
  flex: 1;
  min-width: 220px;
  max-width: 420px;
}

.card-body-table {
  padding: 0;
}

.admin-predictions-table th {
  white-space: nowrap;
}

.admin-predictions-user {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 10rem;
}

.admin-predictions-user-name {
  font-weight: 600;
}

.admin-predictions-match {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
  min-width: 11rem;
}

.admin-predictions-teams {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.admin-predictions-match-label {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.admin-predictions-vs {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

.admin-score-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 3.25rem;
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  font-size: 0.9375rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.admin-score-pill-tip {
  background: var(--sapInformationBackground);
  color: var(--sapInformationColor);
}

.admin-score-pill-result {
  background: var(--sapSuccessBackground);
  color: var(--sapSuccessColor);
}

.admin-score-sep {
  margin: 0 0.15rem;
  opacity: 0.7;
}

.admin-predictions-date {
  white-space: nowrap;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.admin-predictions-empty {
  padding: 2.5rem 1rem;
}

.admin-predictions-modal {
  max-width: 480px;
}

.admin-predictions-modal-context {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  margin-bottom: 1rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.admin-predictions-modal-user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.admin-predictions-modal-match {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
}

.admin-predictions-modal-teams {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.admin-predictions-modal-hint {
  margin: 0 0 1.25rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.admin-predictions-modal-scores {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.75rem;
}

.admin-predictions-score-field {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.admin-predictions-score-field label {
  font-size: 0.8125rem;
  font-weight: 600;
  text-align: center;
  color: var(--color-text-muted);
}

.admin-predictions-score-input {
  width: 100%;
  max-width: 5.5rem;
  text-align: center;
  font-size: 1.5rem;
  font-weight: 800;
  padding: 0.625rem;
}

@media (max-width: 900px) {
  .admin-predictions-table th:nth-child(2),
  .admin-predictions-table td:nth-child(2) {
    display: none;
  }
}
</style>
