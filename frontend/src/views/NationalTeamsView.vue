<template>
  <div>
    <div class="page-header">
      <h1>{{ t('nationalTeams.title') }}</h1>
      <span class="text-muted">{{ t('nationalTeams.subtitle') }}</span>
    </div>

    <div class="filter-bar mb-3">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="['filter-btn', { active: activeTab === tab.id }]"
        :aria-pressed="activeTab === tab.id"
        @click="switchTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <AlertMessage v-if="error" :message="error" type="error" />

    <!-- Teams & squads -->
    <template v-if="activeTab === 'teams'">
      <LoadingSpinner v-if="loadingTeams" />
      <div v-else class="national-teams-layout">
        <div class="card national-teams-list">
          <div class="card-body">
            <input
              v-model="search"
              type="search"
              class="form-control mb-3"
              :placeholder="t('nationalTeams.searchPlaceholder')"
            />
            <div class="national-team-grid">
              <button
                v-for="team in filteredTeams"
                :key="team.id"
                type="button"
                class="national-team-card"
                :class="{ active: selectedTeam?.id === team.id }"
                @click="selectTeam(team)"
              >
                <img v-if="team.crest" :src="team.crest" :alt="team.name" class="national-team-crest" />
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
              <img v-if="selectedTeam.crest" :src="selectedTeam.crest" :alt="selectedTeam.name" class="national-team-detail-crest" />
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
                  @click="loadPlayerImages"
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

    <!-- Standings -->
    <template v-else-if="activeTab === 'standings'">
      <LoadingSpinner v-if="loadingStandings" />
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
                        <img v-if="row.team.crest" :src="row.team.crest" :alt="row.team.name" class="standing-crest" />
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

    <!-- Top scorers -->
    <template v-else-if="activeTab === 'scorers'">
      <LoadingSpinner v-if="loadingScorers" />
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
                      <img v-if="entry.team.crest" :src="entry.team.crest" :alt="entry.team.name" class="standing-crest" />
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

    <!-- Live API matches -->
    <template v-else-if="activeTab === 'live'">
      <div class="filter-bar mb-3">
        <button
          v-for="f in matchFilters"
          :key="f.value"
          type="button"
          :class="['filter-btn', { active: liveFilter === f.value }]"
          :aria-pressed="liveFilter === f.value"
          @click="setLiveFilter(f.value)"
        >
          {{ f.label }}
        </button>
      </div>
      <LoadingSpinner v-if="loadingLive" />
      <div v-else-if="liveMatches.length === 0" class="empty-state">
        <p>{{ t('nationalTeams.liveEmpty') }}</p>
      </div>
      <div v-else class="card">
        <div class="card-body">
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{{ t('matchTable.date') }}</th>
                  <th>{{ t('matchTable.stage') }}</th>
                  <th>{{ t('matchTable.home') }}</th>
                  <th>{{ t('matchTable.result') }}</th>
                  <th>{{ t('matchTable.away') }}</th>
                  <th>{{ t('matchTable.status') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="match in liveMatches" :key="match.id">
                  <td>{{ formatDateTime(match.utcDate) }}</td>
                  <td>{{ match.stage }}<span v-if="match.group"> ({{ match.group }})</span></td>
                  <td>
                    <router-link :to="{ path: '/national-teams', query: { team: match.homeTeam.name, tab: 'teams' } }">
                      {{ match.homeTeam.name }}
                    </router-link>
                  </td>
                  <td>
                    <span v-if="match.score.home != null">{{ match.score.home }} : {{ match.score.away }}</span>
                    <span v-else>–</span>
                  </td>
                  <td>
                    <router-link :to="{ path: '/national-teams', query: { team: match.awayTeam.name, tab: 'teams' } }">
                      {{ match.awayTeam.name }}
                    </router-link>
                  </td>
                  <td><span class="badge badge-info">{{ match.status }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- Head-to-head comparison -->
    <template v-else-if="activeTab === 'duels'">
      <div class="card">
        <div class="card-body">
          <p class="text-muted">{{ t('nationalTeams.duelsHint') }}</p>
          <div class="duels-select-row">
            <div class="form-group">
              <label>{{ t('nationalTeams.duelsTeamA') }}</label>
              <select v-model="duelTeamAId" class="form-control">
                <option :value="null">{{ t('nationalTeams.duelsSelectTeam') }}</option>
                <option v-for="team in teams" :key="`a-${team.id}`" :value="team.id">
                  {{ team.name }}
                </option>
              </select>
            </div>
            <span class="duels-vs">{{ t('common.vs') }}</span>
            <div class="form-group">
              <label>{{ t('nationalTeams.duelsTeamB') }}</label>
              <select v-model="duelTeamBId" class="form-control">
                <option :value="null">{{ t('nationalTeams.duelsSelectTeam') }}</option>
                <option v-for="team in teams" :key="`b-${team.id}`" :value="team.id">
                  {{ team.name }}
                </option>
              </select>
            </div>
            <button
              type="button"
              class="btn btn-primary duels-compare-btn"
              :disabled="!canCompareDuels || duelLoading"
              @click="compareDuels"
            >
              {{ duelLoading ? t('head2head.loading') : t('nationalTeams.duelsCompare') }}
            </button>
          </div>

          <HeadToHeadPanel
            v-if="duelData"
            :data="duelData"
            :loading="duelLoading"
            :subtitle="t('head2head.wcOnly')"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import AlertMessage from '../components/AlertMessage.vue';
import PlayerAvatar from '../components/PlayerAvatar.vue';
import HeadToHeadPanel from '../components/HeadToHeadPanel.vue';
import { useFormatters } from '../composables/useFormatters';
import { useHeadToHead } from '../composables/useHeadToHead';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { formatDate, formatTime } = useFormatters();

const activeTab = ref('teams');
const teams = ref([]);
const selectedTeam = ref(null);
const standings = ref([]);
const scorers = ref([]);
const liveMatches = ref([]);
const loadingTeams = ref(true);
const loadingTeamDetail = ref(false);
const resolvingPlayerImages = ref(false);
const loadingStandings = ref(false);
const loadingScorers = ref(false);
const loadingLive = ref(false);
const error = ref('');
const search = ref('');
const liveFilter = ref('today');
const duelTeamAId = ref(null);
const duelTeamBId = ref(null);

const {
  data: duelData,
  loading: duelLoading,
  error: duelError,
  loadForTeams: loadDuelHead2Head,
  reset: resetDuelHead2Head,
} = useHeadToHead();

let teamDetailAbort = null;
let imageResolveAbort = null;

function cancelTeamRequests() {
  teamDetailAbort?.abort();
  imageResolveAbort?.abort();
  teamDetailAbort = null;
  imageResolveAbort = null;
}

function isRequestCanceled(err) {
  return err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError';
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

const tabs = computed(() => [
  { id: 'teams', label: t('nationalTeams.tabs.teams') },
  { id: 'standings', label: t('nationalTeams.tabs.standings') },
  { id: 'scorers', label: t('nationalTeams.tabs.scorers') },
  { id: 'live', label: t('nationalTeams.tabs.live') },
  { id: 'duels', label: t('nationalTeams.tabs.duels') },
]);

const matchFilters = computed(() => [
  { value: 'today', label: t('nationalTeams.liveFilters.today') },
  { value: 'scheduled', label: t('nationalTeams.liveFilters.scheduled') },
  { value: 'live', label: t('nationalTeams.liveFilters.live') },
  { value: 'finished', label: t('nationalTeams.liveFilters.finished') },
]);

const filteredTeams = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return teams.value;
  return teams.value.filter((team) => (
    team.name.toLowerCase().includes(q)
    || team.shortName?.toLowerCase().includes(q)
    || team.tla?.toLowerCase().includes(q)
  ));
});

const squadGroups = computed(() => {
  if (!selectedTeam.value?.squad?.length) return [];
  const order = ['Goalkeeper', 'Defence', 'Midfield', 'Offence', 'Offense'];
  const grouped = new Map();
  for (const player of selectedTeam.value.squad) {
    const pos = player.position || 'Other';
    if (!grouped.has(pos)) grouped.set(pos, []);
    grouped.get(pos).push(player);
  }
  const groups = [...grouped.entries()].map(([position, players]) => ({
    position,
    players: players.sort((a, b) => a.name.localeCompare(b.name)),
  }));
  groups.sort((a, b) => {
    const ai = order.indexOf(a.position);
    const bi = order.indexOf(b.position);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  return groups;
});

const missingPlayerImages = computed(() => (
  selectedTeam.value?.squad?.filter((player) => !player.imageUrl).length || 0
));

const squadImageProgress = computed(() => {
  const squad = selectedTeam.value?.squad || [];
  const total = squad.length;
  const withImage = squad.filter((player) => player.imageUrl).length;
  const percent = total ? Math.min(100, Math.round((withImage / total) * 100)) : 0;
  return {
    total,
    withImage,
    missing: total - withImage,
    percent,
  };
});

const canCompareDuels = computed(() => (
  duelTeamAId.value
  && duelTeamBId.value
  && duelTeamAId.value !== duelTeamBId.value
));

function teamNameById(id) {
  return teams.value.find((team) => team.id === id)?.name || null;
}

async function compareDuels() {
  if (!canCompareDuels.value) return;
  await loadDuelHead2Head(duelTeamAId.value, duelTeamBId.value, {
    teamAName: teamNameById(duelTeamAId.value),
    teamBName: teamNameById(duelTeamBId.value),
  });
}

function positionLabel(position) {
  const key = {
    Goalkeeper: 'goalkeeper',
    Defence: 'defence',
    Midfield: 'midfield',
    Offence: 'offence',
    Offense: 'offence',
  }[position];
  return key ? t(`nationalTeams.positions.${key}`) : position;
}

function standingTitle(block) {
  if (block.group) return `${t('nationalTeams.group')} ${block.group}`;
  if (block.type === 'TOTAL') return t('nationalTeams.overallTable');
  return block.stage || block.type || t('nationalTeams.tabs.standings');
}

function formatBirthDate(value) {
  if (!value) return '–';
  return formatDate(value);
}

function formatDateTime(value) {
  if (!value) return '–';
  return `${formatDate(value)} ${formatTime(value)}`;
}

function findTeamInList(name) {
  const key = String(name || '').trim().toLowerCase();
  if (!key) return null;
  return teams.value.find((item) => (
    item.name.toLowerCase() === key
    || item.shortName?.toLowerCase() === key
    || item.tla?.toLowerCase() === key
  )) || null;
}

function applyTeamDetail(data) {
  if (!data?.id || !Array.isArray(data.squad) || !data.squad.length) return false;
  selectedTeam.value = data;
  return true;
}

function mergeTeamImageUpdates(data) {
  if (!data?.id || selectedTeam.value?.id !== data.id || !Array.isArray(data.squad) || !data.squad.length) {
    return;
  }
  const byId = new Map(data.squad.map((player) => [player.id, player]));
  selectedTeam.value = {
    ...selectedTeam.value,
    squad: selectedTeam.value.squad.map((player) => {
      const updated = byId.get(player.id);
      if (!updated) return player;
      return {
        ...player,
        imageUrl: updated.imageUrl || player.imageUrl,
        imageSource: updated.imageSource || player.imageSource,
        imageAttribution: updated.imageAttribution || player.imageAttribution,
        imageLicense: updated.imageLicense || player.imageLicense,
      };
    }),
  };
}

async function loadTeams() {
  loadingTeams.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/football/teams');
    teams.value = data;
    const teamQuery = route.query.team;
    if (teamQuery) {
      const match = findTeamInList(teamQuery);
      if (match) await selectTeam(match, { replaceRoute: false });
    }
  } catch (err) {
    error.value = err.response?.data?.error || t('nationalTeams.loadFailed');
  } finally {
    loadingTeams.value = false;
  }
}

async function loadTeamDetail(team) {
  teamDetailAbort?.abort();
  const controller = new AbortController();
  teamDetailAbort = controller;

  loadingTeamDetail.value = true;
  error.value = '';
  try {
    const { data } = await api.get(`/football/teams/${team.id}`, {
      signal: controller.signal,
      timeout: 30000,
    });
    if (controller.signal.aborted) return;
    if (!applyTeamDetail(data)) {
      error.value = t('nationalTeams.squadEmpty');
    }
  } catch (err) {
    if (isRequestCanceled(err)) return;
    error.value = err.response?.data?.error || t('nationalTeams.loadFailed');
  } finally {
    if (teamDetailAbort === controller) {
      loadingTeamDetail.value = false;
    }
  }
}

async function loadPlayerImages() {
  if (!selectedTeam.value?.id || resolvingPlayerImages.value) return;
  resolvingPlayerImages.value = true;
  resolveTeamImagesInBackground(selectedTeam.value.id).finally(() => {
    resolvingPlayerImages.value = false;
  });
}

async function resolveTeamImagesInBackground(teamId) {
  imageResolveAbort?.abort();
  const controller = new AbortController();
  imageResolveAbort = controller;

  const maxRounds = 10;
  for (let round = 0; round < maxRounds; round += 1) {
    if (controller.signal.aborted || selectedTeam.value?.id !== teamId) return;

    const missing = selectedTeam.value?.squad?.filter((p) => !p.imageUrl).length || 0;
    if (missing === 0) return;

    try {
      if (round > 0) {
        await wait(800, controller.signal);
      }

      const { data } = await api.get(`/football/teams/${teamId}`, {
        params: { resolveImages: '1', maxResolve: 2 },
        signal: controller.signal,
        timeout: 20000,
      });
      if (controller.signal.aborted || selectedTeam.value?.id !== teamId) return;

      mergeTeamImageUpdates(data);
      if (data.imageResolve?.complete || (data.imageResolve?.resolvedThisRequest || 0) === 0) {
        return;
      }
    } catch (err) {
      if (isRequestCanceled(err)) return;
      return;
    }
  }
}

async function selectTeam(team, { replaceRoute = true } = {}) {
  cancelTeamRequests();
  resolvingPlayerImages.value = false;
  error.value = '';
  selectedTeam.value = {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    tla: team.tla,
    crest: team.crest,
    squadSize: team.squadSize,
    squad: [],
  };
  await loadTeamDetail(team);
  if (replaceRoute) {
    router.replace({ query: { ...route.query, team: team.name, tab: 'teams' } });
  }
}

async function loadStandings() {
  loadingStandings.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/football/standings');
    standings.value = data;
  } catch (err) {
    error.value = err.response?.data?.error || t('nationalTeams.loadFailed');
  } finally {
    loadingStandings.value = false;
  }
}

async function loadScorers() {
  loadingScorers.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/football/scorers', { params: { limit: 20 } });
    scorers.value = data;
  } catch (err) {
    error.value = err.response?.data?.error || t('nationalTeams.loadFailed');
  } finally {
    loadingScorers.value = false;
  }
}

async function loadLiveMatches() {
  loadingLive.value = true;
  error.value = '';
  try {
    const today = new Date().toISOString().slice(0, 10);
    const params = liveFilter.value === 'today'
      ? { dateFrom: today, dateTo: today }
      : { status: liveFilter.value.toUpperCase(), limit: 50 };
    const { data } = await api.get('/football/matches', { params });
    liveMatches.value = data;
  } catch (err) {
    error.value = err.response?.data?.error || t('nationalTeams.loadFailed');
  } finally {
    loadingLive.value = false;
  }
}

function setLiveFilter(value) {
  liveFilter.value = value;
  loadLiveMatches();
}

async function switchTab(tabId) {
  activeTab.value = tabId;
  router.replace({ query: { ...route.query, tab: tabId } });
  if (tabId === 'standings' && !standings.value.length) await loadStandings();
  if (tabId === 'scorers' && !scorers.value.length) await loadScorers();
  if (tabId === 'live' && !liveMatches.value.length) await loadLiveMatches();
  if (tabId !== 'duels') resetDuelHead2Head();
}

watch(() => route.query.team, async (name) => {
  if (!name || loadingTeams.value) return;
  const match = findTeamInList(name);
  if (match && selectedTeam.value?.id !== match.id) {
    await selectTeam(match, { replaceRoute: false });
  }
});

onMounted(async () => {
  if (route.query.tab) activeTab.value = String(route.query.tab);
  await loadTeams();
  if (activeTab.value === 'standings') await loadStandings();
  if (activeTab.value === 'scorers') await loadScorers();
  if (activeTab.value === 'live') await loadLiveMatches();
});

onUnmounted(() => {
  cancelTeamRequests();
});
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

.duels-select-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto;
  gap: 0.75rem;
  align-items: end;
  margin-bottom: 1.25rem;
}

.duels-vs {
  font-weight: 700;
  padding-bottom: 0.5rem;
}

.duels-compare-btn {
  white-space: nowrap;
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
  .duels-select-row {
    grid-template-columns: 1fr;
  }
  .duels-vs {
    text-align: center;
    padding-bottom: 0;
  }
}
</style>
