<template>
  <LoadingSpinner v-if="loadingTeams" />
  <div v-else class="national-teams-layout">
    <div class="card national-teams-list">
      <div class="card-body">
        <input
          :value="search"
          type="search"
          class="form-control mb-3"
          :placeholder="t('nationalTeams.searchPlaceholder')"
          @input="$emit('update:search', $event.target.value)"
        />
        <div class="national-team-grid">
          <button
            v-for="team in filteredTeams"
            :key="team.id"
            type="button"
            class="national-team-card"
            :class="{ active: selectedTeam?.id === team.id }"
            @click="$emit('select-team', team)"
          >
            <img v-if="team.crest" :src="team.crest" :alt="team.name" class="national-team-crest" loading="lazy" decoding="async" />
            <span v-else class="national-team-crest-fallback">⚽</span>
            <span class="national-team-name">{{ team.name }}</span>
            <span class="national-team-meta">{{ team.squadSize }} {{ t('nationalTeams.players') }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="card national-team-detail">
      <div v-if="!selectedTeam" class="card-body text-muted text-center">
        {{ t('nationalTeams.selectHint') }}
      </div>
      <div v-else class="card-body">
        <div class="national-team-detail-header">
          <img v-if="selectedTeam.crest" :src="selectedTeam.crest" :alt="selectedTeam.name" class="national-team-detail-crest" loading="lazy" decoding="async" />
          <div>
            <h2>{{ selectedTeam.name }}</h2>
            <p v-if="selectedTeam.coach" class="text-muted">
              {{ t('nationalTeams.coach') }}: {{ selectedTeam.coach.name }}
              <span v-if="selectedTeam.coach.nationality">({{ selectedTeam.coach.nationality }})</span>
            </p>
            <p class="text-muted">
              {{ selectedTeam.squad?.length || selectedTeam.squadSize || 0 }} {{ t('nationalTeams.players') }}
            </p>
            <button
              v-if="missingPlayerImages > 0"
              type="button"
              class="btn btn-secondary btn-sm national-team-load-images"
              @click="$emit('load-player-images')"
            >
              {{ resolvingPlayerImages
                ? t('nationalTeams.loadingPlayerImages')
                : t('nationalTeams.loadPlayerImages', { count: missingPlayerImages }) }}
            </button>
            <div
              v-if="resolvingPlayerImages && squadImageProgress.total"
              class="national-team-image-progress"
            >
              <div class="national-team-image-progress__header">
                <span class="national-team-image-progress__count">
                  {{ t('nationalTeams.playerImagesLoadedCount', squadImageProgress) }}
                </span>
                <strong>{{ squadImageProgress.percent }}%</strong>
              </div>
              <div
                class="national-team-image-progress__track"
                role="progressbar"
                :aria-valuenow="squadImageProgress.withImage"
                aria-valuemin="0"
                :aria-valuemax="squadImageProgress.total"
                :aria-label="t('nationalTeams.playerImagesProgressBar')"
              >
                <div
                  class="national-team-image-progress__fill"
                  :style="{ width: `${squadImageProgress.percent}%` }"
                />
              </div>
              <p class="text-muted national-team-image-progress__meta">
                {{ t('nationalTeams.playerImagesProgressMeta', squadImageProgress) }}
              </p>
            </div>
          </div>
        </div>
        <LoadingSpinner v-if="loadingTeamDetail && !squadGroups.length" />
        <p v-else-if="!loadingTeamDetail && !squadGroups.length" class="text-muted text-center">
          {{ t('nationalTeams.squadEmpty') }}
        </p>
        <div v-for="group in squadGroups" :key="group.position" class="squad-group">
          <h3>{{ positionLabel(group.position) }}</h3>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{{ t('nationalTeams.player') }}</th>
                  <th>{{ t('nationalTeams.nationality') }}</th>
                  <th>{{ t('nationalTeams.birthDate') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="player in group.players" :key="player.id">
                  <td>
                    <div class="player-name-cell">
                      <PlayerAvatar
                        :image-url="player.imageUrl"
                        :name="player.name"
                        :attribution-text="player.imageAttribution"
                        :image-source="player.imageSource"
                        size="xs"
                      />
                      <strong>{{ player.name }}</strong>
                    </div>
                  </td>
                  <td>{{ player.nationality || '–' }}</td>
                  <td>{{ formatBirthDate(player.dateOfBirth) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import LoadingSpinner from '../LoadingSpinner.vue';
import PlayerAvatar from '../PlayerAvatar.vue';

defineProps({
  loadingTeams: { type: Boolean, default: false },
  loadingTeamDetail: { type: Boolean, default: false },
  resolvingPlayerImages: { type: Boolean, default: false },
  search: { type: String, default: '' },
  filteredTeams: { type: Array, default: () => [] },
  selectedTeam: { type: Object, default: null },
  squadGroups: { type: Array, default: () => [] },
  missingPlayerImages: { type: Number, default: 0 },
  squadImageProgress: { type: Object, required: true },
  positionLabel: { type: Function, required: true },
  formatBirthDate: { type: Function, required: true },
});

defineEmits(['update:search', 'select-team', 'load-player-images']);

const { t } = useI18n();
</script>

<style scoped>
.national-teams-layout {
  display: grid;
  grid-template-columns: minmax(260px, 340px) 1fr;
  gap: 1rem;
  align-items: start;
}

.national-team-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 70vh;
  overflow-y: auto;
}

.national-team-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.national-team-card.active,
.national-team-card:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  box-shadow: var(--glow-primary);
}

.national-team-crest { width: 28px; height: 28px; object-fit: contain; }
.national-team-crest-fallback { width: 28px; text-align: center; }
.national-team-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-text);
}
.national-team-meta { font-size: 0.75rem; color: var(--color-text-muted); }

.national-team-card.active .national-team-name,
.national-team-card:hover .national-team-name {
  color: var(--color-text);
}

.national-team-detail-header {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.5rem;
}

.national-team-detail-crest { width: 72px; height: 72px; object-fit: contain; }
.national-team-load-images { margin-top: 0.75rem; }
.squad-group + .squad-group { margin-top: 1.25rem; }
.squad-group h3 { margin-bottom: 0.5rem; font-size: 1rem; }

.player-name-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.national-team-image-progress {
  margin-top: 0.75rem;
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-primary-soft);
}

.national-team-image-progress__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.national-team-image-progress__header strong {
  color: var(--color-primary);
}

.national-team-image-progress__count {
  font-weight: 600;
}

.national-team-image-progress__track {
  height: 0.5rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.national-team-image-progress__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-primary-dark), var(--color-primary));
  transition: width 0.4s ease;
}

.national-team-image-progress__meta {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
}

@media (max-width: 900px) {
  .national-teams-layout { grid-template-columns: 1fr; }
}
</style>
