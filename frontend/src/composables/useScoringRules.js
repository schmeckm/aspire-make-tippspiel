import { ref, computed, onMounted } from 'vue';
import api from '../services/api';

const DEFAULT_RULES = Object.freeze({
  exactResultPoints: 4,
  goalDifferencePoints: 3,
  tendencyPoints: 2,
  wrongPredictionPoints: 0,
});

export function useScoringRules() {
  const loading = ref(true);
  const rules = ref({ ...DEFAULT_RULES });

  const points = computed(() => ({
    exact: rules.value.exactResultPoints,
    goalDiff: rules.value.goalDifferencePoints,
    tendency: rules.value.tendencyPoints,
    wrong: rules.value.wrongPredictionPoints,
  }));

  onMounted(async () => {
    try {
      const { data } = await api.get('/scoring-rules');
      rules.value = data || { ...DEFAULT_RULES };
    } catch {
      rules.value = { ...DEFAULT_RULES };
    } finally {
      loading.value = false;
    }
  });

  return { loading, rules, points };
}

