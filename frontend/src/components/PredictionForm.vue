<template>
  <form v-if="!isLocked" @submit.prevent="handleSubmit" :class="['prediction-inputs', { 'prediction-inputs--compact': compact }]">
    <div :class="['score-stepper', compact ? 'score-stepper--horizontal' : 'score-stepper--vertical']">
      <button
        type="button"
        class="score-stepper-btn"
        :disabled="scoreAtMax(homeScore)"
        :aria-label="t('predictions.increaseHomeScore', { team: match.homeTeam })"
        @click="adjustScore('home', 1)"
      >
        {{ compact ? '›' : '▴' }}
      </button>
      <input
        v-model.number="homeScore"
        type="number"
        min="0"
        max="20"
        required
        class="form-control score-stepper-input"
        :placeholder="t('predictions.home')"
        :aria-label="t('predictions.homeScoreLabel', { team: match.homeTeam })"
      />
      <button
        type="button"
        class="score-stepper-btn"
        :disabled="scoreAtMin(homeScore)"
        :aria-label="t('predictions.decreaseHomeScore', { team: match.homeTeam })"
        @click="adjustScore('home', -1)"
      >
        {{ compact ? '‹' : '▾' }}
      </button>
    </div>
    <span class="prediction-separator" aria-hidden="true">:</span>
    <div :class="['score-stepper', compact ? 'score-stepper--horizontal' : 'score-stepper--vertical']">
      <button
        type="button"
        class="score-stepper-btn"
        :disabled="scoreAtMax(awayScore)"
        :aria-label="t('predictions.increaseAwayScore', { team: match.awayTeam })"
        @click="adjustScore('away', 1)"
      >
        {{ compact ? '›' : '▴' }}
      </button>
      <input
        v-model.number="awayScore"
        type="number"
        min="0"
        max="20"
        required
        class="form-control score-stepper-input"
        :placeholder="t('predictions.away')"
        :aria-label="t('predictions.awayScoreLabel', { team: match.awayTeam })"
      />
      <button
        type="button"
        class="score-stepper-btn"
        :disabled="scoreAtMin(awayScore)"
        :aria-label="t('predictions.decreaseAwayScore', { team: match.awayTeam })"
        @click="adjustScore('away', -1)"
      >
        {{ compact ? '‹' : '▾' }}
      </button>
    </div>
    <button type="submit" class="btn btn-primary btn-sm" :disabled="loading">
      {{ loading ? t('common.loading') : (prediction ? t('common.save') : t('predictions.submit')) }}
    </button>
  </form>
  <div v-else class="prediction-locked">
    <span class="prediction-lock-icon" :title="t('predictions.locked')">🔒</span>
    <span v-if="prediction" class="badge badge-info">
      {{ prediction.predictedHomeScore }} : {{ prediction.predictedAwayScore }}
    </span>
    <span v-else class="text-muted">{{ t('predictions.noTipLocked') }}</span>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import { useToast } from '../composables/useToast';

const { t } = useI18n();
const toast = useToast();

const props = defineProps({
  match: { type: Object, required: true },
  prediction: { type: Object, default: null },
  locked: { type: Boolean, default: null },
  compact: { type: Boolean, default: false },
});

const emit = defineEmits(['saved']);

const isLocked = computed(() => {
  if (props.locked != null) return props.locked;
  return props.match.canPredict === false;
});

const MIN_SCORE = 0;
const MAX_SCORE = 20;

const homeScore = ref(props.prediction?.predictedHomeScore ?? '');
const awayScore = ref(props.prediction?.predictedAwayScore ?? '');
const loading = ref(false);

function parseScore(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : MIN_SCORE;
}

function scoreAtMin(value) {
  return parseScore(value) <= MIN_SCORE;
}

function scoreAtMax(value) {
  return parseScore(value) >= MAX_SCORE;
}

function adjustScore(side, delta) {
  const target = side === 'home' ? homeScore : awayScore;
  const next = Math.min(MAX_SCORE, Math.max(MIN_SCORE, parseScore(target.value) + delta));
  target.value = next;
}

watch(() => props.prediction, (val) => {
  if (val) {
    homeScore.value = val.predictedHomeScore;
    awayScore.value = val.predictedAwayScore;
  } else if (!isLocked.value) {
    homeScore.value = '';
    awayScore.value = '';
  }
});

async function handleSubmit() {
  loading.value = true;
  try {
    if (props.prediction) {
      await api.put(`/predictions/${props.prediction.id}`, {
        predictedHomeScore: homeScore.value,
        predictedAwayScore: awayScore.value,
      });
    } else {
      await api.post('/predictions', {
        matchId: props.match.id,
        predictedHomeScore: homeScore.value,
        predictedAwayScore: awayScore.value,
      });
    }
    toast.success(t('predictions.saved'));
    emit('saved');
  } catch (err) {
    const status = err.response?.status;
    const apiMessage = err.response?.data?.error;
    if (status === 403) {
      toast.error(apiMessage || t('predictions.closed'));
    } else {
      toast.error(apiMessage || t('predictions.saveFailed'));
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.prediction-locked {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem;
}
.prediction-lock-icon { font-size: 1rem; opacity: 0.85; }

.score-stepper {
  display: inline-flex;
  align-items: center;
}

.score-stepper--vertical {
  flex-direction: column;
  gap: 0.15rem;
}

.score-stepper--horizontal {
  flex-direction: row;
  gap: 0.2rem;
}

.score-stepper-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 2.2rem;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.score-stepper--vertical .score-stepper-btn {
  width: 5rem;
  height: 3rem;
  border: none;
  background: transparent;
  font-size: 2.3rem;
}

.score-stepper-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-soft, rgba(0, 255, 127, 0.08));
}

.score-stepper-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.score-stepper-input {
  width: 60px;
  text-align: center;
  padding: 0.5rem 0.25rem;
  font-size: 1.1rem;
  font-weight: 700;
  -moz-appearance: textfield;
}

.score-stepper--vertical .score-stepper-input {
  width: 3rem;
  padding: 0.25rem;
  font-size: 1.5rem;
  font-weight: 800;
  border: none;
  background: transparent;
  min-height: auto;
}

.score-stepper--vertical .score-stepper-input:focus {
  box-shadow: none;
  border-color: transparent;
}

.score-stepper-input::-webkit-outer-spin-button,
.score-stepper-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.prediction-inputs--compact {
  justify-content: flex-start;
  gap: 0.35rem;
}

.prediction-inputs--compact .score-stepper--horizontal {
  gap: 0.15rem;
}

.prediction-inputs--compact .score-stepper-btn {
  width: 3.5rem;
  height: 3.5rem;
  font-size: 2.5rem;
}

.prediction-inputs--compact .score-stepper-input {
  width: 48px;
  padding: 0.25rem;
  font-size: 0.95rem;
}

.prediction-inputs--compact .prediction-separator {
  font-size: 1rem;
}
</style>
