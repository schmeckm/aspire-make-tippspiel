<template>
  <div>
    <div class="page-header">
      <h1>{{ t('predictions.title') }}</h1>
    </div>

    <LoadingSpinner v-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="retryLoad" />

    <div v-else-if="predictions.length === 0" class="card">
      <div class="card-body">
        <EmptyState
          icon="⚽"
          :title="t('predictions.emptyTitle')"
          :message="t('predictions.emptyHint')"
          :action-label="t('predictions.emptyAction')"
          :action-to="{ path: '/matches', query: { filter: 'missing' } }"
        />
      </div>
    </div>

    <div v-else class="card">
      <div class="card-body">
        <div class="predictions-desktop table-wrapper">
          <table class="predictions-table">
            <thead>
              <tr>
                <SortableTh
                  :label="t('matchTable.date')"
                  column-key="date"
                  :sort-key="sortKey"
                  :sort-dir="sortDir"
                  @sort="toggleSort"
                />
                <SortableTh
                  :label="t('predictions.round')"
                  column-key="round"
                  :sort-key="sortKey"
                  :sort-dir="sortDir"
                  @sort="toggleSort"
                />
                <SortableTh
                  :label="t('predictions.game')"
                  column-key="game"
                  :sort-key="sortKey"
                  :sort-dir="sortDir"
                  @sort="toggleSort"
                />
                <SortableTh
                  :label="t('predictions.myTip')"
                  column-key="tip"
                  :sort-key="sortKey"
                  :sort-dir="sortDir"
                  @sort="toggleSort"
                />
                <SortableTh
                  :label="t('matchTable.result')"
                  column-key="result"
                  :sort-key="sortKey"
                  :sort-dir="sortDir"
                  @sort="toggleSort"
                />
                <SortableTh
                  :label="t('matchTable.points')"
                  column-key="points"
                  :sort-key="sortKey"
                  :sort-dir="sortDir"
                  @sort="toggleSort"
                />
                <SortableTh
                  :label="t('matchTable.status')"
                  column-key="status"
                  :sort-key="sortKey"
                  :sort-dir="sortDir"
                  @sort="toggleSort"
                />
                <SortableTh
                  :label="t('matchTable.ref')"
                  column-key="externalApiId"
                  :sort-key="sortKey"
                  :sort-dir="sortDir"
                  @sort="toggleSort"
                />
              </tr>
            </thead>
            <tbody>
              <tr v-for="pred in sortedItems" :key="pred.id">
                <td class="col-date">
                  <div class="kickoff-cell">
                    <div>{{ formatDate(pred.match?.kickoffTime) }}</div>
                    <div class="kickoff-cell-sub text-muted">
                      <span>{{ formatTime(pred.match?.kickoffTime) }}</span>
                      <CountdownBadge
                        v-if="pred.match?.status === 'scheduled'"
                        :kickoff-time="pred.match.kickoffTime"
                        :show-expired="false"
                      />
                    </div>
                  </div>
                </td>
                <td class="col-round">{{ matchRoundLabel(pred.match) }}</td>
                <td>
                  <div class="prediction-match-cell">
                    <TeamFlag v-if="pred.match?.homeTeam" :name="pred.match.homeTeam" inline />
                    <span class="prediction-match-vs">{{ t('common.vs') }}</span>
                    <TeamFlag v-if="pred.match?.awayTeam" :name="pred.match.awayTeam" inline />
                  </div>
                </td>
                <td class="col-score">
                  <PredictionForm
                    v-if="pred.match?.canPredict"
                    :match="pred.match"
                    :prediction="pred"
                    compact
                    @saved="loadPredictions"
                  />
                  <span v-else>
                    <span class="lock-inline" :title="predictionLockTitle(pred.match)" aria-label="locked">🔒</span>
                    {{ pred.predictedHomeScore }} : {{ pred.predictedAwayScore }}
                  </span>
                </td>
                <td class="col-score">
                  <span v-if="pred.match?.status === 'finished'">
                    {{ pred.match.homeScore }} : {{ pred.match.awayScore }}
                  </span>
                  <span v-else class="text-muted">–</span>
                </td>
                <td class="col-points">
                  <span v-if="pred.points !== null && pred.points !== undefined" class="badge badge-success">
                    {{ formatPoints(pred.points) }} {{ t('common.points') }}
                  </span>
                  <span v-else class="text-muted">–</span>
                </td>
                <td>
                  <span :class="['badge', `badge-${pred.match?.status}`]">
                    {{ statusLabel(pred.match?.status) }}
                  </span>
                </td>
                <td class="col-match-ref">
                  <MatchRefCell
                    :match-number="pred.match?.matchNumber"
                    :external-api-id="pred.match?.externalApiId"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="predictions-mobile">
          <article v-for="pred in sortedItems" :key="`card-${pred.id}`" class="prediction-card">
            <div class="prediction-card-header">
              <div class="prediction-card-kickoff">
                <span class="text-muted">{{ formatDate(pred.match?.kickoffTime) }} · {{ formatTime(pred.match?.kickoffTime) }}</span>
                <CountdownBadge
                  v-if="pred.match?.status === 'scheduled'"
                  :kickoff-time="pred.match.kickoffTime"
                  :show-expired="false"
                />
              </div>
              <span :class="['badge', `badge-${pred.match?.status}`]">
                {{ statusLabel(pred.match?.status) }}
              </span>
            </div>
            <div class="prediction-card-match">
              <TeamFlag v-if="pred.match?.homeTeam" :name="pred.match.homeTeam" inline />
              <span class="prediction-match-vs">{{ t('common.vs') }}</span>
              <TeamFlag v-if="pred.match?.awayTeam" :name="pred.match.awayTeam" inline />
            </div>
            <div class="prediction-card-meta">{{ matchRoundLabel(pred.match) }}</div>
            <div class="prediction-card-row">
              <span>{{ t('predictions.myTip') }}</span>
              <PredictionForm
                v-if="pred.match?.canPredict"
                :match="pred.match"
                :prediction="pred"
                compact
                @saved="loadPredictions"
              />
              <div v-else class="prediction-locked-inline">
                <span class="lock-inline" :title="predictionLockTitle(pred.match)" aria-label="locked">🔒</span>
                {{ pred.predictedHomeScore }} : {{ pred.predictedAwayScore }}
                <div class="lock-reason text-muted">{{ predictionLockTitle(pred.match) }}</div>
              </div>
            </div>
            <div class="prediction-card-row">
              <span>{{ t('matchTable.result') }}</span>
              <span v-if="pred.match?.status === 'finished'">
                {{ pred.match.homeScore }} : {{ pred.match.awayScore }}
              </span>
              <span v-else class="text-muted">–</span>
            </div>
            <div class="prediction-card-row">
              <span>{{ t('matchTable.points') }}</span>
              <span v-if="pred.points !== null && pred.points !== undefined" class="badge badge-success">
                {{ formatPoints(pred.points) }} {{ t('common.points') }}
              </span>
              <span v-else class="text-muted">–</span>
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import ErrorState from '../components/ErrorState.vue';
import EmptyState from '../components/EmptyState.vue';
import SortableTh from '../components/SortableTh.vue';
import TeamFlag from '../components/TeamFlag.vue';
import MatchRefCell from '../components/MatchRefCell.vue';
import PredictionForm from '../components/PredictionForm.vue';
import CountdownBadge from '../components/CountdownBadge.vue';
import { useFormatters } from '../composables/useFormatters';
import { useMatchMeta } from '../composables/useMatchMeta';
import { useTableSort } from '../composables/useTableSort';
import { getPredictionLockReason } from '../utils/predictionLockReason';

const { t } = useI18n();
const { formatDate, formatTime, formatPoints } = useFormatters();
const { matchRoundLabel, matchRoundSortValue } = useMatchMeta();
const predictions = ref([]);
const loading = ref(true);
const error = ref('');

const STATUS_ORDER = {
  cancelled: 0,
  postponed: 1,
  scheduled: 2,
  locked: 3,
  halftime: 4,
  live: 5,
  finished: 6,
};

const { sortKey, sortDir, sortedItems, toggleSort } = useTableSort(predictions, {
  defaultKey: 'date',
  defaultDir: 'asc',
  getters: {
    date: (pred) => new Date(pred.match?.kickoffTime || 0).getTime(),
    round: (pred) => matchRoundSortValue(pred.match).toLowerCase(),
    game: (pred) => `${pred.match?.homeTeam || ''} vs ${pred.match?.awayTeam || ''}`.toLowerCase(),
    tip: (pred) => (pred.predictedHomeScore ?? 0) * 100 + (pred.predictedAwayScore ?? 0),
    result: (pred) => {
      if (pred.match?.status !== 'finished') return -1;
      return (pred.match.homeScore ?? 0) * 100 + (pred.match.awayScore ?? 0);
    },
    points: (pred) => pred.points ?? -1,
    status: (pred) => STATUS_ORDER[pred.match?.status] ?? -1,
    externalApiId: (pred) => {
      const id = pred.match?.externalApiId;
      if (id == null || id === '') return '';
      const numeric = Number(id);
      return Number.isNaN(numeric) ? String(id) : numeric;
    },
    matchNumber: (pred) => pred.match?.matchNumber ?? Number.MAX_SAFE_INTEGER,
  },
});

function statusLabel(status) {
  return t(`matchStatus.${status}`, status);
}

function predictionLockTitle(match) {
  const { key, kickoffTime } = getPredictionLockReason(match);
  if (key === 'predictions.lockReasonKickoff' && kickoffTime) {
    return t(key, { time: formatTime(kickoffTime), date: formatDate(kickoffTime) });
  }
  return t(key);
}

async function loadPredictions() {
  const { data } = await api.get('/predictions/my');
  predictions.value = data;
}

async function retryLoad() {
  loading.value = true;
  error.value = '';
  try {
    await loadPredictions();
  } catch (err) {
    error.value = err.response?.data?.error || t('predictions.loadFailed');
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  try {
    await loadPredictions();
  } catch (err) {
    error.value = err.response?.data?.error || t('predictions.loadFailed');
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.prediction-match-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 12rem;
}

.prediction-match-vs {
  flex-shrink: 0;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: lowercase;
}

.lock-inline {
  display: inline-flex;
  margin-right: 0.25rem;
  opacity: 0.85;
}

.prediction-locked-inline {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.lock-reason {
  width: 100%;
  margin-top: 0.1rem;
  font-size: 0.8rem;
}

.predictions-mobile { display: none; }

@media (max-width: 768px) {
  .predictions-desktop { display: none; }
  .predictions-mobile {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
}

.prediction-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.875rem;
  background: var(--color-surface);
  box-shadow: var(--glow-card);
}

.prediction-card-header,
.prediction-card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.kickoff-cell-sub {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
}

.prediction-card-kickoff {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.prediction-card-header {
  margin-bottom: 0.5rem;
}

.prediction-card-match {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.prediction-card-meta {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}

.prediction-card-row {
  margin-top: 0.5rem;
  font-size: 0.9rem;
}
</style>
