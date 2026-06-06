<template>
  <section class="head2head-panel">
    <div class="head2head-header">
      <h4>{{ t('head2head.title') }}</h4>
      <span v-if="data?.cached" class="badge badge-info">{{ t('head2head.cached') }}</span>
    </div>

    <p v-if="subtitle" class="head2head-subtitle text-muted">{{ subtitle }}</p>

    <LoadingSpinner v-if="loading" />
    <AlertMessage v-else-if="error" :message="error" type="warning" />

    <template v-else-if="data">
      <div v-if="hasMeetings" class="head2head-summary">
        <div class="head2head-summary-item">
          <span class="head2head-summary-label">{{ data.teamA }}</span>
          <strong>{{ data.summary.teamAWins }}</strong>
          <span class="text-muted">{{ t('head2head.wins') }}</span>
        </div>
        <div class="head2head-summary-item head2head-summary-draws">
          <strong>{{ data.summary.draws }}</strong>
          <span class="text-muted">{{ t('head2head.draws') }}</span>
        </div>
        <div class="head2head-summary-item">
          <span class="head2head-summary-label">{{ data.teamB }}</span>
          <strong>{{ data.summary.teamBWins }}</strong>
          <span class="text-muted">{{ t('head2head.wins') }}</span>
        </div>
      </div>
      <p v-else class="text-muted head2head-empty">{{ t('head2head.empty') }}</p>

      <div v-if="hasMeetings" class="table-wrapper head2head-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{{ t('head2head.date') }}</th>
              <th>{{ t('head2head.competition') }}</th>
              <th>{{ t('head2head.stage') }}</th>
              <th>{{ t('matchTable.home') }}</th>
              <th>{{ t('matchTable.result') }}</th>
              <th>{{ t('matchTable.away') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="meeting in data.meetings" :key="meeting.id || `${meeting.date}-${meeting.homeTeam}`">
              <td>{{ formatMeetingDate(meeting.date) }}</td>
              <td>{{ meetingLabel(meeting) }}</td>
              <td>{{ meeting.stage || '–' }}</td>
              <td>{{ meeting.homeTeam }}</td>
              <td><strong>{{ meeting.homeScore }} : {{ meeting.awayScore }}</strong></td>
              <td>{{ meeting.awayTeam }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="hasMeetings" class="head2head-footnote text-muted">
        {{ t('head2head.footnote', { count: data.summary.totalMatches, goals: data.summary.totalGoals }) }}
      </p>
    </template>

    <button
      v-else-if="showLoadButton"
      type="button"
      class="btn btn-secondary btn-sm"
      @click="$emit('load')"
    >
      {{ t('head2head.show') }}
    </button>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import LoadingSpinner from './LoadingSpinner.vue';
import AlertMessage from './AlertMessage.vue';
import { useFormatters } from '../composables/useFormatters';

const props = defineProps({
  data: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  showLoadButton: { type: Boolean, default: false },
});

defineEmits(['load']);

const { t } = useI18n();
const { formatDate } = useFormatters();

const hasMeetings = computed(() => (props.data?.meetings?.length || 0) > 0);

function formatMeetingDate(value) {
  if (!value) return '–';
  return formatDate(value);
}

function meetingLabel(meeting) {
  if (meeting.seasonYear && meeting.competition) {
    return `${meeting.competition} ${meeting.seasonYear}`;
  }
  return meeting.competition || meeting.seasonYear || '–';
}
</script>

<style scoped>
.head2head-panel {
  margin-top: 0;
}

.head2head-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.head2head-header h4 {
  margin: 0;
  font-size: 0.95rem;
  color: var(--color-primary);
}

.head2head-subtitle {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
}

.head2head-summary {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-soft, #f8fafc);
}

.head2head-summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  text-align: center;
}

.head2head-summary-item strong {
  font-size: 1.35rem;
  line-height: 1;
}

.head2head-summary-label {
  font-size: 0.8rem;
  font-weight: 600;
}

.head2head-summary-draws {
  justify-content: center;
  border-left: 1px solid var(--color-border);
  border-right: 1px solid var(--color-border);
  padding: 0 0.5rem;
}

.head2head-table-wrap {
  margin-bottom: 0.5rem;
}

.head2head-table-wrap table {
  font-size: 0.85rem;
}

.head2head-footnote,
.head2head-empty {
  margin: 0.5rem 0 0;
  font-size: 0.78rem;
}
</style>
