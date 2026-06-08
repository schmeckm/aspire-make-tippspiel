<template>
  <LoadingSpinner v-if="loading" />
  <div v-else-if="standings.length === 0" class="empty-state">
    <p>{{ t('nationalTeams.standingsEmpty') }}</p>
  </div>
  <div v-else class="standings-stack">
    <div v-for="(block, idx) in standings" :key="idx" class="card mb-3">
      <div class="card-header">
        <h3>{{ standingTitle(block) }}</h3>
      </div>
      <div class="card-body">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{{ t('nationalTeams.team') }}</th>
                <th>{{ t('nationalTeams.played') }}</th>
                <th>{{ t('nationalTeams.wdl') }}</th>
                <th>{{ t('nationalTeams.goals') }}</th>
                <th>{{ t('nationalTeams.points') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in block.table" :key="row.team.id || row.position">
                <td>{{ row.position }}</td>
                <td>
                  <span class="standing-team">
                        <img v-if="row.team.crest" :src="row.team.crest" :alt="row.team.name" class="standing-crest" loading="lazy" decoding="async" />
                    {{ row.team.name }}
                  </span>
                </td>
                <td>{{ row.playedGames }}</td>
                <td>{{ row.won }}-{{ row.draw }}-{{ row.lost }}</td>
                <td>{{ row.goalsFor }}:{{ row.goalsAgainst }}</td>
                <td><strong>{{ row.points }}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import LoadingSpinner from '../LoadingSpinner.vue';

defineProps({
  loading: { type: Boolean, default: false },
  standings: { type: Array, default: () => [] },
  standingTitle: { type: Function, required: true },
});

const { t } = useI18n();
</script>

<style scoped>
.standing-team {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.standing-crest {
  width: 20px;
  height: 20px;
  object-fit: contain;
}
</style>
