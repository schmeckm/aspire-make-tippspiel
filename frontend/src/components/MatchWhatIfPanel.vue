<template>
  <div class="whatif">
    <button type="button" class="btn btn-secondary btn-sm" @click="open = !open">
      {{ open ? t('matches.whatIf.hide') : t('matches.whatIf.show') }}
    </button>

    <div v-if="open" class="whatif-panel">
      <div class="whatif-form">
        <div class="whatif-label">
          {{ t('matches.whatIf.yourAlternativeTip') }}
        </div>
        <div class="whatif-inputs">
          <input v-model.number="home" type="number" min="0" class="form-control form-control-sm" :aria-label="t('matches.whatIf.home')" />
          <span class="text-muted">:</span>
          <input v-model.number="away" type="number" min="0" class="form-control form-control-sm" :aria-label="t('matches.whatIf.away')" />
          <button type="button" class="btn btn-primary btn-sm" :disabled="loading" @click="simulate">
            {{ loading ? t('matches.whatIf.simulating') : t('matches.whatIf.simulate') }}
          </button>
        </div>
      </div>

      <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>

      <div v-if="result" class="whatif-result">
        <div class="whatif-summary">
          <div>
            <strong>{{ t('matches.whatIf.pointsDelta') }}</strong>
            <span :class="deltaClass">
              {{ result.simulated.deltaPoints >= 0 ? `+${result.simulated.deltaPoints}` : `${result.simulated.deltaPoints}` }}
            </span>
          </div>
          <div>
            <strong>{{ t('matches.whatIf.rankChange') }}</strong>
            <span>#{{ result.current.rank }} → #{{ result.simulated.rank }}</span>
          </div>
        </div>

        <div class="whatif-top10">
          <div class="text-muted whatif-top10-title">{{ t('matches.whatIf.vsTop10') }}</div>
          <div v-for="entry in result.top10" :key="entry.userId" class="whatif-top10-row">
            <span class="whatif-top10-rank">#{{ entry.rank ?? '–' }}</span>
            <span class="whatif-top10-name"><strong>{{ entry.firstName }} {{ entry.lastName }}</strong></span>
            <span class="whatif-top10-gap" :class="gapClass(entry.gapAfter)">
              {{ formatGap(entry.gapAfter) }}
            </span>
          </div>
          <div class="text-muted whatif-footnote">
            {{ t('matches.whatIf.gapFootnote') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';

const props = defineProps({
  match: { type: Object, required: true },
});

const { t } = useI18n();
const open = ref(false);
const loading = ref(false);
const error = ref('');
const result = ref(null);

const home = ref(props.match?.prediction?.predictedHomeScore ?? 0);
const away = ref(props.match?.prediction?.predictedAwayScore ?? 0);

watch(() => props.match?.prediction, (p) => {
  if (!p) return;
  home.value = p.predictedHomeScore ?? home.value;
  away.value = p.predictedAwayScore ?? away.value;
});

const deltaClass = computed(() => {
  const d = result.value?.simulated?.deltaPoints ?? 0;
  if (d > 0) return 'text-success';
  if (d < 0) return 'text-danger';
  return 'text-muted';
});

function gapClass(gap) {
  if (gap === 0) return 'text-muted';
  return gap > 0 ? 'text-muted' : 'text-success';
}

function formatGap(gap) {
  if (gap === 0) return t('matches.whatIf.gapEven');
  if (gap > 0) return t('matches.whatIf.gapBehind', { points: gap });
  return t('matches.whatIf.gapAhead', { points: Math.abs(gap) });
}

async function simulate() {
  loading.value = true;
  error.value = '';
  result.value = null;
  try {
    const { data } = await api.post(`/what-if/match/${props.match.id}`, {
      predictedHomeScore: home.value,
      predictedAwayScore: away.value,
    });
    result.value = data;
  } catch (err) {
    error.value = err.response?.data?.error || t('matches.whatIf.failed');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.whatif {
  margin-top: 0.75rem;
}

.whatif-panel {
  margin-top: 0.5rem;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.02);
}

.whatif-form {
  margin-bottom: 0.5rem;
}

.whatif-label {
  display: block;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-bottom: 0.25rem;
}

.whatif-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.whatif-inputs input {
  width: 5rem;
}

.whatif-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin: 0.5rem 0 0.75rem;
}

.whatif-top10-title {
  font-size: 0.85rem;
  margin-bottom: 0.35rem;
}

.whatif-top10-row {
  display: grid;
  grid-template-columns: 3.25rem 1fr auto;
  gap: 0.5rem;
  padding: 0.25rem 0;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
}

.whatif-top10-row:last-child {
  border-bottom: none;
}

.whatif-top10-gap {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.whatif-footnote {
  margin-top: 0.4rem;
  font-size: 0.75rem;
}
</style>

