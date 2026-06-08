<template>
  <div>
    <div class="page-header">
      <h1>{{ t('adminPages.scoringRules.title') }}</h1>
    </div>

    <AlertMessage v-if="message" :message="message" type="success" />
    <ErrorState v-if="loadError" :message="loadError" @retry="loadRules" />
    <AlertMessage v-else-if="error" :message="error" type="error" />

    <LoadingSpinner v-if="loading" />

    <div v-else class="card" style="max-width: 600px;">
      <div class="card-body">
        <form @submit.prevent="handleSave">
          <div class="form-group">
            <label>{{ t('adminPages.scoringRules.exactResult') }}</label>
            <input v-model.number="form.exactResultPoints" type="number" min="0" class="form-control" required />
          </div>
          <div class="form-group">
            <label>{{ t('adminPages.scoringRules.goalDifference') }}</label>
            <input v-model.number="form.goalDifferencePoints" type="number" min="0" class="form-control" required />
          </div>
          <div class="form-group">
            <label>{{ t('adminPages.scoringRules.tendency') }}</label>
            <input v-model.number="form.tendencyPoints" type="number" min="0" class="form-control" required />
          </div>
          <div class="form-group">
            <label>{{ t('adminPages.scoringRules.wrongPrediction') }}</label>
            <input v-model.number="form.wrongPredictionPoints" type="number" min="0" class="form-control" required />
          </div>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? t('common.saving') : t('adminPages.scoringRules.saveRules') }}
          </button>
        </form>

        <div class="example-box">
          <h4>{{ t('adminPages.scoringRules.exampleTitle') }}</h4>
          <p class="text-muted example-text">
            {{ t('adminPages.scoringRules.exampleLine1') }}<br />
            {{ t('adminPages.scoringRules.exampleExact', { points: form.exactResultPoints }) }}<br />
            {{ t('adminPages.scoringRules.exampleDiff', { points: form.goalDifferencePoints }) }}<br />
            {{ t('adminPages.scoringRules.exampleTendency', { points: form.tendencyPoints }) }}<br />
            {{ t('adminPages.scoringRules.exampleWrong', { points: form.wrongPredictionPoints }) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner.vue';
import AlertMessage from '../../components/AlertMessage.vue';
import ErrorState from '../../components/ErrorState.vue';

const { t } = useI18n();

const loading = ref(true);
const saving = ref(false);
const message = ref('');
const loadError = ref('');
const error = ref('');

const form = ref({
  exactResultPoints: 5,
  goalDifferencePoints: 3,
  tendencyPoints: 2,
  wrongPredictionPoints: 0,
});

async function loadRules() {
  loading.value = true;
  loadError.value = '';
  try {
    const { data } = await api.get('/scoring-rules');
    form.value = { ...data };
  } catch (err) {
    loadError.value = err.response?.data?.error || t('adminPages.scoringRules.loadFailed');
  } finally {
    loading.value = false;
  }
}

onMounted(loadRules);

async function handleSave() {
  saving.value = true;
  error.value = '';
  message.value = '';
  try {
    await api.put('/scoring-rules', form.value);
    message.value = t('adminPages.scoringRules.saved');
  } catch (err) {
    error.value = err.response?.data?.error || t('adminPages.scoringRules.saveFailed');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.example-box {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}
.example-box h4 {
  margin-bottom: 0.5rem;
}
.example-text {
  font-size: 0.875rem;
  margin: 0;
}
</style>
