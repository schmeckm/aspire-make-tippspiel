<template>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>Typ</th><th>Status</th><th>Provider</th><th>Start</th>
          <th>Erstellt</th><th>Aktualisiert</th><th>Übersprungen</th><th>Fehler</th><th>Meldung</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in logs" :key="log.id">
          <td>{{ log.syncType }}</td>
          <td><span :class="['badge', statusClass(log.status)]">{{ log.status }}</span></td>
          <td>{{ log.provider || '–' }}</td>
          <td>{{ formatDate(log.startedAt) }}</td>
          <td>{{ log.createdCount }}</td>
          <td>{{ log.updatedCount }}</td>
          <td>{{ log.skippedCount }}</td>
          <td>{{ log.errorCount }}</td>
          <td class="error-cell">{{ log.errorMessage || '–' }}</td>
        </tr>
        <tr v-if="logs.length === 0">
          <td colspan="9" class="text-center text-muted">Keine Sync-Logs vorhanden.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({ logs: { type: Array, default: () => [] } });

function formatDate(d) { return new Date(d).toLocaleString('de-DE'); }
function statusClass(s) {
  return { success: 'badge-success', failed: 'badge-danger', partial: 'badge-warning', running: 'badge-info' }[s] || 'badge-info';
}
</script>

<style scoped>
.error-cell { max-width: 220px; font-size: 0.75rem; color: var(--color-text-muted); }
</style>
