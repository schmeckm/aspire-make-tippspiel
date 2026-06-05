<template>
  <div>
    <div class="page-header">
      <h1>{{ t('help.title') }}</h1>
      <p class="text-muted">{{ t('help.subtitle') }}</p>
    </div>

    <LoadingSpinner v-if="loading" />

    <div v-else class="help-content">
      <section class="card">
        <div class="card-body">
          <h2>{{ t('help.sections.winner.title') }}</h2>
          <p>{{ t('help.sections.winner.text') }}</p>
        </div>
      </section>

      <section class="card">
        <div class="card-body">
          <h2>{{ t('help.sections.scoring.title') }}</h2>
          <p>{{ t('help.sections.scoring.intro') }}</p>
          <ul class="help-list">
            <li>{{ t('help.scoring.exact', points) }}</li>
            <li>{{ t('help.scoring.goalDiff', points) }}</li>
            <li>{{ t('help.scoring.tendency', points) }}</li>
            <li>{{ t('help.scoring.wrong', points) }}</li>
          </ul>
          <div class="help-example">
            <h3>{{ t('help.example.title') }}</h3>
            <p class="text-muted">{{ t('help.example.result') }}</p>
            <p>{{ t('help.example.exact', points) }}</p>
            <p>{{ t('help.example.goalDiff', points) }}</p>
            <p>{{ t('help.example.tendency', points) }}</p>
            <p>{{ t('help.example.wrong', points) }}</p>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-body">
          <h2>{{ t('help.sections.deadline.title') }}</h2>
          <p>{{ t('help.sections.deadline.text') }}</p>
        </div>
      </section>

      <section class="card">
        <div class="card-body">
          <h2>{{ t('help.sections.bonus.title') }}</h2>
          <p>{{ t('help.sections.bonus.text') }}</p>
        </div>
      </section>

      <section class="card">
        <div class="card-body">
          <h2>{{ t('help.sections.leaderboard.title') }}</h2>
          <p>{{ t('help.sections.leaderboard.text') }}</p>
          <h3>{{ t('help.tiebreaker.title') }}</h3>
          <ol class="help-list">
            <li>{{ t('help.tiebreaker.item1') }}</li>
            <li>{{ t('help.tiebreaker.item2') }}</li>
            <li>{{ t('help.tiebreaker.item3') }}</li>
            <li>{{ t('help.tiebreaker.item4') }}</li>
          </ol>
        </div>
      </section>

      <section class="card">
        <div class="card-body">
          <h2>{{ t('help.sections.teams.title') }}</h2>
          <p>{{ t('help.sections.teams.text') }}</p>
        </div>
      </section>

      <section class="card help-ai-card">
        <div class="card-body">
          <h2>{{ t('help.sections.ai.title') }}</h2>
          <p>{{ t('help.sections.ai.text') }}</p>
          <router-link to="/ai-coach" class="btn btn-primary btn-sm">{{ t('help.sections.ai.link') }}</router-link>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const { t } = useI18n();
const loading = ref(true);
const rules = ref({
  exactResultPoints: 5,
  goalDifferencePoints: 3,
  tendencyPoints: 2,
  wrongPredictionPoints: 0,
});

const points = computed(() => ({
  exact: rules.value.exactResultPoints,
  goalDiff: rules.value.goalDifferencePoints,
  tendency: rules.value.tendencyPoints,
  wrong: rules.value.wrongPredictionPoints,
}));

onMounted(async () => {
  try {
    const { data } = await api.get('/scoring-rules');
    rules.value = data;
  } catch {
    // defaults above
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.help-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.help-content h2 {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.help-content h3 {
  font-size: 0.95rem;
  margin: 1rem 0 0.5rem;
}

.help-list {
  margin: 0.75rem 0 0;
  padding-left: 1.25rem;
  line-height: 1.6;
}

.help-example {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}

.help-example p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
}

.help-ai-card .btn {
  margin-top: 0.75rem;
}
</style>
