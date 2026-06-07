<template>
  <div>
    <div class="page-header">
      <h1>{{ t('groupStandings.title') }}</h1>
      <span class="text-muted">{{ t('groupStandings.subtitle') }}</span>
    </div>

    <AlertMessage v-if="error" :message="error" type="error" />

    <LoadingSpinner v-if="loading && !groups.length" />

    <div v-else-if="groups.length === 0" class="empty-state">
      <p>{{ t('groupStandings.empty') }}</p>
    </div>

    <template v-else>
      <p v-if="!hasResults" class="group-standings-hint text-muted">
        {{ t('groupStandings.preliminary') }}
      </p>

      <div class="group-standings-grid">
        <div v-for="block in groups" :key="block.group" class="card group-standings-card">
          <div class="card-header">
            <h3>{{ t('nationalTeams.group') }} {{ block.group }}</h3>
          </div>
          <div class="card-body">
            <GroupStandingsTable :table="block.table" />
            <GroupNextMatches :matches="block.nextMatches" />
            <GroupOutlook :outlook="block.outlook" />
          </div>
        </div>
      </div>

      <section v-if="upcomingGroupMatches.length" class="group-standings-section card">
        <div class="card-header">
          <h2>{{ t('groupStandings.upcomingTitle') }}</h2>
        </div>
        <div class="card-body">
          <div class="upcoming-matches-list">
            <div
              v-for="match in upcomingGroupMatches"
              :key="match.id || match.matchNumber"
              class="upcoming-match-row"
            >
              <span class="upcoming-group">{{ t('nationalTeams.group') }} {{ match.groupName }}</span>
              <span class="upcoming-date">{{ formatDateTime(match.kickoffTime) }}</span>
              <span class="upcoming-teams">
                <TeamLabel :name="match.homeTeam" />
                <span class="upcoming-vs">{{ t('groupStandings.vs') }}</span>
                <TeamLabel :name="match.awayTeam" />
              </span>
            </div>
          </div>
        </div>
      </section>

      <section v-if="knockoutPath.length" class="group-standings-section card">
        <div class="card-header">
          <h2>{{ t('groupStandings.knockoutTitle') }}</h2>
          <p class="text-muted group-standings-section-sub">{{ t('groupStandings.knockoutSubtitle') }}</p>
        </div>
        <div class="card-body">
          <KnockoutPathPreview :path="knockoutPath" />
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import { onSocketEvent } from '../services/socket';
import { useFormatters } from '../composables/useFormatters';
import AlertMessage from '../components/AlertMessage.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import GroupStandingsTable from '../components/GroupStandingsTable.vue';
import GroupNextMatches from '../components/GroupNextMatches.vue';
import GroupOutlook from '../components/GroupOutlook.vue';
import KnockoutPathPreview from '../components/KnockoutPathPreview.vue';
import TeamLabel from '../components/TeamLabel.vue';
import { useFootballTeamStore } from '../stores/footballTeamStore';

const { t } = useI18n();
const { formatDateTime } = useFormatters();
const footballTeamStore = useFootballTeamStore();

const groups = ref([]);
const upcomingGroupMatches = ref([]);
const knockoutPath = ref([]);
const loading = ref(false);
const error = ref('');
let unsub;

const hasResults = computed(() => groups.value.some(
  (block) => block.table.some((row) => row.playedGames > 0),
));

async function loadStandings({ silent = false } = {}) {
  if (!silent) loading.value = true;
  error.value = '';
  try {
    await footballTeamStore.ensureLoaded();
    const { data } = await api.get('/matches/group-standings');
    groups.value = data.groups || [];
    upcomingGroupMatches.value = data.upcomingGroupMatches || [];
    knockoutPath.value = data.knockoutPath || [];
  } catch (err) {
    error.value = err.response?.data?.error || t('groupStandings.loadFailed');
    if (!silent) {
      groups.value = [];
      upcomingGroupMatches.value = [];
      knockoutPath.value = [];
    }
  } finally {
    if (!silent) loading.value = false;
  }
}

function handleMatchUpdate(updated) {
  if (!updated) return;
  const affectsStandings = updated.groupName
    || updated.status === 'finished'
    || updated.status === 'live'
    || updated.status === 'halftime';
  if (affectsStandings) {
    loadStandings({ silent: true });
  }
}

onMounted(async () => {
  await loadStandings();
  unsub = onSocketEvent('match:update', handleMatchUpdate);
});

onUnmounted(() => {
  unsub?.();
});
</script>

<style scoped>
.group-standings-hint {
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.group-standings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.group-standings-card .card-header h3 {
  margin: 0;
  font-size: 1rem;
}

.group-standings-card .card-body {
  padding-top: 0.5rem;
  padding-bottom: 0.75rem;
}

.group-standings-section {
  margin-top: 1.5rem;
}

.group-standings-section h2 {
  margin: 0;
  font-size: 1.1rem;
}

.group-standings-section-sub {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
}

.upcoming-matches-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.upcoming-match-row {
  display: grid;
  grid-template-columns: 4.5rem 9rem 1fr;
  gap: 0.75rem;
  align-items: center;
  font-size: 0.9rem;
}

.upcoming-group {
  font-weight: 600;
  color: var(--color-primary);
}

.upcoming-date {
  color: var(--color-text-muted);
  white-space: nowrap;
}

.upcoming-teams {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.upcoming-vs {
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

@media (max-width: 720px) {
  .group-standings-grid {
    grid-template-columns: 1fr;
  }

  .upcoming-match-row {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }
}
</style>
