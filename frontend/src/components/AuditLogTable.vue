<template>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>Zeitpunkt</th><th>Benutzer</th><th>Aktion</th><th>Entität</th><th>Details</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in logs" :key="log.id">
          <td>{{ formatDate(log.createdAt) }}</td>
          <td>{{ log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System' }}</td>
          <td><span class="badge badge-info">{{ log.action }}</span></td>
          <td>{{ log.entityType }} #{{ log.entityId || '–' }}</td>
          <td class="details-cell">{{ truncate(log.newValueJson) }}</td>
        </tr>
        <tr v-if="logs.length === 0">
          <td colspan="5" class="text-center text-muted">Keine Einträge.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({ logs: { type: Array, default: () => [] } });

function formatDate(d) { return new Date(d).toLocaleString('de-DE'); }
function truncate(s) { return s ? s.substring(0, 80) + (s.length > 80 ? '...' : '') : '–'; }
</script>

<style scoped>
.details-cell { font-size: 0.75rem; color: var(--color-text-muted); max-width: 200px; overflow: hidden; text-overflow: ellipsis; }
</style>
