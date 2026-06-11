<template>
  <div>
    <div class="page-header">
      <h1>{{ t('teamPerformance.title') }}</h1>
      <span class="text-muted">{{ t('teamPerformance.subtitle') }}</span>
    </div>

    <div v-if="!teamId" class="card">
      <div class="card-body">
        <p class="text-muted mb-0">
          {{ t('teamPerformance.noTeam') }}
          <router-link to="/profile">{{ t('teamPerformance.goToProfile') }}</router-link>
        </p>
      </div>
    </div>

    <template v-else>
      <LoadingSpinner v-if="loading" />
      <ErrorState v-else-if="error" :message="error" @retry="loadData" />

      <template v-else>
        <div v-if="teamEntry" class="card team-performance-header">
          <div class="card-body">
            <div class="team-performance-header-row">
              <TeamAvatar :image-url="teamEntry.imageUrl" :name="teamEntry.teamName" size="md" />
              <div class="team-performance-header-title">
                <strong class="team-performance-team-name">{{ teamEntry.teamName }}</strong>
                <div class="text-muted">
                  {{ t('teamPerformance.teamRank', { rank: teamEntry.rank }) }}
                  ·
                  {{ t('teamPerformance.memberCount', { count: teamEntry.userCount }) }}
                </div>
              </div>
              <span class="badge badge-info">#{{ teamEntry.rank }}</span>
            </div>

            <div class="team-performance-stats-grid">
              <div class="stat-card">
                <div class="stat-value">{{ formatPoints(teamEntry.averagePoints) }}</div>
                <div class="stat-label">{{ t('teamPerformance.avgPoints') }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ formatPoints(teamEntry.totalPoints) }}</div>
                <div class="stat-label">{{ t('teamPerformance.totalPoints') }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ formatNumber(teamEntry.exactResults) }}</div>
                <div class="stat-label">{{ t('teamPerformance.exactTips') }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ formatNumber(teamEntry.completionRate) }}%</div>
                <div class="stat-label">{{ t('teamPerformance.completion') }}</div>
              </div>
            </div>

            <p class="text-muted team-performance-hint mb-0">
              {{ t('teamPerformance.privacyHint') }}
            </p>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-header">
              <h3>⭐ {{ t('teamPerformance.highlightsTitle') }}</h3>
            </div>
            <div class="card-body">
              <ul v-if="highlights.length" class="highlights-list">
                <li v-for="h in highlights" :key="h.key">
                  <strong>{{ h.title }}</strong>
                  <div class="text-muted">{{ h.text }}</div>
                </li>
              </ul>
              <p v-else class="text-muted mb-0">{{ t('teamPerformance.noHighlights') }}</p>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3>👥 {{ t('teamPerformance.membersTitle') }}</h3>
            </div>
            <div class="card-body">
              <div class="table-wrapper team-performance-desktop">
                <table>
                  <thead>
                    <tr>
                      <th>{{ t('leaderboard.rank') }}</th>
                      <th>{{ t('leaderboard.name') }}</th>
                      <th>{{ t('teamPerformance.total') }}</th>
                      <th>{{ t('teamPerformance.correct') }}</th>
                      <th>{{ t('leaderboard.exact') }}</th>
                      <th>{{ t('leaderboard.tendency') }}</th>
                      <th>{{ t('leaderboard.tips') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="m in members"
                      :key="m.userId"
                      :class="{ 'team-performance-row-current': m.userId === authStore.user?.id }"
                    >
                      <td>{{ m.rank }}</td>
                      <td>
                        <div class="member-name-cell">
                          <UserAvatar
                            :image-url="m.imageUrl"
                            :avatar-color="m.avatarColor"
                            :avatar-emoji="m.avatarEmoji"
                            :first-name="m.firstName"
                            :last-name="m.lastName"
                            size="xs"
                          />
                          <strong>{{ m.firstName }} {{ m.lastName }}</strong>
                          <span v-if="m.userId === authStore.user?.id" class="badge badge-info">{{ t('leaderboard.you') }}</span>
                        </div>
                      </td>
                      <td><strong>{{ formatPoints(m.totalPoints) }}</strong></td>
                      <td>{{ formatNumber(m.correctTips) }}</td>
                      <td>{{ formatNumber(m.exactResults) }}</td>
                      <td>{{ formatNumber(m.tendencies) }}</td>
                      <td>{{ formatNumber(m.submittedPredictions) }}</td>
                    </tr>
                    <tr v-if="members.length === 0">
                      <td colspan="7" class="text-center text-muted">{{ t('teamPerformance.empty') }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="team-performance-mobile">
                <article v-for="m in members" :key="`mobile-${m.userId}`" class="member-card">
                  <div class="member-card-header">
                    <span class="badge badge-info">#{{ m.rank }}</span>
                    <div class="member-name-cell">
                      <UserAvatar
                        :image-url="m.imageUrl"
                        :avatar-color="m.avatarColor"
                        :avatar-emoji="m.avatarEmoji"
                        :first-name="m.firstName"
                        :last-name="m.lastName"
                        size="xs"
                      />
                      <strong>{{ m.firstName }} {{ m.lastName }}</strong>
                    </div>
                  </div>
                  <dl class="member-card-fields">
                    <dt>{{ t('teamPerformance.total') }}</dt><dd><strong>{{ formatPoints(m.totalPoints) }}</strong></dd>
                    <dt>{{ t('teamPerformance.correct') }}</dt><dd>{{ formatNumber(m.correctTips) }}</dd>
                    <dt>{{ t('leaderboard.exact') }}</dt><dd>{{ formatNumber(m.exactResults) }}</dd>
                    <dt>{{ t('leaderboard.tendency') }}</dt><dd>{{ formatNumber(m.tendencies) }}</dd>
                    <dt>{{ t('leaderboard.tips') }}</dt><dd>{{ formatNumber(m.submittedPredictions) }}</dd>
                  </dl>
                </article>
                <p v-if="members.length === 0" class="text-center text-muted mb-0">{{ t('teamPerformance.empty') }}</p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import ErrorState from '../components/ErrorState.vue';
import TeamAvatar from '../components/TeamAvatar.vue';
import UserAvatar from '../components/UserAvatar.vue';
import { useAuthStore } from '../stores/authStore';
import { useFormatters } from '../composables/useFormatters';

const { t } = useI18n();
const authStore = useAuthStore();
const { formatNumber, formatPoints } = useFormatters();

const loading = ref(true);
const error = ref('');
const teamRanking = ref([]);
const membersRaw = ref([]);

const teamId = computed(() => authStore.user?.teamId || null);

const teamEntry = computed(() => {
  if (!teamId.value) return null;
  return teamRanking.value.find((e) => Number(e.teamId) === Number(teamId.value)) || null;
});

const members = computed(() => membersRaw.value.map((m) => ({
  ...m,
  correctTips: Number(m.exactResults || 0) + Number(m.goalDifferences || 0) + Number(m.tendencies || 0),
})));

const highlights = computed(() => {
  if (!members.value.length) return [];
  const byExact = [...members.value].sort((a, b) => b.exactResults - a.exactResults || b.totalPoints - a.totalPoints);
  const byCorrect = [...members.value].sort((a, b) => b.correctTips - a.correctTips || b.totalPoints - a.totalPoints);
  const byPoints = [...members.value].sort((a, b) => b.totalPoints - a.totalPoints);

  const bestPoints = byPoints[0];
  const bestExact = byExact[0];
  const bestCorrect = byCorrect[0];

  const out = [];
  if (bestPoints) {
    out.push({
      key: 'bestPoints',
      title: t('teamPerformance.highlightBestPointsTitle'),
      text: t('teamPerformance.highlightBestPointsText', {
        name: `${bestPoints.firstName} ${bestPoints.lastName}`,
        points: formatPoints(bestPoints.totalPoints),
      }),
    });
  }
  if (bestExact) {
    out.push({
      key: 'bestExact',
      title: t('teamPerformance.highlightBestExactTitle'),
      text: t('teamPerformance.highlightBestExactText', {
        name: `${bestExact.firstName} ${bestExact.lastName}`,
        count: formatNumber(bestExact.exactResults),
      }),
    });
  }
  if (bestCorrect) {
    out.push({
      key: 'bestCorrect',
      title: t('teamPerformance.highlightBestCorrectTitle'),
      text: t('teamPerformance.highlightBestCorrectText', {
        name: `${bestCorrect.firstName} ${bestCorrect.lastName}`,
        count: formatNumber(bestCorrect.correctTips),
      }),
    });
  }
  return out;
});

async function loadData() {
  if (!teamId.value) {
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const [rankRes, membersRes] = await Promise.all([
      api.get('/leaderboard/team-ranking'),
      api.get('/leaderboard', { params: { teamId: teamId.value, filter: 'overall', sortBy: 'total' } }),
    ]);
    teamRanking.value = Array.isArray(rankRes.data) ? rankRes.data : [];
    membersRaw.value = Array.isArray(membersRes.data) ? membersRes.data : [];
  } catch (err) {
    error.value = err.response?.data?.error || t('teamPerformance.loadFailed');
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped>
.team-performance-header-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 1rem;
}

.team-performance-header-title {
  flex: 1;
}

.team-performance-team-name {
  font-size: 1.15rem;
}

.team-performance-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.team-performance-hint {
  font-size: 0.9rem;
}

.highlights-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.member-name-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.team-performance-row-current {
  background: var(--color-primary-soft);
}

.team-performance-mobile {
  display: none;
  flex-direction: column;
  gap: 0.75rem;
}

.member-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.875rem;
  background: var(--color-surface);
}

.member-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.member-card-fields {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 0.75rem;
  margin: 0;
}

.member-card-fields dt {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.member-card-fields dd {
  margin: 0;
}

@media (max-width: 768px) {
  .team-performance-desktop {
    display: none;
  }

  .team-performance-mobile {
    display: flex;
  }

  .team-performance-stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
