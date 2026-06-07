<template>
  <div class="display-mode">
    <header class="display-header">
      <div>
        <h1>{{ appTitle }}</h1>
        <p class="display-subtitle">{{ t('display.subtitle') }}</p>
      </div>
      <span class="display-updated">{{ t('display.updated') }}: {{ formatTime(lastUpdated) }}</span>
    </header>

    <div class="display-grid">
      <section class="display-panel display-leaderboard">
        <h2>{{ t('leaderboard.title') }}</h2>
        <LeaderboardTable :entries="leaderboard" :show-movement="false" :compact="true" />
      </section>

      <section class="display-panel display-matches">
        <h2>{{ t('display.liveMatches') }}</h2>
        <div v-if="matches.length === 0" class="display-empty">{{ t('display.noMatches') }}</div>
        <ul v-else class="display-match-list">
          <li v-for="match in matches" :key="match.id" class="display-match-item">
            <span class="match-ref">#{{ match.matchNumber }}</span>
            <span class="display-team">{{ match.homeTeam }}</span>
            <strong class="display-score">
              <template v-if="match.status === 'finished' || match.status === 'live' || match.status === 'halftime'">
                {{ match.homeScore ?? '–' }} : {{ match.awayScore ?? '–' }}
              </template>
              <template v-else>{{ t('common.vs') }}</template>
            </strong>
            <span class="display-team">{{ match.awayTeam }}</span>
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
import {
  connectDisplaySocket,
  disconnectDisplaySocket,
  onDisplaySocketEvent,
} from '../services/socket';

const { t } = useI18n();
const { formatTime } = useFormatters();

const appTitle = ref('WM 2026 Tippspiel');
const leaderboard = ref([]);
const matches = ref([]);
const lastUpdated = ref(new Date());
let fallbackTimer = null;
let unsubMatch = null;
let unsubLeaderboard = null;

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
  document.documentElement.setAttribute('data-theme', 'dark');
  loadDisplay();
  connectDisplaySocket();
  unsubMatch = onDisplaySocketEvent('match:update', loadDisplay);
  unsubLeaderboard = onDisplaySocketEvent('leaderboard:update', loadDisplay);
  fallbackTimer = setInterval(loadDisplay, 60000);
});

onUnmounted(() => {
  if (fallbackTimer) clearInterval(fallbackTimer);
  unsubMatch?.();
  unsubLeaderboard?.();
  disconnectDisplaySocket();
});
</script>

<style scoped>
.display-mode {
  min-height: 100vh;
  padding: 2rem 2.5rem;
  background: #0A0A0A;
  color: #FFFFFF;
  position: relative;
}

.display-mode::before {
  content: '';
  position: fixed;
  inset: 0;
  background: radial-gradient(ellipse 70% 45% at 50% -10%, rgba(0, 255, 127, 0.14), transparent);
  pointer-events: none;
  z-index: 0;
}

.display-header,
.display-grid {
  position: relative;
  z-index: 1;
}

.display-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid #2A2A2A;
}

.display-header h1 {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0;
}

.display-subtitle {
  margin: 0.35rem 0 0;
  font-size: 1rem;
  color: #00FF7F;
  font-weight: 600;
}

.display-updated {
  color: #B8C0CC;
  font-size: 0.9375rem;
}

.display-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
}

.display-panel {
  background: #1A1A1A;
  border: 1px solid #2A2A2A;
  border-radius: 1.25rem;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 0 40px rgba(0, 255, 127, 0.06);
}

.display-panel h2 {
  font-size: 1.25rem;
  font-weight: 800;
  color: #00FF7F;
  margin: 0 0 1rem;
  letter-spacing: -0.02em;
}

.display-empty {
  color: #B8C0CC;
  padding: 2rem 0;
  text-align: center;
}

.display-match-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.display-match-item {
  display: grid;
  grid-template-columns: auto 1fr auto 1fr auto;
  gap: 0.875rem;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #2A2A2A;
  font-size: 1rem;
}

.display-match-item:last-child {
  border-bottom: none;
}

.display-team {
  font-weight: 600;
}

.display-score {
  font-size: 1.375rem;
  font-weight: 800;
  color: #00FF7F;
  text-align: center;
  text-shadow: 0 0 20px rgba(0, 255, 127, 0.25);
}

@media (max-width: 900px) {
  .display-mode {
    padding: 1.25rem;
  }

  .display-grid {
    grid-template-columns: 1fr;
  }

  .display-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}
</style>
