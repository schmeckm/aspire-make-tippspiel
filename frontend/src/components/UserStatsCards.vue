<template>
  <div class="stats-grid">
    <div v-for="stat in stats" :key="stat.label" class="stat-card">
      <div class="stat-value">{{ stat.value }}</div>
      <div class="stat-label">{{ stat.label }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  data: { type: Object, required: true },
});

const stats = computed(() => [
  { label: 'Gesamtpunkte', value: props.data.totalPoints ?? '–' },
  { label: 'Aktueller Rang', value: props.data.currentRank ? `#${props.data.currentRank}` : '–' },
  { label: 'Spielpunkte', value: props.data.matchPoints ?? 0 },
  { label: 'Bonuspunkte', value: props.data.bonusPoints ?? 0 },
  { label: 'Exakt-Quote', value: `${props.data.exactPredictionRate ?? 0}%` },
  { label: 'Ø Punkte/Spiel', value: props.data.averagePointsPerMatch ?? 0 },
  { label: 'Tipps abgegeben', value: props.data.submittedPredictions ?? 0 },
  { label: 'Vollständigkeit', value: `${props.data.completionPercentage ?? 0}%` },
]);
</script>
