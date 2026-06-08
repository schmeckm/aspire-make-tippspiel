<template>
  <div class="admin-favorites">
    <div class="page-header">
      <div>
        <h1>{{ t('adminPages.favorites.title') }}</h1>
        <p v-if="!loading" class="page-subtitle">{{ t('adminPages.favorites.subtitle') }}</p>
      </div>
    </div>

    <ErrorState v-if="loadError" :message="loadError" @retry="loadFavorites" />

    <LoadingSpinner v-if="loading" />

    <template v-else>
      <div class="stats-grid mb-2">
        <div class="stat-card">
          <div class="stat-value">{{ data.summary.withTopScorerPick }}</div>
          <div class="stat-label">{{ t('adminPages.favorites.stats.withTopScorer') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ data.summary.uniqueTopScorerPicks }}</div>
          <div class="stat-label">{{ t('adminPages.favorites.stats.uniquePlayers') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ data.summary.withFavoriteTeam }}</div>
          <div class="stat-label">{{ t('adminPages.favorites.stats.withFavoriteTeam') }}</div>
        </div>
        <div class="stat-card accent">
          <div class="stat-value">{{ data.summary.mostPopularPlayer || '–' }}</div>
          <div class="stat-label">{{ t('adminPages.favorites.stats.mostPopularPlayer') }}</div>
        </div>
      </div>

      <div class="filter-bar">
        <input
          v-model="search"
          type="search"
          class="form-control admin-favorites-search"
          :placeholder="t('adminPages.favorites.searchPlaceholder')"
        />
      </div>

      <div class="card mb-2">
        <div class="card-header">
          <h3>{{ t('adminPages.favorites.topScorerSection') }}</h3>
          <span class="text-muted">{{ t('adminPages.favorites.pickCount', { count: data.summary.withTopScorerPick }) }}</span>
        </div>
        <div class="card-body card-body-table">
          <div class="table-wrapper">
            <table class="admin-favorites-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{{ t('adminPages.favorites.columns.player') }}</th>
                  <th>{{ t('adminPages.favorites.columns.nationalTeam') }}</th>
                  <th>{{ t('adminPages.favorites.columns.picks') }}</th>
                  <th>{{ t('adminPages.favorites.columns.share') }}</th>
                  <th>{{ t('adminPages.favorites.columns.users') }}</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(pick, index) in filteredTopScorerPicks" :key="pickKey(pick)">
                  <tr
                    class="admin-favorites-row"
                    :class="{ expanded: expandedKey === pickKey(pick) }"
                    @click="toggleExpanded(pickKey(pick))"
                  >
                    <td class="admin-favorites-rank">{{ index + 1 }}</td>
                    <td>
                      <div class="admin-favorites-player">
                        <PlayerAvatar
                          :image-url="pick.imageUrl"
                          :name="pick.playerName || '?'"
                          :image-source="pick.imageSource"
                          size="sm"
                        />
                        <strong>{{ pick.playerName || '–' }}</strong>
                      </div>
                    </td>
                    <td>
                      <TeamFlag v-if="pick.teamName" :name="pick.teamName" inline />
                      <span v-else class="text-muted">–</span>
                    </td>
                    <td>
                      <span class="badge badge-info">{{ pick.pickCount }}</span>
                    </td>
                    <td>
                      <div class="admin-favorites-share">
                        <div class="admin-favorites-bar">
                          <div class="admin-favorites-bar-fill" :style="{ width: `${pick.percentage}%` }" />
                        </div>
                        <span>{{ pick.percentage }}%</span>
                      </div>
                    </td>
                    <td class="text-muted admin-favorites-toggle">
                      {{ t('adminPages.favorites.userCount', { count: pick.users.length }) }}
                      <span class="admin-favorites-chevron">{{ expandedKey === pickKey(pick) ? '▾' : '▸' }}</span>
                    </td>
                  </tr>
                  <tr v-if="expandedKey === pickKey(pick)" class="admin-favorites-detail-row">
                    <td colspan="6">
                      <div class="admin-favorites-users">
                        <div
                          v-for="user in pick.users"
                          :key="user.id"
                          class="admin-favorites-user-chip"
                        >
                          <UserAvatar
                            :first-name="user.firstName"
                            :last-name="user.lastName"
                            size="xs"
                          />
                          <span>{{ user.firstName }} {{ user.lastName }}</span>
                          <span v-if="user.departmentTeam" class="text-muted">· {{ user.departmentTeam }}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>
                <tr v-if="filteredTopScorerPicks.length === 0">
                  <td colspan="6" class="text-center text-muted admin-favorites-empty">
                    {{ search ? t('adminPages.favorites.emptyFiltered') : t('adminPages.favorites.emptyTopScorer') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>{{ t('adminPages.favorites.favoriteTeamSection') }}</h3>
          <span class="text-muted">{{ t('adminPages.favorites.pickCount', { count: data.summary.withFavoriteTeam }) }}</span>
        </div>
        <div class="card-body card-body-table">
          <div class="table-wrapper">
            <table class="admin-favorites-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{{ t('adminPages.favorites.columns.team') }}</th>
                  <th>{{ t('adminPages.favorites.columns.picks') }}</th>
                  <th>{{ t('adminPages.favorites.columns.share') }}</th>
                  <th>{{ t('adminPages.favorites.columns.users') }}</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(team, index) in filteredFavoriteTeams" :key="teamKey(team)">
                  <tr
                    class="admin-favorites-row"
                    :class="{ expanded: expandedKey === teamKey(team) }"
                    @click="toggleExpanded(teamKey(team))"
                  >
                    <td class="admin-favorites-rank">{{ index + 1 }}</td>
                    <td>
                      <TeamFlag v-if="team.teamName" :name="team.teamName" />
                      <span v-else class="text-muted">–</span>
                    </td>
                    <td>
                      <span class="badge badge-info">{{ team.pickCount }}</span>
                    </td>
                    <td>
                      <div class="admin-favorites-share">
                        <div class="admin-favorites-bar">
                          <div class="admin-favorites-bar-fill admin-favorites-bar-fill-team" :style="{ width: `${team.percentage}%` }" />
                        </div>
                        <span>{{ team.percentage }}%</span>
                      </div>
                    </td>
                    <td class="text-muted admin-favorites-toggle">
                      {{ t('adminPages.favorites.userCount', { count: team.users.length }) }}
                      <span class="admin-favorites-chevron">{{ expandedKey === teamKey(team) ? '▾' : '▸' }}</span>
                    </td>
                  </tr>
                  <tr v-if="expandedKey === teamKey(team)" class="admin-favorites-detail-row">
                    <td colspan="5">
                      <div class="admin-favorites-users">
                        <div
                          v-for="user in team.users"
                          :key="user.id"
                          class="admin-favorites-user-chip"
                        >
                          <UserAvatar
                            :first-name="user.firstName"
                            :last-name="user.lastName"
                            size="xs"
                          />
                          <span>{{ user.firstName }} {{ user.lastName }}</span>
                          <span v-if="user.departmentTeam" class="text-muted">· {{ user.departmentTeam }}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>
                <tr v-if="filteredFavoriteTeams.length === 0">
                  <td colspan="5" class="text-center text-muted admin-favorites-empty">
                    {{ search ? t('adminPages.favorites.emptyFiltered') : t('adminPages.favorites.emptyFavoriteTeam') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner.vue';
import ErrorState from '../../components/ErrorState.vue';
import PlayerAvatar from '../../components/PlayerAvatar.vue';
import UserAvatar from '../../components/UserAvatar.vue';
import TeamFlag from '../../components/TeamFlag.vue';

const { t } = useI18n();

const loading = ref(true);
const loadError = ref('');
const search = ref('');
const expandedKey = ref(null);
const data = ref({
  summary: {
    totalUsers: 0,
    withTopScorerPick: 0,
    withFavoriteTeam: 0,
    withoutTopScorerPick: 0,
    withoutFavoriteTeam: 0,
    uniqueTopScorerPicks: 0,
    uniqueFavoriteTeams: 0,
    mostPopularPlayer: null,
    mostPopularTeam: null,
  },
  topScorerPicks: [],
  favoriteTeams: [],
  usersWithoutTopScorer: [],
  usersWithoutFavoriteTeam: [],
});

function pickKey(pick) {
  return pick.playerId ? `player:${pick.playerId}` : `player:${pick.playerName}`;
}

function teamKey(team) {
  return team.teamId ? `team:${team.teamId}` : `team:${team.teamName}`;
}

function matchesSearch(text) {
  const q = search.value.trim().toLowerCase();
  if (!q) return true;
  return String(text || '').toLowerCase().includes(q);
}

const filteredTopScorerPicks = computed(() => data.value.topScorerPicks.filter((pick) => (
  matchesSearch(pick.playerName)
  || matchesSearch(pick.teamName)
  || pick.users.some((user) => matchesSearch(`${user.firstName} ${user.lastName}`))
)));

const filteredFavoriteTeams = computed(() => data.value.favoriteTeams.filter((team) => (
  matchesSearch(team.teamName)
  || team.users.some((user) => matchesSearch(`${user.firstName} ${user.lastName}`))
)));

function toggleExpanded(key) {
  expandedKey.value = expandedKey.value === key ? null : key;
}

async function loadFavorites() {
  loading.value = true;
  loadError.value = '';
  try {
    const { data: response } = await api.get('/statistics/admin/favorites');
    data.value = response;
  } catch (err) {
    loadError.value = err.response?.data?.error || t('adminPages.favorites.loadFailed');
  } finally {
    loading.value = false;
  }
}

onMounted(loadFavorites);
</script>

<style scoped>
.page-subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.admin-favorites-search {
  flex: 1;
  min-width: 220px;
  max-width: 420px;
}

.card-body-table {
  padding: 0;
}

.admin-favorites-table th {
  white-space: nowrap;
}

.admin-favorites-row {
  cursor: pointer;
}

.admin-favorites-row:hover td {
  background: var(--color-bg);
}

.admin-favorites-row.expanded td {
  background: var(--color-bg);
}

.admin-favorites-rank {
  width: 2.5rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

.admin-favorites-player {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.admin-favorites-share {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 8rem;
}

.admin-favorites-bar {
  flex: 1;
  height: 0.5rem;
  background: var(--color-border);
  border-radius: 999px;
  overflow: hidden;
}

.admin-favorites-bar-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 999px;
}

.admin-favorites-bar-fill-team {
  background: var(--color-success);
}

.admin-favorites-toggle {
  white-space: nowrap;
}

.admin-favorites-chevron {
  margin-left: 0.35rem;
  font-size: 0.75rem;
}

.admin-favorites-detail-row td {
  padding-top: 0;
  border-top: none;
}

.admin-favorites-users {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.25rem 0 0.75rem;
}

.admin-favorites-user-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.65rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface);
  font-size: 0.8125rem;
}

.admin-favorites-empty {
  padding: 2rem 1rem;
}
</style>
