<template>
  <div>
    <div class="page-header">
      <h1>{{ t('adminPages.scoringRules.title') }}</h1>
    </div>

    <AlertMessage v-if="message" :message="message" type="success" />
    <AlertMessage v-if="error" :message="error" type="error" />

    <LoadingSpinner v-if="loading" />

    <div v-else class="card" style="max-width: 600px;">
      <div class="card-body">
        <form @submit.prevent="handleSave">
          <div class="form-group">
            <label>Exaktes Ergebnis (Punkte)</label>
            <input v-model.number="form.exactResultPoints" type="number" min="0" class="form-control" required />
          </div>
          <div class="form-group">
            <label>Richtige Tordifferenz (Punkte)</label>
            <input v-model.number="form.goalDifferencePoints" type="number" min="0" class="form-control" required />
          </div>
          <div class="form-group">
            <label>Richtige Tendenz (Punkte)</label>
            <input v-model.number="form.tendencyPoints" type="number" min="0" class="form-control" required />
          </div>
          <div class="form-group">
            <label>Falscher Tipp (Punkte)</label>
            <input v-model.number="form.wrongPredictionPoints" type="number" min="0" class="form-control" required />
          </div>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Speichern...' : 'Regeln speichern' }}
          </button>
        </form>

        <div class="mt-2" style="padding: 1rem; background: var(--color-bg); border-radius: var(--radius-sm);">
          <h4 style="margin-bottom: 0.5rem;">Beispiel</h4>
          <p class="text-muted" style="font-size: 0.875rem;">
            Endergebnis: Deutschland 2:1 Frankreich<br />
            Tipp 2:1 = {{ form.exactResultPoints }} Pkt. (exakt)<br />
            Tipp 3:2 = {{ form.goalDifferencePoints }} Pkt. (Tordifferenz)<br />
            Tipp 1:0 = {{ form.tendencyPoints }} Pkt. (Tendenz)<br />
            Tipp 1:2 = {{ form.wrongPredictionPoints }} Pkt. (falsch)
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


const { t } = useI18n();

const loading = ref(true);
const saving = ref(false);
const message = ref('');
const error = ref('');

const form = ref({
  exactResultPoints: 5,
  goalDifferencePoints: 3,
  tendencyPoints: 2,
  wrongPredictionPoints: 0,
});

onMounted(async () => {
  try {
    const { data } = await api.get('/scoring-rules');
    form.value = { ...data };
  } finally {
    loading.value = false;
  }
});

async function handleSave() {
  saving.value = true;
  error.value = '';
  message.value = '';
  try {
    await api.put('/scoring-rules', form.value);
    message.value = 'Punkte-Regeln gespeichert. Bitte Punkte neu berechnen, falls nötig.';
  } catch (err) {
    error.value = err.response?.data?.error || 'Speichern fehlgeschlagen.';
  } finally {
    saving.value = false;
  }
}
</script>
