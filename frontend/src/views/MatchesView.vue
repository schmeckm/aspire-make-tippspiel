<template>
  <div>
    <div class="page-header page-header--with-actions">
      <h1>{{ t('matches.title') }}</h1>
      <div class="view-toggle" role="group" :aria-label="t('matches.viewMode')">
        <button
          type="button"
          :class="['btn btn-sm', viewMode === 'cards' ? 'btn-primary' : 'btn-secondary']"
          :aria-pressed="viewMode === 'cards'"
          @click="setViewMode('cards')"
        >
          {{ t('matches.viewCards') }}
        </button>
        <button
          type="button"
          :class="['btn btn-sm', viewMode === 'table' ? 'btn-primary' : 'btn-secondary']"
          :aria-pressed="viewMode === 'table'"
          @click="setViewMode('table')"
        >
          {{ t('matches.viewTable') }}
        </button>
      </div>
    </div>

    <div v-if="lockWarning" class="alert alert-warning lock-warning" role="status">
      {{ lockWarning }}
    </div>

    <div class="filter-bar">
      <button
        v-for="f in filters"
        :key="f.value"
        :class="['filter-btn', { active: activeFilter === f.value }]"
        :aria-pressed="activeFilter === f.value"
        @click="setFilter(f.value)"
      >
        {{ f.label }}
      </button>
    </div>

    <div class="group-filter-bar">
      <label class="group-filter-label" for="group-filter">{{ t('matches.group') }}</label>
      <select
        id="group-filter"
        v-model="activeGroup"
        class="form-control group-filter"
        @change="loadMatches"
      >
        <option value="">{{ t('matches.filters.allGroups') }}</option>
        <option v-for="g in availableGroups" :key="g" :value="g">{{ t('matches.group') }} {{ g }}</option>
      </select>
    </div>

    <LoadingSpinner v-if="loading" />
    <AlertMessage v-else-if="error" :message="error" type="error" inline />

    <template v-else>
      <div v-if="viewMode === 'cards'">
        <MatchCard
          v-for="match in matches"
          :key="match.id"
          :match="match"
          @saved="loadMatches"
        />
        <div v-if="matches.length === 0" class="empty-state">
          <div class="empty-icon">⚽</div>
          <p>{{ t('matches.empty') }}</p>
        </div>
      </div>
      <div v-else class="card">
        <div class="card-body">
          <MatchTable :matches="matches" show-prediction @saved="loadMatches" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import { onSocketEvent } from '../services/socket';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import MatchCard from '../components/MatchCard.vue';
import MatchTable from '../components/MatchTable.vue';
import AlertMessage from '../components/AlertMessage.vue';

const { t } = useI18n();
const VIEW_MODE_KEY = 'matches-view-mode';

const filters = computed(() => [
  { value: '', label: t('matches.filters.all') },
  { value: 'open', label: t('matches.filters.open') },
  { value: 'finished', label: t('matches.filters.finished') },
  { value: 'missing', label: t('matches.filters.missing') },
  { value: 'group', label: t('matches.filters.group') },
  { value: 'knockout', label: t('matches.filters.knockout') },
]);

const DEFAULT_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const LOCK_WARNING_MS = 15 * 60 * 1000;

const activeFilter = ref('');
const activeGroup = ref('');
const groups = ref([]);
const availableGroups = computed(() => (groups.value.length ? groups.value : DEFAULT_GROUPS));
const matches = ref([]);
const loading = ref(true);
const error = ref('');
const viewMode = ref(localStorage.getItem(VIEW_MODE_KEY) || 'cards');
const now = ref(Date.now());
let unsub = null;
let lockTimer = null;

const lockWarning = computed(() => {
  const urgent = matches.value.filter((match) => {
    if (!match.canPredict) return false;
    const kickoff = new Date(match.kickoffTime).getTime();
    const remaining = kickoff - now.value;
    return remaining > 0 && remaining <= LOCK_WARNING_MS;
  });

  if (urgent.length === 0) return '';

  const missing = urgent.filter((m) => !m.hasPrediction);
  if (missing.length > 0) {
    return t('matches.lockWarningMissing', { count: missing.length });
  }
  return t('matches.lockWarningSoon', { count: urgent.length });
});

function setViewMode(mode) {
  viewMode.value = mode;
  localStorage.setItem(VIEW_MODE_KEY, mode);
}

function updateMatch(updated) {
  const idx = matches.value.findIndex((m) => m.id === updated.id);
  if (idx >= 0) {
    const existing = matches.value[idx];
    matches.value[idx] = { ...existing, ...updated, prediction: existing.prediction };
  }
}

async function loadGroups() {
  try {
    const { data } = await api.get('/matches/groups');
    groups.value = data;
  } catch {
    groups.value = [];
  }
}

async function loadMatches() {
  loading.value = true;
  error.value = '';
  try {
    const params = {};
    if (activeFilter.value) params.filter = activeFilter.value;
    if (activeGroup.value) params.groupName = activeGroup.value;
    const { data } = await api.get('/matches', { params });
    matches.value = data;
  } catch (err) {
    error.value = err.response?.data?.error || t('matches.loadFailed');
  } finally {
    loading.value = false;
  }
}

function setFilter(value) {
  activeFilter.value = value;
  loadMatches();
}

onMounted(async () => {
  lockTimer = setInterval(() => {
    now.value = Date.now();
  }, 1000);

  await loadGroups();
  await loadMatches();
  unsub = onSocketEvent('match:update', updateMatch);
});

onUnmounted(() => {
  unsub?.();
  if (lockTimer) clearInterval(lockTimer);
});
</script>

<style scoped>
.page-header--with-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.view-toggle {
  display: flex;
  gap: 0.5rem;
}

.lock-warning {
  margin-bottom: 1rem;
}

.group-filter-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.group-filter-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.group-filter {
  width: auto;
  min-width: 11rem;
  max-width: 14rem;
}
</style>
