<template>
  <div class="display-mode">
    <header class="display-header">
      <h1>{{ appTitle }}</h1>
      <span class="display-updated">{{ t('display.updated') }}: {{ formatTime(lastUpdated) }}</span>
    </header>

    <div class="display-grid">
      <section class="display-leaderboard">
        <h2>{{ t('leaderboard.title') }}</h2>
        <LeaderboardTable :entries="leaderboard" :show-movement="false" :compact="true" />
      </section>

      <section class="display-matches">
        <h2>{{ t('display.liveMatches') }}</h2>
        <div v-if="matches.length === 0" class="text-muted">{{ t('display.noMatches') }}</div>
        <ul v-else class="display-match-list">
          <li v-for="match in matches" :key="match.id" class="display-match-item">
            <span class="match-ref">#{{ match.matchNumber }}</span>
            <span>{{ match.homeTeam }}</span>
            <strong>
              <template v-if="match.status === 'finished' || match.status === 'live' || match.status === 'halftime'">
                {{ match.homeScore ?? '–' }} : {{ match.awayScore ?? '–' }}
              </template>
              <template v-else>{{ t('common.vs') }}</template>
            </strong>
            <span>{{ match.awayTeam }}</span>
            <span :class="['badge', `badge-${match.status}`]">{{ match.status }}</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from 'axios';
import LeaderboardTable from '../components/LeaderboardTable.vue';
import { useFormatters } from '../composables/useFormatters';

const { t } = useI18n();
const { formatTime } = useFormatters();

const appTitle = ref('WM 2026 Tippspiel');
const leaderboard = ref([]);
const matches = ref([]);
const lastUpdated = ref(new Date());
let timer = null;

async function loadDisplay() {
  try {
    const [lbRes, matchRes] = await Promise.all([
      axios.get('/api/display/leaderboard'),
      axios.get('/api/display/live-matches'),
    ]);
    leaderboard.value = lbRes.data.entries || [];
    matches.value = matchRes.data.matches || [];
    lastUpdated.value = new Date();
  } catch {
    // silent refresh for TV display
  }
}

onMounted(() => {
  loadDisplay();
  timer = setInterval(loadDisplay, 30000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.display-mode {
  min-height: 100vh;
  padding: 1.5rem 2rem;
  background: var(--color-bg);
}
.display-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 1.5rem;
}
.display-header h1 { font-size: 2rem; }
.display-updated { color: var(--color-text-muted); font-size: 0.875rem; }
.display-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
}
.display-leaderboard, .display-matches {
  background: var(--color-surface);
  border-radius: var(--radius);
  padding: 1rem;
  box-shadow: var(--shadow-sm);
}
.display-match-list { list-style: none; padding: 0; margin: 0; }
.display-match-item {
  display: grid;
  grid-template-columns: auto 1fr auto 1fr auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
}
@media (max-width: 900px) {
  .display-grid { grid-template-columns: 1fr; }
}
</style>
