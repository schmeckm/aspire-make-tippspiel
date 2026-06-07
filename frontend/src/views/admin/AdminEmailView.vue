<template>
  <div>
    <div class="page-header"><h1>{{ t('adminPages.email.title') }}</h1></div>
    <AlertMessage v-if="message" :message="message" type="success" />
    <AlertMessage v-if="error" :message="error" type="error" />

    <div class="card mb-2">
      <div class="card-header">
        <h3>{{ t('adminPages.email.smtpStatus') }}</h3>
        <span :class="['badge', emailStatus.checklistComplete ? 'badge-success' : 'badge-warning']">
          {{ emailStatus.checklistComplete ? t('adminPages.email.ready') : t('adminPages.email.incomplete') }}
        </span>
      </div>
      <div class="card-body">
        <p>
          <strong>{{ t('adminPages.email.configured') }}:</strong>
          {{ emailStatus.configured ? t('common.yes') : t('adminPages.email.mockMode') }}
        </p>
        <p v-if="emailStatus.host"><strong>{{ t('adminPages.email.host') }}:</strong> {{ emailStatus.host }}</p>
        <p v-if="emailStatus.from"><strong>{{ t('adminPages.email.from') }}:</strong> {{ emailStatus.from }}</p>
        <p v-if="emailStatus.appUrl"><strong>{{ t('adminPages.email.appUrl') }}:</strong> {{ emailStatus.appUrl }}</p>
        <p>
          <strong>{{ t('adminPages.email.reminders') }}:</strong>
          {{ emailStatus.remindersEnabled ? t('adminPages.email.active') : t('adminPages.email.inactive') }}
        </p>
        <p>
          <strong>{{ t('adminPages.email.emailVerification') }}:</strong>
          {{ emailStatus.requireEmailVerification ? t('adminPages.email.active') : t('adminPages.email.inactive') }}
        </p>

        <div v-if="emailStatus.checklist?.length" class="smtp-checklist">
          <h4>{{ t('adminPages.email.smtpChecklist') }}</h4>
          <ul>
            <li v-for="item in emailStatus.checklist" :key="item.id" :class="{ ok: item.ok, missing: !item.ok }">
              <span class="check-icon">{{ item.ok ? '✓' : '○' }}</span>
              {{ item.label }}
            </li>
          </ul>
          <p v-if="!emailStatus.checklistComplete" class="checklist-hint text-muted">
            {{ t('adminPages.email.checklistHint') }}
          </p>
        </div>
      </div>
    </div>

    <div class="card mb-2">
      <div class="card-header"><h3>{{ t('adminPages.email.reminderLanguageTitle') }}</h3></div>
      <div class="card-body">
        <p class="text-muted">
          {{ t('adminPages.email.reminderLanguageDesc', { langs: 'de, en, es, fr' }) }}
        </p>
        <p class="text-muted mb-0">
          {{ t('adminPages.email.reminderLanguageNote') }}
        </p>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>{{ t('adminPages.email.settingsAndTests') }}</h3></div>
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

async function refreshEmailStatus() {
  const { data } = await api.get('/admin/email/status');
  emailStatus.value = data;
}

async function saveSettings(form) {
  saving.value = true;
  error.value = '';
  try {
    const { data } = await api.put('/admin/settings', form);
    settings.value = data;
    await refreshEmailStatus();
    message.value = t('adminPages.email.settingsSaved');
  } catch (e) {
    error.value = e.response?.data?.error || t('adminPages.email.saveFailed');
  } finally {
    saving.value = false;
  }
}

async function sendTest() {
  error.value = '';
  try {
    const { data } = await api.post('/admin/email/send-test');
    if (data.result?.mock) {
      error.value = data.message || t('adminPages.email.smtpNotConfigured');
      return;
    }
    message.value = data.message || t('adminPages.email.testEmailSent');
  } catch (e) {
    error.value = e.response?.data?.error || t('adminPages.email.saveFailed');
  }
}

async function sendReminders() {
  error.value = '';
  try {
    const { data } = await api.post('/admin/email/send-reminders');
    if (data.skipped) {
      error.value = data.message || t('adminPages.email.remindersDisabled');
      return;
    }
    if (data.sent === 0) {
      error.value = data.message || t('adminPages.email.noEmailsSent');
      return;
    }
    message.value = data.message || t('adminPages.email.remindersSent', { count: data.sent });
  } catch (e) {
    error.value = e.response?.data?.error || t('adminPages.email.saveFailed');
  }
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

.smtp-checklist li.ok { color: var(--color-success); }
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

</style>
