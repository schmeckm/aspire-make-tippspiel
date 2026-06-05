<template>
  <div class="card">
    <div class="card-header"><h3>🔄 Betriebsmodus & Synchronisierung</h3></div>
    <div class="card-body">
      <AlertMessage
        v-if="!status.apiConfigured"
        inline
        :toast="false"
        :message="status.statusMessage || defaultMessage"
        type="info"
      />

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ modeLabel }}</div>
          <div class="stat-label">Betriebsmodus</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ status.apiConfigured ? '✓' : 'CSV' }}</div>
          <div class="stat-label">Football-API</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ status.successCount || 0 }}</div>
          <div class="stat-label">Erfolgreiche Syncs</div>
        </div>
        <div class="stat-card accent">
          <div class="stat-value">{{ status.failedCount || 0 }}</div>
          <div class="stat-label">Fehler/Teilfehler</div>
        </div>
      </div>

      <div v-if="status.apiConfigured" class="sync-times mt-2">
        <p><strong>Provider:</strong> football-data.org v4</p>
        <p><strong>Wettbewerb:</strong> {{ status.competitionId || 'WC' }} (Fallback-ID {{ status.competitionNumericId || '2000' }}) · Saison {{ status.season || '2026' }}</p>
        <p><strong>Letzter Spielplan-Sync:</strong> {{ formatDate(status.lastFixtureSync?.finishedAt || status.lastFixtureSync?.startedAt) }}</p>
        <p><strong>Letzter Ergebnis-Sync:</strong> {{ formatDate(status.lastResultSync?.finishedAt || status.lastResultSync?.startedAt) }}</p>
        <p><strong>Letzter Live-Sync:</strong> {{ formatDate(status.lastLiveSync?.finishedAt || status.lastLiveSync?.startedAt) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import AlertMessage from './AlertMessage.vue';
import { MANUAL_MODE_MESSAGE } from '../constants/adminMessages';

const props = defineProps({
  status: { type: Object, default: () => ({}) },
});

const defaultMessage = MANUAL_MODE_MESSAGE;

const modeLabel = computed(() => (
  props.status.operationMode === 'api' || props.status.apiConfigured ? 'API-Sync' : 'Manuell (CSV)'
));

function formatDate(d) {
  if (!d) return 'Noch nie';
  return new Date(d).toLocaleString('de-DE');
}
</script>

<style scoped>
.sync-times p { font-size: 0.875rem; margin-bottom: 0.25rem; }
.mt-2 { margin-top: 1rem; }
</style>
