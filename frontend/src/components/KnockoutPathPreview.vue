<template>
  <div class="knockout-path">
    <div class="knockout-path-section" v-for="section in sections" :key="section.stage">
      <h3>{{ stageTitle(section.stage) }}</h3>
      <div class="knockout-path-grid">
        <div
          v-for="match in section.matches"
          :key="match.matchNumber"
          class="knockout-path-card"
          :class="{ projected: match.projected, finished: match.status === 'finished' }"
        >
          <div class="knockout-path-meta">
            <span>{{ t('groupStandings.match') }} {{ match.matchNumber }}</span>
            <span v-if="match.kickoffTime">{{ formatDateTime(match.kickoffTime) }}</span>
          </div>
          <div class="knockout-path-teams">
            <div class="knockout-path-team">
              <TeamLabel v-if="match.homeTeam" :name="match.homeTeam" />
              <span v-else class="text-muted">{{ formatSlot(match.homeLabel) }}</span>
            </div>
            <span class="knockout-path-vs">{{ t('groupStandings.vs') }}</span>
            <div class="knockout-path-team">
              <TeamLabel v-if="match.awayTeam" :name="match.awayTeam" />
              <span v-else class="text-muted">{{ formatSlot(match.awayLabel) }}</span>
            </div>
          </div>
          <div v-if="match.status === 'finished' && match.homeScore != null" class="knockout-path-score">
            {{ match.homeScore }}:{{ match.awayScore }}
          </div>
          <div v-else-if="match.projected" class="knockout-path-projected text-muted">
            {{ t('groupStandings.projected') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFormatters } from '../composables/useFormatters';
import TeamLabel from './TeamLabel.vue';

const props = defineProps({
  path: { type: Array, default: () => [] },
});

const { t } = useI18n();
const { formatDateTime } = useFormatters();

const STAGE_ORDER = ['LAST_32', 'LAST_16'];

const sections = computed(() => {
  const grouped = new Map();
  for (const match of props.path) {
    if (!grouped.has(match.stage)) grouped.set(match.stage, []);
    grouped.get(match.stage).push(match);
  }
  return STAGE_ORDER
    .filter((stage) => grouped.has(stage))
    .map((stage) => ({ stage, matches: grouped.get(stage) }));
});

function stageTitle(stage) {
  if (stage === 'LAST_32') return t('groupStandings.roundOf32');
  if (stage === 'LAST_16') return t('groupStandings.roundOf16');
  return stage;
}

function formatSlot(slot) {
  if (!slot) return '–';
  if (slot.startsWith('W')) {
    const num = slot.slice(1);
    return t('groupStandings.winnerOfMatch', { match: num });
  }
  if (slot.startsWith('3_')) {
    const groups = slot.slice(2).split('').join(', ');
    return t('groupStandings.thirdFromGroups', { groups });
  }
  const match = slot.match(/^([12])([A-L])$/);
  if (match) {
    const position = match[1] === '1' ? t('groupStandings.winner') : t('groupStandings.runnerUp');
    return `${position} ${t('nationalTeams.group')} ${match[2]}`;
  }
  return slot;
}
</script>

<style scoped>
.knockout-path-section + .knockout-path-section {
  margin-top: 1.5rem;
}

.knockout-path-section h3 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.knockout-path-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.75rem;
}

.knockout-path-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  background: var(--color-surface);
}

.knockout-path-card.projected {
  border-style: dashed;
}

.knockout-path-card.finished {
  border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
}

.knockout-path-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.knockout-path-teams {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0.5rem;
  align-items: center;
}

.knockout-path-team {
  min-width: 0;
}

.knockout-path-vs {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.knockout-path-score,
.knockout-path-projected {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  text-align: center;
}

.knockout-path-score {
  font-weight: 700;
  color: var(--color-primary);
}
</style>
