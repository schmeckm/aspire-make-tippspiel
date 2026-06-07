<template>
  <div v-if="insights.length" class="ai-insights">
    <div v-for="(insight, i) in insights" :key="i" :class="['insight-card', insight.type]">
      <span class="insight-icon">{{ insight.icon }}</span>
      <span class="insight-text">{{ insight.text }}</span>
      <router-link v-if="insight.action" :to="insight.action" class="insight-link">→</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../services/api';

const insights = ref([]);

onMounted(async () => {
  try {
    const { data } = await api.get('/ai/dashboard-insights');
    insights.value = data.insights || [];
  } catch {
    // insights optional
  }
});
</script>

<style scoped>
.ai-insights { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; }
.insight-card {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.875rem 1rem; border-radius: var(--radius);
  background: var(--color-surface); border: 1px solid var(--color-border);
  font-size: 0.875rem;
  box-shadow: var(--glow-card);
}
.insight-card.warning { border-left: 3px solid var(--color-warning); }
.insight-card.success { border-left: 3px solid var(--color-success); }
.insight-card.info { border-left: 3px solid var(--color-info); }
.insight-card.ai { border-left: 3px solid var(--color-primary); background: var(--color-primary-soft); }
.insight-icon { font-size: 1.25rem; }
.insight-text { flex: 1; }
.insight-link { color: var(--color-primary); font-weight: 600; text-decoration: none; }
</style>
