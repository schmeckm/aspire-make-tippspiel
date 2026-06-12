<template>
  <div class="leaderboard-wrapper">
    <div class="table-wrapper leaderboard-desktop">
      <table>
        <thead>
          <tr>
            <th>{{ t('leaderboard.rank') }}</th>
            <th v-if="showMovement">Δ</th>
            <th>{{ t('leaderboard.name') }}</th>
            <th>{{ t('leaderboard.team') }}</th>
            <th v-if="!compact">{{ t('leaderboard.matchPts') }}</th>
            <th v-if="!compact">{{ t('leaderboard.bonus') }}</th>
            <th>{{ t('leaderboard.total') }}</th>
            <th v-if="!compact">{{ t('leaderboard.correct') }}</th>
            <th v-if="!compact">{{ t('leaderboard.exact') }}</th>
            <th v-if="!compact">{{ t('leaderboard.goalDiff') }}</th>
            <th v-if="!compact">{{ t('leaderboard.tendency') }}</th>
            <th v-if="!compact">{{ t('leaderboard.tips') }}</th>
            <th v-if="!compact">{{ t('leaderboard.completion') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in entries"
            :key="entry.userId"
            :class="{ 'leaderboard-row-current': entry.userId === currentUserId }"
          >
            <td :class="rankClass(entry.rank)">
              <span class="rank-cell">
                <RankTrophyIcon v-if="showRankTrophy(entry.rank)" :rank="entry.rank" />
                <span>{{ entry.rank }}</span>
              </span>
            </td>
            <td v-if="showMovement">
              <span v-if="entry.rankMovement > 0" class="rank-up">▲{{ entry.rankMovement }}</span>
              <span v-else-if="entry.rankMovement < 0" class="rank-down">▼{{ Math.abs(entry.rankMovement) }}</span>
              <span v-else class="text-muted">–</span>
            </td>
            <td>
              <div class="leaderboard-name-cell">
                <UserAvatar
                  :image-url="entry.imageUrl"
                  :avatar-color="entry.avatarColor"
                  :avatar-emoji="entry.avatarEmoji"
                  :first-name="entry.firstName"
                  :last-name="entry.lastName"
                  size="xs"
                />
                <strong>{{ entry.firstName }} {{ entry.lastName }}</strong>
                <span v-if="entry.userId === currentUserId" class="badge badge-info">{{ t('leaderboard.you') }}</span>
              </div>
            </td>
            <td>{{ entry.teamName || '–' }}</td>
            <td v-if="!compact">{{ formatPoints(entry.matchPoints ?? entry.totalPoints) }}</td>
            <td v-if="!compact">{{ formatPoints(entry.bonusPoints ?? 0) }}</td>
            <td><strong>{{ formatPoints(entry.totalPoints) }}</strong></td>
            <td v-if="!compact">{{ formatNumber(correctTips(entry)) }}</td>
            <td v-if="!compact">{{ formatNumber(entry.exactResults) }}</td>
            <td v-if="!compact">{{ formatNumber(entry.goalDifferences) }}</td>
            <td v-if="!compact">{{ formatNumber(entry.tendencies) }}</td>
            <td v-if="!compact">{{ formatNumber(entry.submittedPredictions) }}</td>
            <td v-if="!compact">{{ entry.completionPercentage != null ? `${formatPercent(entry.completionPercentage)}%` : '–' }}</td>
          </tr>
          <tr v-if="entries.length === 0">
            <td :colspan="colspan" class="text-center text-muted">{{ t('leaderboard.empty') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="leaderboard-mobile">
      <div
        v-for="entry in entries"
        :key="`card-${entry.userId}`"
        :class="['leaderboard-card', { 'leaderboard-card-current': entry.userId === currentUserId }]"
      >
        <div class="leaderboard-card-rank" :class="rankClass(entry.rank)">
          <span class="rank-cell">
            <RankTrophyIcon v-if="showRankTrophy(entry.rank)" :rank="entry.rank" />
            <span>#{{ entry.rank }}</span>
          </span>
        </div>
        <div class="leaderboard-card-body">
          <div class="leaderboard-name-cell">
            <UserAvatar
              :image-url="entry.imageUrl"
              :avatar-color="entry.avatarColor"
              :avatar-emoji="entry.avatarEmoji"
              :first-name="entry.firstName"
              :last-name="entry.lastName"
              size="xs"
            />
            <strong>{{ entry.firstName }} {{ entry.lastName }}</strong>
          </div>
          <div class="text-muted">{{ entry.teamName || t('common.noTeam') }}</div>
          <div class="leaderboard-card-points">
            <span>{{ t('leaderboard.total') }}: <strong>{{ formatPoints(entry.totalPoints) }}</strong></span>
            <span v-if="!compact">{{ t('leaderboard.matchPts') }}: {{ formatPoints(entry.matchPoints ?? 0) }}</span>
          </div>
        </div>
      </div>
      <p v-if="entries.length === 0" class="text-center text-muted">{{ t('leaderboard.empty') }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFormatters } from '../composables/useFormatters';
import RankTrophyIcon from './RankTrophyIcon.vue';
import UserAvatar from './UserAvatar.vue';

const props = defineProps({
  entries: { type: Array, default: () => [] },
  showMovement: { type: Boolean, default: true },
  currentUserId: { type: Number, default: null },
  compact: { type: Boolean, default: false },
});

const { t } = useI18n();
const { formatNumber, formatPoints, formatPercent } = useFormatters();

const colspan = computed(() => {
  let cols = props.compact ? 4 : 12;
  if (props.showMovement) cols += 1;
  return cols;
});

function correctTips(entry) {
  return Number(entry?.exactResults || 0)
    + Number(entry?.goalDifferences || 0)
    + Number(entry?.tendencies || 0);
}

function rankClass(rank) {
  const n = Number(rank);
  if (n >= 1 && n <= 3) return `rank-${n}`;
  return '';
}

function showRankTrophy(rank) {
  const n = Number(rank);
  return n >= 1 && n <= 3;
}
</script>

<style scoped>
.rank-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.leaderboard-name-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rank-up { color: var(--color-primary); font-weight: 700; }
.rank-down { color: var(--color-danger); font-weight: 700; }

.leaderboard-row-current {
  background: var(--color-primary-soft);
}

.leaderboard-mobile { display: none; }

@media (max-width: 768px) {
  .leaderboard-desktop { display: none; }
  .leaderboard-mobile { display: flex; flex-direction: column; gap: 0.75rem; }
}

.leaderboard-card {
  display: flex;
  gap: 0.75rem;
  padding: 0.875rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--glow-card);
}

.leaderboard-card-current {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  box-shadow: var(--glow-primary);
}

.leaderboard-card-rank {
  font-size: 1.25rem;
  font-weight: 700;
  min-width: 2.5rem;
}

.leaderboard-card-points {
  display: flex;
  gap: 1rem;
  margin-top: 0.25rem;
  font-size: 0.875rem;
}
</style>
