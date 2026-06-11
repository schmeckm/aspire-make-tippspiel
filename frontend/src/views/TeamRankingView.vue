<template>
  <div>
    <div class="page-header">
      <h1>{{ t('teamRanking.title') }}</h1>
      <button
        v-if="authStore.user?.teamId && ranking.length"
        class="btn btn-secondary btn-sm"
        type="button"
        @click="scrollToMyTeam"
      >
        {{ t('teamRanking.jumpToMyTeam') }}
      </button>
    </div>

    <LoadingSpinner v-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="loadRanking" />

    <div v-else class="card">
      <div class="card-body">
        <div class="table-wrapper team-ranking-desktop">
          <table>
            <thead>
              <tr>
                <th>{{ t('leaderboard.rank') }}</th>
                <th>{{ t('teamRanking.team') }}</th>
                <th>{{ t('teamRanking.members') }}</th>
                <th>{{ t('teamRanking.totalPoints') }}</th>
                <th>{{ t('teamRanking.avgPoints') }}</th>
                <th>{{ t('teamRanking.exactTips') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="team in ranking"
                :key="team.teamId"
                :class="{ 'my-team-row': isMyTeam(team) }"
              >
                <td :id="rowId(team.teamId, 'desktop')" :class="rankClass(team.rank)">
                  <span class="rank-cell">
                    <RankTrophyIcon v-if="showRankTrophy(team.rank)" :rank="team.rank" />
                    <span>{{ team.rank }}</span>
                  </span>
                </td>
                <td>
                  <div class="team-name-cell">
                    <TeamAvatar :image-url="team.imageUrl" :name="team.teamName" size="sm" />
                    <strong>{{ team.teamName }}</strong>
                    <span v-if="isMyTeam(team)" class="badge badge-info">{{ t('teamRanking.myTeam') }}</span>
                  </div>
                </td>
                <td>{{ formatNumber(team.userCount) }}</td>
                <td>{{ formatPoints(team.totalPoints) }}</td>
                <td><strong>{{ formatPoints(team.averagePoints) }}</strong></td>
                <td>{{ formatNumber(team.exactResults) }}</td>
              </tr>
              <tr v-if="ranking.length === 0">
                <td colspan="6" class="text-center text-muted">{{ t('teamRanking.empty') }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="team-ranking-mobile">
          <article
            v-for="team in ranking"
            :id="rowId(team.teamId, 'mobile')"
            :key="`mobile-${team.teamId}`"
            class="team-ranking-card"
            :class="{ 'my-team-card': isMyTeam(team) }"
          >
            <div class="team-ranking-card-header">
              <span :class="rankClass(team.rank)">#{{ team.rank }}</span>
              <div class="team-name-cell">
                <TeamAvatar :image-url="team.imageUrl" :name="team.teamName" size="sm" />
                <strong>{{ team.teamName }}</strong>
                <span v-if="isMyTeam(team)" class="badge badge-info">{{ t('teamRanking.myTeam') }}</span>
              </div>
            </div>
            <dl class="team-ranking-card-fields">
              <dt>{{ t('teamRanking.members') }}</dt><dd>{{ formatNumber(team.userCount) }}</dd>
              <dt>{{ t('teamRanking.totalPoints') }}</dt><dd>{{ formatPoints(team.totalPoints) }}</dd>
              <dt>{{ t('teamRanking.avgPoints') }}</dt><dd><strong>{{ formatPoints(team.averagePoints) }}</strong></dd>
              <dt>{{ t('teamRanking.exactTips') }}</dt><dd>{{ formatNumber(team.exactResults) }}</dd>
            </dl>
          </article>
          <p v-if="ranking.length === 0" class="text-center text-muted">{{ t('teamRanking.empty') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import ErrorState from '../components/ErrorState.vue';
import RankTrophyIcon from '../components/RankTrophyIcon.vue';
import TeamAvatar from '../components/TeamAvatar.vue';
import { useFormatters } from '../composables/useFormatters';
import { useAuthStore } from '../stores/authStore';

const { t } = useI18n();
const { formatNumber, formatPoints } = useFormatters();
const authStore = useAuthStore();

const ranking = ref([]);
const loading = ref(true);
const error = ref('');

function rankClass(rank) {
  const n = Number(rank);
  if (n >= 1 && n <= 3) return `rank-${n}`;
  return '';
}

function showRankTrophy(rank) {
  const n = Number(rank);
  return n >= 1 && n <= 3;
}

function isMyTeam(team) {
  return !!authStore.user?.teamId && team?.teamId === authStore.user.teamId;
}

function rowId(teamId, variant = 'desktop') {
  return `team-ranking-${variant}-${teamId}`;
}

function scrollToMyTeam() {
  const teamId = authStore.user?.teamId;
  if (!teamId) return;
  const desktopEl = document.getElementById(rowId(teamId, 'desktop'));
  const mobileEl = document.getElementById(rowId(teamId, 'mobile'));

  const isVisible = (el) => !!el && el.getClientRects().length > 0;
  let target = null;
  if (isVisible(mobileEl)) target = mobileEl;
  else if (isVisible(desktopEl)) target = desktopEl;
  if (!target) return;

  const getScrollParent = (el) => {
    let node = el?.parentElement || null;
    while (node) {
      const style = globalThis.getComputedStyle(node);
      const overflowY = style.overflowY;
      const isScrollable = (overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight;
      if (isScrollable) return node;
      node = node.parentElement;
    }
    return null;
  };

  const scrollParent = getScrollParent(target);
  if (!scrollParent) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const parentRect = scrollParent.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const currentTop = scrollParent.scrollTop;
  const targetTopInParent = (targetRect.top - parentRect.top) + currentTop;
  const centeredTop = targetTopInParent - (scrollParent.clientHeight / 2) + (targetRect.height / 2);
  scrollParent.scrollTo({ top: centeredTop, behavior: 'smooth' });
}

async function loadRanking() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/leaderboard/team-ranking');
    ranking.value = data;
  } catch (err) {
    error.value = err.response?.data?.error || t('teamRanking.loadFailed');
  } finally {
    loading.value = false;
  }
}

onMounted(loadRanking);
</script>

<style scoped>
.rank-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.team-name-cell {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.my-team-row td {
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.my-team-card {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 25%, transparent);
}

.team-ranking-mobile {
  display: none;
}

.team-ranking-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.875rem;
  background: var(--color-surface);
}

.team-ranking-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.team-ranking-card-fields {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 0.75rem;
  margin: 0;
}

.team-ranking-card-fields dt {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.team-ranking-card-fields dd {
  margin: 0;
}

@media (max-width: 768px) {
  .team-ranking-desktop {
    display: none;
  }

  .team-ranking-mobile {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
}
</style>
