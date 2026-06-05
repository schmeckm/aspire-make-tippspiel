<template>
  <div class="reminder-generator">
    <p class="hint text-muted" v-pre>
      Erstellen Sie einen individuellen Text für Tipp-Erinnerungen. Platzhalter:
      {{firstName}}, {{missingCount}}, {{matchList}}, {{tipLink}}, {{appTitle}}
    </p>

    <div class="btn-group mb-2">
      <button class="btn btn-accent btn-sm" :disabled="loading" @click="generate">
        {{ loading ? 'Generiere...' : '🤖 KI-Text generieren' }}
      </button>
      <button class="btn btn-secondary btn-sm" :disabled="saving || !hasContent" @click="saveTemplate">
        {{ saving ? 'Speichere...' : 'Vorlage speichern' }}
      </button>
      <button class="btn btn-primary btn-sm" :disabled="sending || !hasContent" @click="sendWithText">
        {{ sending ? 'Sende...' : 'Mit diesem Text senden' }}
      </button>
    </div>

    <AlertMessage v-if="error" :message="error" type="error" />
    <AlertMessage v-if="message" :message="message" type="success" />

    <div class="result-card">
      <div class="form-group">
        <label>Betreff</label>
        <input v-model="form.subject" class="form-control" placeholder="z. B. {{appTitle}} – noch {{missingCount}} Tipps offen" />
      </div>
      <div class="form-group">
        <label>E-Mail-Text</label>
        <textarea v-model="form.emailBody" class="form-control" rows="6" placeholder="Hallo {{firstName}}, Sie haben noch {{missingCount}} offene Tipps..." />
      </div>
      <div class="form-group">
        <label>In-App-Benachrichtigung</label>
        <input v-model="form.notificationText" class="form-control" placeholder="Noch {{missingCount}} Tipps abgeben!" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import api from '../services/api';
import AlertMessage from './AlertMessage.vue';

const props = defineProps({
  settings: { type: Object, default: () => ({}) },
});

const emit = defineEmits(['sent', 'saved']);

const loading = ref(false);
const saving = ref(false);
const sending = ref(false);
const error = ref('');
const message = ref('');

const form = reactive({
  subject: '',
  emailBody: '',
  notificationText: '',
});

const hasContent = computed(() =>
  form.subject.trim() || form.emailBody.trim() || form.notificationText.trim());

watch(() => props.settings, (s) => {
  if (!s) return;
  if (s.reminderEmailSubject) form.subject = s.reminderEmailSubject;
  if (s.reminderEmailBody) form.emailBody = s.reminderEmailBody;
  if (s.reminderNotificationText) form.notificationText = s.reminderNotificationText;
}, { immediate: true });

async function generate() {
  loading.value = true;
  error.value = '';
  message.value = '';
  try {
    const { data } = await api.post('/admin/ai/reminder-text', {
      targetGroup: 'Nutzer mit fehlenden Tipps',
      tone: 'friendly',
    });
    form.subject = data.subject || form.subject;
    form.emailBody = data.emailBody || form.emailBody;
    form.notificationText = data.notificationText || form.notificationText;
    message.value = 'KI-Text generiert – bitte prüfen und speichern oder senden.';
  } catch (err) {
    error.value = err.response?.data?.error || 'KI-Reminder nicht verfügbar.';
  } finally {
    loading.value = false;
  }
}

async function saveTemplate() {
  saving.value = true;
  error.value = '';
  message.value = '';
  try {
    const { data } = await api.put('/admin/settings', {
      reminderEmailSubject: form.subject,
      reminderEmailBody: form.emailBody,
      reminderNotificationText: form.notificationText,
    });
    message.value = 'Erinnerungs-Vorlage gespeichert.';
    emit('saved', data);
  } catch (err) {
    error.value = err.response?.data?.error || err.message || 'Vorlage konnte nicht gespeichert werden.';
  } finally {
    saving.value = false;
  }
}

async function sendWithText() {
  if (!form.subject.trim() || !form.emailBody.trim()) {
    error.value = 'Bitte Betreff und E-Mail-Text ausfüllen (beides erforderlich).';
    return;
  }

  sending.value = true;
  error.value = '';
  message.value = '';
  try {
    await api.put('/admin/settings', {
      reminderEmailSubject: form.subject,
      reminderEmailBody: form.emailBody,
      reminderNotificationText: form.notificationText,
    });

    const { data } = await api.post('/admin/email/send-reminders', {
      subject: form.subject,
      emailBody: form.emailBody,
      notificationText: form.notificationText,
    });

    if (data.skipped) {
      error.value = data.message || 'Erinnerungen sind deaktiviert.';
      return;
    }
    if (data.sent === 0) {
      error.value = data.message || 'Keine E-Mails gesendet – keine fehlenden Tipps oder keine Empfänger.';
      return;
    }

    message.value = data.message || `${data.sent} Erinnerungen gesendet.`;
    emit('sent', data);
  } catch (err) {
    error.value = err.response?.data?.error || err.message || 'Erinnerungen konnten nicht gesendet werden.';
  } finally {
    sending.value = false;
  }
}
</script>

<style scoped>
.result-card { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 1rem; }
.mb-2 { margin-bottom: 1rem; }
.hint { font-size: 0.85rem; margin-bottom: 0.75rem; }
.hint code { font-size: 0.8rem; }
.btn-group { display: flex; flex-wrap: wrap; gap: 0.5rem; }
</style>
