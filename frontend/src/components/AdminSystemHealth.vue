<template>
  <div class="card">
    <div class="card-header"><h3>🏥 Systemstatus</h3></div>
    <div class="card-body">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ health.version }}</div>
          <div class="stat-label">Version</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ health.database?.status === 'ok' ? '✓' : '✗' }}</div>
          <div class="stat-label">Datenbank ({{ health.database?.dialect }})</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ health.websocket?.active ? '✓' : '✗' }}</div>
          <div class="stat-label">WebSocket</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ health.email?.configured ? '✓' : '✗' }}</div>
          <div class="stat-label">E-Mail (SMTP)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ health.api?.configured ? '✓' : '✗' }}</div>
          <div class="stat-label">Fußball-API</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ formatUptime(health.uptime) }}</div>
          <div class="stat-label">Uptime</div>
        </div>
      </div>
      <p v-if="health.api?.statusMessage" class="api-status-message">{{ health.api.statusMessage }}</p>
      <div v-if="health.lastError" class="alert alert-error mt-2">
        Letzter Sync-Fehler: {{ health.lastError.errorMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ health: { type: Object, default: () => ({}) } });

function formatUptime(seconds) {
  if (!seconds) return '–';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}
</script>

<style scoped>
.api-status-message {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 193, 7, 0.1);
  border-left: 3px solid var(--color-accent-dark);
  font-size: 0.875rem;
  border-radius: var(--radius-sm);
}
.mt-2 { margin-top: 1rem; }
</style>
