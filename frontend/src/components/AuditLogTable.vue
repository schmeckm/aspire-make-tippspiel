<template>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>{{ t('adminPages.auditLog.colTime') }}</th>
          <th>{{ t('adminPages.auditLog.colUser') }}</th>
          <th>{{ t('adminPages.auditLog.colAction') }}</th>
          <th>{{ t('adminPages.auditLog.colEntity') }}</th>
          <th>{{ t('adminPages.auditLog.colDetails') }}</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="log in logs" :key="log.id">
          <tr
            :class="{ expandable: canExpand(log) }"
            @click="canExpand(log) && toggle(log.id)"
          >
            <td>{{ formatDate(log.createdAt) }}</td>
            <td>{{ log.user ? `${log.user.firstName} ${log.user.lastName}` : t('adminPages.auditLog.system') }}</td>
            <td><span class="badge badge-info">{{ log.action }}</span></td>
            <td>{{ log.entityType }} #{{ log.entityId || '–' }}</td>
            <td class="details-cell">
              <button
                v-if="canExpand(log)"
                type="button"
                class="details-toggle"
                :aria-expanded="expandedId === log.id"
                @click.stop="toggle(log.id)"
              >
                {{ expandedId === log.id ? t('adminPages.auditLog.hideDetails') : t('adminPages.auditLog.showDetails') }}
              </button>
              <span>{{ summarize(log) }}</span>
            </td>
          </tr>
          <tr v-if="expandedId === log.id" class="details-row">
            <td colspan="5">
              <div class="details-panel">
                <p v-if="parsedDetails(log)?.message" class="details-message">
                  {{ parsedDetails(log).message }}
                </p>
                <div v-if="recipientList(log).length" class="recipient-list">
                  <strong>{{ t('adminPages.auditLog.recipients') }}</strong>
                  <table class="recipient-table">
                    <thead>
                      <tr>
                        <th>{{ t('adminPages.auditLog.recipientName') }}</th>
                        <th>{{ t('adminPages.auditLog.recipientEmail') }}</th>
                        <th>{{ t('adminPages.auditLog.recipientStatus') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(recipient, index) in recipientList(log)" :key="`${log.id}-${recipient.userId || index}`">
                        <td>{{ recipient.name || '–' }}</td>
                        <td>{{ recipient.email || '–' }}</td>
                        <td>{{ formatRecipientStatus(recipient) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-else-if="testEmailTo(log)" class="details-message">
                  {{ t('adminPages.auditLog.sentTo', { email: testEmailTo(log) }) }}
                  <span v-if="parsedDetails(log)?.mock"> ({{ t('adminPages.auditLog.mockMode') }})</span>
                </p>
                <pre v-else-if="parsedDetails(log)" class="details-json">{{ formatJson(parsedDetails(log)) }}</pre>
                <p v-else class="text-muted">{{ t('adminPages.auditLog.noDetails') }}</p>
              </div>
            </td>
          </tr>
        </template>
        <tr v-if="logs.length === 0">
          <td colspan="5" class="text-center text-muted">{{ t('adminPages.auditLog.empty') }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

defineProps({ logs: { type: Array, default: () => [] } });

const { t } = useI18n();
const expandedId = ref(null);

const EMAIL_ACTIONS = new Set([
  'EMAIL_TEST',
  'EMAIL_REMINDERS',
  'EMAIL_USER_REMINDERS',
  'EMAIL_STATUS_UPDATES',
  'EMAIL_MORNING_DIGEST',
]);

function formatDate(d) {
  return new Date(d).toLocaleString('de-DE');
}

function parsedDetails(log) {
  if (!log?.newValueJson) return null;
  try {
    return JSON.parse(log.newValueJson);
  } catch {
    return null;
  }
}

function isEmailAction(log) {
  return EMAIL_ACTIONS.has(log.action);
}

function recipientList(log) {
  return parsedDetails(log)?.recipients || [];
}

function testEmailTo(log) {
  if (log.action !== 'EMAIL_TEST') return '';
  return parsedDetails(log)?.to || '';
}

function canExpand(log) {
  const data = parsedDetails(log);
  if (!data) return false;
  if (isEmailAction(log)) {
    return !!(data.recipients?.length || data.to || data.message);
  }
  return true;
}

function summarize(log) {
  const data = parsedDetails(log);
  if (!data) return '–';

  if (log.action === 'EMAIL_TEST' && data.to) {
    return t('adminPages.auditLog.sentTo', { email: data.to });
  }

  if (data.recipients?.length) {
    const sentEmails = data.recipients
      .filter((entry) => entry.status === 'sent' && entry.email)
      .map((entry) => entry.email);
    if (sentEmails.length > 0) {
      return t('adminPages.auditLog.sentSummary', {
        count: data.sent ?? sentEmails.length,
        emails: sentEmails.join(', '),
      });
    }
  }

  if (data.message) return data.message;

  const raw = JSON.stringify(data);
  return raw.length > 100 ? `${raw.slice(0, 100)}…` : raw;
}

function formatRecipientStatus(recipient) {
  if (recipient.status === 'sent') return t('adminPages.auditLog.statusSent');
  if (recipient.reason === 'no_email') return t('adminPages.auditLog.statusNoEmail');
  return t('adminPages.auditLog.statusSkipped');
}

function formatJson(data) {
  return JSON.stringify(data, null, 2);
}

function toggle(id) {
  expandedId.value = expandedId.value === id ? null : id;
}
</script>

<style scoped>
.details-cell {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  max-width: 280px;
}

.details-toggle {
  display: inline-block;
  margin-right: 0.5rem;
  border: none;
  background: transparent;
  color: var(--color-accent);
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

tr.expandable {
  cursor: pointer;
}

tr.expandable:hover {
  background: rgba(255, 255, 255, 0.03);
}

.details-row td {
  background: rgba(0, 0, 0, 0.15);
  padding: 0.75rem 1rem;
}

.details-panel {
  font-size: 0.8rem;
}

.details-message {
  margin: 0 0 0.75rem;
}

.recipient-list strong {
  display: block;
  margin-bottom: 0.5rem;
}

.recipient-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
}

.recipient-table th,
.recipient-table td {
  text-align: left;
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.details-json {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.7rem;
  color: var(--color-text-muted);
}
</style>
