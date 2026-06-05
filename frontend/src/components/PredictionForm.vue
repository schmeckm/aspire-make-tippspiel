<template>
  <form v-if="!isLocked" @submit.prevent="handleSubmit" class="prediction-inputs">
    <input
      v-model.number="homeScore"
      type="number"
      min="0"
      max="20"
      required
      class="form-control"
      style="width: 60px; text-align: center;"
      :placeholder="t('predictions.home')"
    />
    <span class="prediction-separator">:</span>
    <input
      v-model.number="awayScore"
      type="number"
      min="0"
      max="20"
      required
      class="form-control"
      style="width: 60px; text-align: center;"
      :placeholder="t('predictions.away')"
    />
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
});

const emit = defineEmits(['saved']);

const isLocked = computed(() => {
  if (props.locked != null) return props.locked;
  return props.match.canPredict === false;
});

const homeScore = ref(props.prediction?.predictedHomeScore ?? '');
const awayScore = ref(props.prediction?.predictedAwayScore ?? '');
const loading = ref(false);

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
    toast.error(err.response?.data?.error || t('predictions.saveFailed'));
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
</style>
