<template>
  <div class="bonus-suggestions">
    <button class="btn btn-accent btn-sm" :disabled="loading" @click="generate">
      {{ loading ? 'Generiere...' : '🤖 KI-Vorschläge generieren' }}
    </button>
    <AlertMessage v-if="error" :message="error" type="error" />
    <div v-if="suggestions.length" class="suggestions-list mt-2">
      <div v-for="(s, i) in suggestions" :key="i" class="suggestion-card">
        <strong>{{ s.questionText }}</strong>
        <div class="meta">
          <span class="badge badge-info">{{ s.questionType }}</span>
          <span class="badge badge-success">{{ s.suggestedPoints || 10 }} Pkt.</span>
        </div>
        <div v-if="s.options" class="options">{{ s.options.join(', ') }}</div>
        <button class="btn btn-secondary btn-sm mt-1" @click="$emit('use', s)">Übernehmen</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import api from '../services/api';
import AlertMessage from './AlertMessage.vue';

defineEmits(['use']);

const loading = ref(false);
const error = ref('');
const suggestions = ref([]);

async function generate() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.post('/admin/ai/bonus-question-suggestions', { numberOfQuestions: 5 });
    suggestions.value = data.suggestions || [];
  } catch (err) {
    error.value = err.response?.data?.error || 'KI-Vorschläge nicht verfügbar.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.suggestions-list { display: flex; flex-direction: column; gap: 0.75rem; }
.suggestion-card { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 1rem; }
.meta { display: flex; gap: 0.5rem; margin: 0.5rem 0; }
.options { font-size: 0.8rem; color: var(--color-text-muted); }
.mt-1 { margin-top: 0.5rem; }
.mt-2 { margin-top: 1rem; }
</style>
