<template>
  <div class="table-wrapper">
    <table class="group-standings-table">
      <thead>
        <tr>
          <th class="col-pos">#</th>
          <th>{{ t('nationalTeams.team') }}</th>
          <th class="col-num">{{ t('nationalTeams.played') }}</th>
          <th class="col-num">{{ t('nationalTeams.wdl') }}</th>
          <th class="col-num">{{ t('nationalTeams.goals') }}</th>
          <th class="col-pts">{{ t('nationalTeams.points') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in table"
          :key="row.team.name"
          :class="{ qualified: highlightQualifiers && row.position <= 2 }"
        >
          <td class="col-pos">{{ row.position }}</td>
          <td>
            <span class="standing-team">
              <img
                v-if="crestFor(row.team.name)"
                :src="crestFor(row.team.name)"
                :alt="row.team.name"
                class="standing-crest"
                loading="lazy"
                decoding="async"
              />
              <span>{{ displayName(row.team.name) }}</span>
            </span>
          </td>
          <td class="col-num">{{ row.playedGames }}</td>
          <td class="col-num">{{ row.won }}-{{ row.draw }}-{{ row.lost }}</td>
          <td class="col-num">{{ row.goalsFor }}:{{ row.goalsAgainst }}</td>
          <td class="col-pts"><strong>{{ row.points }}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { useFootballTeamStore } from '../stores/footballTeamStore';

defineProps({
  table: { type: Array, required: true },
  highlightQualifiers: { type: Boolean, default: true },
});

const { t } = useI18n();
const footballTeamStore = useFootballTeamStore();

function crestFor(teamName) {
  return footballTeamStore.crestFor(teamName);
}

function displayName(teamName) {
  return footballTeamStore.canonicalFor(teamName);
}
</script>

<style scoped>
.group-standings-table {
  width: 100%;
}

.col-pos {
  width: 2rem;
  text-align: center;
}

.col-num {
  text-align: center;
  white-space: nowrap;
}

.col-pts {
  text-align: center;
  width: 3rem;
}

.standing-team {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.standing-crest {
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex-shrink: 0;
}

tbody tr.qualified td {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
}
</style>
