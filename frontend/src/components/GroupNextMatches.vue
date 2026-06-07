<template>
  <div v-if="matches.length" class="group-next-matches">
    <h4>{{ t('groupStandings.nextMatches') }}</h4>
    <ul>
      <li v-for="match in matches" :key="match.id || match.matchNumber">
        <span class="match-date">{{ formatDateTime(match.kickoffTime) }}</span>
        <span class="match-teams">
          <TeamLabel :name="match.homeTeam" />
          <span class="match-vs">{{ t('groupStandings.vs') }}</span>
          <TeamLabel :name="match.awayTeam" />
        </span>
        <span v-if="isLive(match)" class="match-live">{{ t('groupStandings.live') }}</span>
        <span v-else-if="hasScore(match)" class="match-score">
          {{ match.homeScore }}:{{ match.awayScore }}
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { useFormatters } from '../composables/useFormatters';
import TeamLabel from './TeamLabel.vue';

defineProps({
  matches: { type: Array, default: () => [] },
});

const { t } = useI18n();
const { formatDateTime } = useFormatters();

function isLive(match) {
  return match.status === 'live' || match.status === 'halftime';
}

function hasScore(match) {
  return match.status === 'finished'
    && match.homeScore != null
    && match.awayScore != null;
}
</script>

<style scoped>
.group-next-matches {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.group-next-matches h4 {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.group-next-matches ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.group-next-matches li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.5rem;
  font-size: 0.85rem;
}

.match-date {
  color: var(--color-text-muted);
  white-space: nowrap;
}

.match-teams {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.match-vs {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.match-live {
  color: var(--color-primary);
  font-weight: 600;
  font-size: 0.75rem;
}

.match-score {
  font-weight: 600;
}
</style>
