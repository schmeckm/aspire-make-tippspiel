<template>
  <div :class="['tip-copilot', { 'tip-copilot--compact': compact }]">
    <div v-if="!compact" class="tip-copilot-toolbar">
      <div class="tip-copilot-filters">
        <button
          type="button"
          :class="['filter-btn', { active: filter === 'today' }]"
          @click="filter = 'today'"
        >
          {{ t('tipCopilot.filters.today') }}
        </button>
        <button
          type="button"
          :class="['filter-btn', { active: filter === 'tomorrow' }]"
          @click="filter = 'tomorrow'"
        >
          {{ t('tipCopilot.filters.tomorrow') }}
        </button>
        <button
          type="button"
          :class="['filter-btn', { active: filter === 'open' }]"
          @click="filter = 'open'"
        >
          {{ t('tipCopilot.filters.open') }}
        </button>
        <button
          type="button"
          :class="['filter-btn', { active: missingOnly }]"
          @click="missingOnly = !missingOnly"
        >
          {{ t('tipCopilot.filters.missingOnly') }}
        </button>
        <button
          type="button"
          :class="['filter-btn', { active: myTeamFirst }]"
          @click="toggleMyTeamFirst"
        >
          {{ t('tipCopilot.filters.myTeamFirst') }}
        </button>
        <button
          type="button"
          :class="['filter-btn', { active: mode === 'list' }]"
          @click="mode = 'list'"
        >
          {{ t('tipCopilot.modeList') }}
        </button>
        <button
          type="button"
          :class="['filter-btn', { active: mode === 'wizard' }]"
          @click="switchToWizard"
        >
          {{ t('tipCopilot.modeWizard') }}
        </button>
      </div>

      <button type="button" class="btn btn-secondary btn-sm" :disabled="loading" @click="loadMatches">
        {{ t('tipCopilot.refresh') }}
      </button>
    </div>

    <LoadingSpinner v-if="loading" />
    <ErrorState v-else-if="loadError" :message="loadError" @retry="loadMatches" />

    <template v-else>
      <p v-if="!compact" class="tip-copilot-summary text-muted">
        {{ t('tipCopilot.summary', { count: visibleMatches.length }) }}
      </p>

      <div v-if="!compact" class="tip-copilot-bulk card mb-2">
        <div class="card-body">
          <div class="tip-copilot-bulk-header">
            <strong>{{ t('tipCopilot.bulk.title') }}</strong>
            <span class="text-muted">{{ t('tipCopilot.bulk.hint') }}</span>
          </div>
          <form class="tip-copilot-bulk-row" @submit.prevent="applyBulk">
            <textarea
              v-model="bulkInput"
              class="form-control tip-copilot-bulk-textarea"
              rows="3"
              :placeholder="t('tipCopilot.bulk.placeholder')"
              :disabled="bulkSaving"
            />
            <button type="submit" class="btn btn-primary" :disabled="bulkSaving || !bulkInput.trim()">
              {{ bulkSaving ? t('common.saving') : t('tipCopilot.bulk.apply') }}
            </button>
          </form>
          <p v-if="bulkError" class="text-muted tip-copilot-bulk-error">{{ bulkError }}</p>
        </div>
      </div>

      <EmptyState
        v-if="visibleMatches.length === 0"
        icon="⚡"
        :message="emptyMessage"
      />

      <div v-else-if="mode === 'wizard' && !compact" class="tip-copilot-wizard card">
        <div class="card-body">
          <div class="wizard-progress">
            {{ t('tipCopilot.wizardProgress', { current: wizardIndex + 1, total: visibleMatches.length }) }}
          </div>

          <div v-if="currentWizardMatch" class="wizard-match">
            <span class="match-ref">#{{ currentWizardMatch.matchNumber }}</span>
            <div class="wizard-teams">
              <TeamFlag :name="currentWizardMatch.homeTeam" inline />
              <span class="wizard-vs">{{ t('common.vs') }}</span>
              <TeamFlag :name="currentWizardMatch.awayTeam" inline />
            </div>
            <div class="wizard-kickoff text-muted">
              <span>{{ formatTime(currentWizardMatch.kickoffTime) }}</span>
              <CountdownBadge :kickoff-time="currentWizardMatch.kickoffTime" :show-expired="false" />
            </div>

            <div v-if="currentWizardMatch.prediction" class="tip-copilot-existing text-muted">
              {{ t('tipCopilot.currentTip', { score: `${currentWizardMatch.prediction.predictedHomeScore}:${currentWizardMatch.prediction.predictedAwayScore}` }) }}
            </div>

            <form class="wizard-input-row" @submit.prevent="saveWizard">
              <input
                ref="wizardInputRef"
                v-model="wizardInput"
                type="text"
                inputmode="numeric"
                class="form-control wizard-score-input"
                :placeholder="t('tipCopilot.scorePlaceholder')"
                :disabled="savingId === currentWizardMatch.id"
                autocomplete="off"
                @keydown.enter.prevent="saveWizard"
              />
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="savingId === currentWizardMatch.id || !wizardInput.trim()"
              >
                {{ savingId === currentWizardMatch.id ? t('common.saving') : t('common.save') }}
              </button>
            </form>
          </div>
        </div>
      </div>

      <ul v-else class="tip-copilot-list">
        <li
          v-for="match in visibleMatchesLimited"
          :key="match.id"
          :class="['tip-copilot-item', { 'tip-copilot-item--saved': recentlySaved.has(match.id) }]"
        >
          <div class="tip-copilot-meta">
            <span class="match-ref">#{{ match.matchNumber }}</span>
            <span class="tip-copilot-kickoff-wrap">
              <span class="tip-copilot-kickoff">{{ formatTime(match.kickoffTime) }}</span>
              <CountdownBadge :kickoff-time="match.kickoffTime" :show-expired="false" />
            </span>
          </div>

          <div class="tip-copilot-teams">
            <TeamFlag :name="match.homeTeam" inline />
            <span>{{ t('common.vs') }}</span>
            <TeamFlag :name="match.awayTeam" inline />
          </div>

          <div v-if="match.prediction" class="tip-copilot-existing text-muted">
            {{ t('tipCopilot.currentTip', { score: `${match.prediction.predictedHomeScore}:${match.prediction.predictedAwayScore}` }) }}
          </div>

          <div v-if="isLockSoon(match)" class="tip-copilot-lock-warning">
            <span class="badge badge-warning">{{ t('tipCopilot.lockSoon') }}</span>
          </div>

          <form class="tip-copilot-input-row" @submit.prevent="saveListMatch(match)">
            <input
              :ref="(el) => setInputRef(match.id, el)"
              v-model="inputs[match.id]"
              type="text"
              inputmode="numeric"
              class="form-control tip-copilot-score-input"
              :placeholder="t('tipCopilot.scorePlaceholder')"
              :disabled="savingId === match.id"
              autocomplete="off"
              @keydown.enter.prevent="saveListMatch(match)"
            />
            <button
              type="submit"
              class="btn btn-primary btn-sm"
              :disabled="savingId === match.id || !inputs[match.id]?.trim()"
            >
              {{ savingId === match.id ? t('common.saving') : t('common.save') }}
            </button>
          </form>
        </li>
      </ul>

      <div v-if="compact && visibleMatches.length > visibleMatchesLimited.length" class="tip-copilot-more">
        <router-link to="/tip-copilot" class="btn btn-secondary btn-sm">
          {{ t('tipCopilot.showAll', { count: visibleMatches.length }) }}
        </router-link>
      </div>
    </template>
  </div>
</template>

<script setup>
import {
  computed, nextTick, onMounted, reactive, ref, watch,
} from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import { parseScoreInput } from '../utils/parseScoreInput';
import { useFormatters } from '../composables/useFormatters';
import { useToast } from '../composables/useToast';
import LoadingSpinner from './LoadingSpinner.vue';
import ErrorState from './ErrorState.vue';
import EmptyState from './EmptyState.vue';
import TeamFlag from './TeamFlag.vue';
import CountdownBadge from './CountdownBadge.vue';
import { useAuthStore } from '../stores/authStore';
import { useFootballTeamStore } from '../stores/footballTeamStore';

const props = defineProps({
  compact: { type: Boolean, default: false },
  compactLimit: { type: Number, default: 3 },
});

const { t } = useI18n();
const { formatTime } = useFormatters();
const toast = useToast();
const authStore = useAuthStore();
const footballTeamStore = useFootballTeamStore();

const loading = ref(true);
const loadError = ref('');
const savingId = ref(null);
const missingOnly = ref(false);
const myTeamFirst = ref(false);
const recentlySaved = ref(new Set());

const bulkInput = ref('');
const bulkSaving = ref(false);
const bulkError = ref('');

const mode = ref('list'); // list | wizard
const filter = ref('open'); // today | tomorrow | open

const matches = ref([]);
const inputs = reactive({});
const inputRefs = ref({});

const wizardIndex = ref(0);
const wizardInput = ref('');
const wizardInputRef = ref(null);

function getDateStringInTimezone(date, timezone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date);
}

const timezone = import.meta.env.VITE_DEFAULT_TIMEZONE || 'Europe/Zurich';

const openMatches = computed(() => matches.value.filter((m) => m.canPredict));
const todayStr = computed(() => getDateStringInTimezone(new Date(), timezone));
const tomorrowStr = computed(() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return getDateStringInTimezone(d, timezone);
});

const todayMatches = computed(() =>
  openMatches.value.filter((m) => getDateStringInTimezone(new Date(m.kickoffTime), timezone) === todayStr.value),
);

const tomorrowMatches = computed(() =>
  openMatches.value.filter((m) => getDateStringInTimezone(new Date(m.kickoffTime), timezone) === tomorrowStr.value),
);

const visibleMatches = computed(() => {
  if (filter.value === 'today') return todayMatches.value;
  if (filter.value === 'tomorrow') return tomorrowMatches.value;
  return openMatches.value;
});

const visibleMatchesFiltered = computed(() => {
  if (!missingOnly.value) return visibleMatches.value;
  return visibleMatches.value.filter((m) => !m.prediction);
});

const myNationalTeamName = computed(() => authStore.user?.favoriteNationalTeamName || '');
const myTeamCanonical = computed(() =>
  (myNationalTeamName.value ? footballTeamStore.canonicalFor(myNationalTeamName.value) : ''),
);

function matchHasMyTeam(match) {
  if (!myTeamCanonical.value) return false;
  const home = footballTeamStore.canonicalFor(match.homeTeam);
  const away = footballTeamStore.canonicalFor(match.awayTeam);
  return home === myTeamCanonical.value || away === myTeamCanonical.value;
}

const visibleMatchesSorted = computed(() => {
  const list = visibleMatchesFiltered.value.slice();
  if (!myTeamFirst.value || !myTeamCanonical.value) return list;
  return list.sort((a, b) => {
    const sa = matchHasMyTeam(a) ? 1 : 0;
    const sb = matchHasMyTeam(b) ? 1 : 0;
    if (sa !== sb) return sb - sa;
    return new Date(a.kickoffTime) - new Date(b.kickoffTime);
  });
});

const visibleMatchesLimited = computed(() => (
  props.compact ? visibleMatchesSorted.value.slice(0, props.compactLimit) : visibleMatchesSorted.value
));
const currentWizardMatch = computed(() => visibleMatchesSorted.value[wizardIndex.value] || null);

const emptyMessage = computed(() => {
  if (filter.value === 'today') return t('tipCopilot.emptyToday');
  if (filter.value === 'tomorrow') return t('tipCopilot.emptyTomorrow');
  return t('tipCopilot.emptyOpen');
});

function setInputRef(matchId, el) {
  if (el) inputRefs.value[matchId] = el;
}

function parseInputOrToast(raw) {
  const parsed = parseScoreInput(raw);
  if (parsed.ok) return parsed;

  if (parsed.error === 'invalidFormat') toast.error(t('tipCopilot.errors.invalidFormat'));
  else if (parsed.error === 'outOfRange') toast.error(t('tipCopilot.errors.outOfRange', { max: parsed.max }));
  else toast.error(t('tipCopilot.errors.invalidFormat'));

  return null;
}

async function saveTip(match, rawInput) {
  const parsed = parseInputOrToast(rawInput);
  if (!parsed) return null;
  const ok = await saveTipParsed(match, parsed);
  return ok ? parsed : null;
}

async function saveTipParsed(match, parsed) {
  savingId.value = match.id;
  try {
    if (match.prediction?.id) {
      await api.put(`/predictions/${match.prediction.id}`, {
        predictedHomeScore: parsed.homeScore,
        predictedAwayScore: parsed.awayScore,
      });
    } else {
      const res = await api.post('/predictions', {
        matchId: match.id,
        predictedHomeScore: parsed.homeScore,
        predictedAwayScore: parsed.awayScore,
      });
      // backend typically returns created prediction; keep it if present
      if (res?.data?.id) match.prediction = res.data;
    }

    match.prediction = match.prediction
      ? { ...match.prediction, predictedHomeScore: parsed.homeScore, predictedAwayScore: parsed.awayScore }
      : { predictedHomeScore: parsed.homeScore, predictedAwayScore: parsed.awayScore };

    toast.success(t('tipCopilot.saved', { score: `${parsed.homeScore}:${parsed.awayScore}` }));
    return true;
  } catch (err) {
    toast.error(err.response?.data?.error || t('tipCopilot.errors.saveFailed'));
    return false;
  } finally {
    savingId.value = null;
  }
}

async function saveListMatch(match) {
  const parsed = await saveTip(match, inputs[match.id]);
  if (!parsed) return;
  inputs[match.id] = `${parsed.homeScore}:${parsed.awayScore}`;
  markRecentlySaved(match.id);
  nextTick(() => focusNextMatch(match.id));
}

function focusNextMatch(afterId) {
  const idx = visibleMatchesLimited.value.findIndex((m) => m.id === afterId);
  const next = visibleMatchesLimited.value[idx + 1] || visibleMatchesLimited.value[idx] || visibleMatchesLimited.value[0];
  if (next) inputRefs.value[next.id]?.focus();
}

async function saveWizard() {
  if (!currentWizardMatch.value) return;
  const parsed = await saveTip(currentWizardMatch.value, wizardInput.value);
  if (!parsed) return;

  wizardInput.value = '';
  markRecentlySaved(currentWizardMatch.value.id);
  wizardIndex.value = Math.min(wizardIndex.value + 1, Math.max(0, visibleMatchesSorted.value.length - 1));
  await nextTick();
  wizardInputRef.value?.focus();
}

function switchToWizard() {
  mode.value = 'wizard';
  wizardIndex.value = 0;
  wizardInput.value = '';
  nextTick(() => wizardInputRef.value?.focus());
}

async function loadMatches() {
  loading.value = true;
  loadError.value = '';
  try {
    const { data } = await api.get('/matches');
    matches.value = Array.isArray(data) ? data : [];

    for (const match of matches.value) {
      if (!(match.id in inputs)) {
        inputs[match.id] = match.prediction
          ? `${match.prediction.predictedHomeScore}:${match.prediction.predictedAwayScore}`
          : '';
      }
    }
  } catch (err) {
    loadError.value = err.response?.data?.error || t('tipCopilot.loadFailed');
  } finally {
    loading.value = false;
  }
}

function markRecentlySaved(matchId) {
  recentlySaved.value = new Set([...recentlySaved.value, matchId]);
  setTimeout(() => {
    const next = new Set(recentlySaved.value);
    next.delete(matchId);
    recentlySaved.value = next;
  }, 1200);
}

const LOCK_WARNING_MS = 15 * 60 * 1000;
function isLockSoon(match) {
  const kickoff = new Date(match.kickoffTime).getTime();
  const remaining = kickoff - Date.now();
  return remaining > 0 && remaining <= LOCK_WARNING_MS;
}

async function applyBulk() {
  bulkError.value = '';
  const lines = bulkInput.value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return;

  bulkSaving.value = true;
  try {
    const errors = [];
    for (const line of lines) {
      const parsed = parseScoreInput(line);
      if (!parsed.ok || parsed.matchNumber == null) {
        errors.push(`${line} → ${t('tipCopilot.bulk.lineInvalid')}`);
        continue;
      }
      const match = visibleMatchesFiltered.value.find((m) => m.matchNumber === parsed.matchNumber);
      if (!match) {
        errors.push(`${line} → ${t('tipCopilot.bulk.matchNotFound', { number: parsed.matchNumber })}`);
        continue;
      }
      const ok = await saveTipParsed(match, parsed);
      if (ok) {
        inputs[match.id] = `${parsed.homeScore}:${parsed.awayScore}`;
        markRecentlySaved(match.id);
      } else {
        errors.push(`${line} → ${t('tipCopilot.bulk.saveFailed')}`);
      }
    }

    if (errors.length) {
      bulkError.value = errors.slice(0, 5).join('\n');
    } else {
      bulkInput.value = '';
    }
  } finally {
    bulkSaving.value = false;
  }
}

watch(currentWizardMatch, (m) => {
  if (m && mode.value === 'wizard') nextTick(() => wizardInputRef.value?.focus());
});

watch(filter, () => {
  wizardIndex.value = 0;
  wizardInput.value = '';
});

watch(missingOnly, () => {
  wizardIndex.value = 0;
  wizardInput.value = '';
});

function toggleMyTeamFirst() {
  if (!myTeamCanonical.value) {
    toast.warning(t('tipCopilot.myTeamNotSet'));
    myTeamFirst.value = false;
    return;
  }
  myTeamFirst.value = !myTeamFirst.value;
}

watch(myTeamFirst, () => {
  wizardIndex.value = 0;
  wizardInput.value = '';
});

onMounted(loadMatches);
</script>

<style scoped>
.tip-copilot-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.tip-copilot-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tip-copilot-summary {
  margin: 0 0 1rem;
}

.tip-copilot-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tip-copilot-item {
  display: grid;
  gap: 0.5rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}

.tip-copilot-item--saved {
  border-color: rgba(0, 255, 127, 0.35);
  box-shadow: 0 0 0 1px rgba(0, 255, 127, 0.12);
}

.tip-copilot-lock-warning {
  display: flex;
  justify-content: flex-start;
}

.tip-copilot-bulk-header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.tip-copilot-bulk-row {
  display: grid;
  gap: 0.5rem;
}

.tip-copilot-bulk-textarea {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.tip-copilot-bulk-error {
  margin: 0.5rem 0 0;
  white-space: pre-line;
}

.tip-copilot-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.match-ref {
  font-weight: 700;
  color: var(--color-primary);
}

.tip-copilot-kickoff {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.tip-copilot-kickoff-wrap {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.wizard-kickoff {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.tip-copilot-teams {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.5rem;
}

.tip-copilot-existing {
  font-size: 0.875rem;
}

.tip-copilot-input-row,
.wizard-input-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.tip-copilot-score-input {
  width: 7rem;
  text-align: center;
  font-size: 1.1rem;
  font-weight: 600;
}

.tip-copilot-score-input::placeholder,
.wizard-score-input::placeholder {
  color: var(--color-text-muted);
  opacity: 0.8;
}

.tip-copilot-wizard {
  margin-bottom: 1rem;
}

.wizard-progress {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: 1rem;
}

.wizard-match {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
}

.wizard-teams {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.5rem 0.75rem;
  font-size: 1.25rem;
}

.wizard-vs {
  color: var(--color-text-muted);
}

.wizard-score-input {
  flex: 1;
  min-width: 8rem;
  text-align: center;
  font-size: 1.5rem;
  font-weight: 700;
}

.wizard-input-row {
  width: 100%;
  max-width: 24rem;
  margin-top: 0.5rem;
}

.tip-copilot-more {
  margin-top: 0.75rem;
}

.tip-copilot--compact .tip-copilot-item {
  padding: 0.65rem 0.85rem;
}
</style>

