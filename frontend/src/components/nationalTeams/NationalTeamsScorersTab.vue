<template>
  <LoadingSpinner v-if="loading" />
  <div v-else-if="scorers.length === 0" class="empty-state">
    <p>{{ t('nationalTeams.scorersEmpty') }}</p>
  </div>
  <div v-else class="card">
    <div class="card-body">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{{ t('nationalTeams.player') }}</th>
              <th>{{ t('nationalTeams.team') }}</th>
              <th>{{ t('nationalTeams.goals') }}</th>
              <th>{{ t('nationalTeams.assists') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(entry, idx) in scorers" :key="entry.player.id || idx">
              <td>{{ idx + 1 }}</td>
              <td>
                <div class="player-name-cell">
                  <PlayerAvatar
                    :image-url="entry.player.imageUrl"
                    :name="entry.player.name"
                    :attribution-text="entry.player.imageAttribution"
                    :image-source="entry.player.imageSource"
                    size="xs"
                  />
                  <strong>{{ entry.player.name }}</strong>
                </div>
              </td>
              <td>
                <span class="standing-team">
                  <img v-if="entry.team.crest" :src="entry.team.crest" :alt="entry.team.name" class="standing-crest" loading="lazy" decoding="async" />
                  {{ entry.team.name }}
                </span>
              </td>
              <td>{{ entry.goals }}</td>
              <td>{{ entry.assists ?? '–' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import LoadingSpinner from '../LoadingSpinner.vue';
import PlayerAvatar from '../PlayerAvatar.vue';

defineProps({
  loading: { type: Boolean, default: false },
  scorers: { type: Array, default: () => [] },
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

.player-name-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
