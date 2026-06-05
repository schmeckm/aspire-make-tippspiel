<template>
  <div>
    <div class="page-header"><h1>{{ t('adminPages.email.title') }}</h1></div>
    <AlertMessage v-if="message" :message="message" type="success" />
    <AlertMessage v-if="error" :message="error" type="error" />

    <div class="card mb-2">
      <div class="card-header">
        <h3>SMTP-Status</h3>
        <span :class="['badge', emailStatus.checklistComplete ? 'badge-success' : 'badge-warning']">
          {{ emailStatus.checklistComplete ? 'Bereit' : 'Unvollständig' }}
        </span>
      </div>
      <div class="card-body">
        <p><strong>Konfiguriert:</strong> {{ emailStatus.configured ? 'Ja' : 'Nein (Mock-Modus)' }}</p>
        <p v-if="emailStatus.host"><strong>Host:</strong> {{ emailStatus.host }}</p>
        <p v-if="emailStatus.from"><strong>Absender:</strong> {{ emailStatus.from }}</p>
        <p v-if="emailStatus.appUrl"><strong>APP_URL:</strong> {{ emailStatus.appUrl }}</p>
        <p><strong>Erinnerungen:</strong> {{ emailStatus.remindersEnabled ? 'Aktiv' : 'Inaktiv' }}</p>
        <p><strong>E-Mail-Bestätigung:</strong> {{ emailStatus.requireEmailVerification ? 'Aktiv' : 'Inaktiv' }}</p>

        <div v-if="emailStatus.checklist?.length" class="smtp-checklist">
          <h4>SMTP-Checkliste</h4>
          <ul>
            <li v-for="item in emailStatus.checklist" :key="item.id" :class="{ ok: item.ok, missing: !item.ok }">
              <span class="check-icon">{{ item.ok ? '✓' : '○' }}</span>
              {{ item.label }}
            </li>
          </ul>
          <p v-if="!emailStatus.checklistComplete" class="checklist-hint text-muted">
            Ohne vollständige SMTP-Konfiguration werden Verifizierungs-, Reset- und Reminder-Links nur in der Backend-Konsole geloggt.
          </p>
        </div>
      </div>
    </div>

    <div class="card mb-2">
      <div class="card-header"><h3>Erinnerungs-Sprache</h3></div>
      <div class="card-body">
        <p class="text-muted">
          Tipp-Erinnerungen werden automatisch in der Sprache des jeweiligen Nutzers versendet
          (<strong>de</strong>, <strong>en</strong>, <strong>es</strong>, <strong>fr</strong>) –
          basierend auf der Spracheinstellung im Profil, wie bei Registrierung und Passwort-Reset.
        </p>
        <p class="text-muted mb-0">
          Es ist keine manuelle Vorlage oder KI-Text nötig. Jeder Nutzer erhält den passenden Text in seiner Sprache.
        </p>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Einstellungen & Tests</h3></div>
      <div class="card-body">
        <EmailSettingsForm
          :settings="settings"
          :loading="saving"
          @save="saveSettings"
          @test-email="sendTest"
          @send-reminders="sendReminders"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';
import AlertMessage from '../../components/AlertMessage.vue';
import EmailSettingsForm from '../../components/EmailSettingsForm.vue';

const { t } = useI18n();

const settings = ref({});
const emailStatus = ref({});
const saving = ref(false);
const message = ref('');
const error = ref('');

onMounted(async () => {
  const [settingsRes, emailRes] = await Promise.all([
    api.get('/settings'),
    api.get('/admin/email/status'),
  ]);
  settings.value = settingsRes.data;
  emailStatus.value = emailRes.data;
});

async function saveSettings(form) {
  saving.value = true;
  try {
    const { data } = await api.put('/admin/settings', form);
    settings.value = data;
    message.value = 'Einstellungen gespeichert.';
  } catch (e) { error.value = e.response?.data?.error || 'Fehler.'; }
  finally { saving.value = false; }
}

async function sendTest() {
  try {
    const { data } = await api.post('/admin/email/send-test');
    message.value = data.message || 'Test-E-Mail gesendet.';
  } catch (e) { error.value = e.response?.data?.error || 'Fehler.'; }
}

async function sendReminders() {
  try {
    const { data } = await api.post('/admin/email/send-reminders');
    if (data.skipped) {
      error.value = data.message || 'Erinnerungen sind deaktiviert.';
      return;
    }
    if (data.sent === 0) {
      error.value = data.message || 'Keine E-Mails gesendet.';
      return;
    }
    message.value = data.message || `${data.sent} Erinnerungen gesendet.`;
  } catch (e) { error.value = e.response?.data?.error || 'Fehler.'; }
}
</script>

<style scoped>
.mb-2 { margin-bottom: 1.5rem; }

.smtp-checklist {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.smtp-checklist h4 {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.smtp-checklist ul {
  list-style: none;
  padding: 0;
  margin: 0 0 0.75rem;
}

.smtp-checklist li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  font-size: 0.875rem;
}

.smtp-checklist li.ok { color: var(--color-success, #107e3e); }
.smtp-checklist li.missing { color: var(--color-text-muted); }

.check-icon {
  width: 1.25rem;
  text-align: center;
  font-weight: 600;
}

.checklist-hint {
  font-size: 0.8rem;
  margin: 0;
}

.badge-success {
  background: var(--color-success-bg, #e8f5e9);
  color: var(--color-success, #107e3e);
}

.badge-warning {
  background: var(--color-warning-bg, #fff3e0);
  color: var(--color-warning, #e9730c);
}
</style>
