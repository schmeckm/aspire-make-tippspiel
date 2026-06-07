<template>
  <div v-if="outlook.length" class="group-outlook">
    <h4>{{ t('groupStandings.knockoutOutlook') }}</h4>
    <ul>
      <li v-for="entry in outlook" :key="`${entry.position}-${entry.team}`">
        <span class="outlook-pos">{{ entry.position }}.</span>
        <TeamLabel :name="entry.team" />
        <template v-if="entry.position === 3">
          <span class="outlook-text text-muted">
            – {{ t('groupStandings.thirdPlaceRank', { rank: entry.thirdPlaceRank || '–' }) }}
            <span v-if="entry.thirdPlaceQualified" class="outlook-qualified">
              ({{ t('groupStandings.thirdPlaceQualified') }})
            </span>
          </span>
        </template>
        <template v-else>
          <span class="outlook-text text-muted">
            → {{ t('groupStandings.match') }} {{ entry.knockoutMatchNumber }}:
            <TeamLabel v-if="entry.opponentTeam" :name="entry.opponentTeam" />
            <span v-else>{{ formatOpponentSlot(entry.opponentLabel) }}</span>
          </span>
        </template>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import TeamLabel from './TeamLabel.vue';

defineProps({
  outlook: { type: Array, default: () => [] },
});

const { t } = useI18n();

function formatOpponentSlot(slot) {
  if (!slot) return '–';
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
.group-outlook {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.group-outlook h4 {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.group-outlook ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.group-outlook li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem 0.45rem;
  font-size: 0.82rem;
}

.outlook-pos {
  font-weight: 700;
  color: var(--color-primary);
}

.outlook-qualified {
  color: var(--color-primary);
}
</style>
