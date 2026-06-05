<template>
  <div class="match-card bonus-card">
    <div class="card-header-row">
      <h3 class="question-title">
        <TeamFlag
          v-if="showFavoriteTeamBadge"
          :name="favoriteTeamName"
          :crest="favoriteTeamCrest"
          inline
          hide-name
          class="question-team-flag"
        />
        <span>{{ displayQuestionText }}</span>
      </h3>
      <span :class="['badge', statusClass]">{{ statusLabel }}</span>
    </div>
    <p class="meta">
      {{ question.points }} {{ t('bonus.points') }}
      <span v-if="question.lockTime"> · {{ t('bonus.lockTime') }}: {{ formatDate(question.lockTime) }}</span>
    </p>

    <p v-if="needsFavoriteTeam" class="favorite-team-hint">
      {{ t('bonus.favoriteTeamRequired') }}
      <router-link to="/profile">{{ t('bonus.goToProfile') }}</router-link>
    </p>

    <div v-if="question.canAnswer && !showForm" class="actions">
      <button class="btn btn-primary btn-sm" @click="showForm = true">
        {{ question.userPrediction ? t('bonus.editAnswer') : t('bonus.answer') }}
      </button>
    </div>

    <form v-if="showForm && question.canAnswer" @submit.prevent="submit" class="answer-form">
      <div v-if="question.questionType === 'national_team'" class="form-group">
        <input
          v-model="teamSearch"
          type="search"
          class="form-control mb-2"
          :placeholder="t('bonus.searchTeam')"
        />
        <select v-model="teamAnswerId" class="form-control" required>
          <option :value="null">{{ t('bonus.selectTeam') }}</option>
          <option v-for="team in filteredTeams" :key="team.id" :value="team.id">
            {{ team.name }}
          </option>
        </select>
        <TeamFlag
          v-if="selectedTeam"
          :name="selectedTeam.name"
          :crest="selectedTeam.crest"
          inline
          class="selected-preview"
        />
      </div>
      <div v-else-if="question.questionType === 'national_team_player'" class="form-group">
        <input
          v-model="playerSearch"
          type="search"
          class="form-control mb-2"
          :placeholder="t('bonus.searchPlayer')"
        />
        <select v-model="playerAnswerId" class="form-control" required size="6">
          <option :value="null">{{ t('bonus.selectPlayer') }}</option>
          <option v-for="player in filteredPlayers" :key="player.id" :value="player.id">
            {{ player.name }} ({{ player.teamName }})
          </option>
        </select>
      </div>
      <div v-else-if="isChoiceQuestion" class="form-group">
        <select v-model="answer" class="form-control" required>
          <option value="">{{ t('bonus.pleaseSelect') }}</option>
          <option v-for="opt in question.options" :key="opt" :value="opt">
            {{ progressOptionLabel(opt) }}
          </option>
        </select>
      </div>
      <div v-else-if="question.questionType === 'number'" class="form-group">
        <input v-model.number="answer" type="number" class="form-control" required />
      </div>
      <div v-else class="form-group">
        <input v-model="answer" type="text" class="form-control" required />
      </div>
      <div class="btn-group">
        <button type="submit" class="btn btn-primary btn-sm" :disabled="loading">{{ t('common.save') }}</button>
        <button type="button" class="btn btn-secondary btn-sm" @click="showForm = false">{{ t('common.cancel') }}</button>
      </div>
    </form>

    <div v-if="question.userPrediction" class="user-answer">
      <span v-if="displayTeamAnswer" class="answer-chip">
        <TeamFlag :name="displayTeamAnswer.name" :crest="displayTeamAnswer.crest" inline />
      </span>
      <span v-else-if="displayPlayerAnswer" class="badge badge-info">
        {{ t('bonus.yourAnswer') }}: {{ displayPlayerAnswer.name }} ({{ displayPlayerAnswer.teamName }})
      </span>
      <span v-else class="badge badge-info">
        {{ t('bonus.yourAnswer') }}: {{ displayTextAnswer }}
      </span>
      <span v-if="question.userPrediction.points !== null" class="badge badge-success">
        {{ question.userPrediction.points }} {{ t('bonus.pointsShort') }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useFootballTeamStore } from '../stores/footballTeamStore';
import TeamFlag from './TeamFlag.vue';

const props = defineProps({
  question: { type: Object, required: true },
});

const emit = defineEmits(['saved']);
const { t, locale } = useI18n();
const authStore = useAuthStore();
const footballTeamStore = useFootballTeamStore();

const showForm = ref(false);
const loading = ref(false);
const answer = ref('');
const teamAnswerId = ref(null);
const playerAnswerId = ref(null);
const teamSearch = ref('');
const playerSearch = ref('');

const PROGRESS_OPTION_KEYS = {
  groupStage: 'bonus.progress.groupStage',
  roundOf16: 'bonus.progress.roundOf16',
  quarterFinal: 'bonus.progress.quarterFinal',
  semiFinal: 'bonus.progress.semiFinal',
  final: 'bonus.progress.final',
  champion: 'bonus.progress.champion',
  Gruppenphase: 'bonus.progress.groupStage',
  Achtelfinale: 'bonus.progress.roundOf16',
  Viertelfinale: 'bonus.progress.quarterFinal',
  Halbfinale: 'bonus.progress.semiFinal',
  Finale: 'bonus.progress.final',
  Weltmeister: 'bonus.progress.champion',
};

const favoriteTeamName = computed(() => {
  if (props.question.questionType !== 'favorite_team_progress') return '';
  return props.question.favoriteTeam?.name
    || authStore.user?.favoriteNationalTeamName
    || '';
});

const showFavoriteTeamBadge = computed(() => (
  props.question.questionType === 'favorite_team_progress' && !!favoriteTeamName.value
));

const favoriteTeamCrest = computed(() => {
  if (!favoriteTeamName.value) return '';
  footballTeamStore.ensureLoaded();
  void footballTeamStore.loaded;
  return footballTeamStore.crestFor(favoriteTeamName.value);
});

const needsFavoriteTeam = computed(() => (
  props.question.questionType === 'favorite_team_progress' && !favoriteTeamName.value
));

const isChoiceQuestion = computed(() => (
  props.question.questionType === 'single_choice'
  || props.question.questionType === 'favorite_team_progress'
));

const displayQuestionText = computed(() => {
  if (props.question.questionType === 'favorite_team_progress') {
    if (!favoriteTeamName.value) {
      return t('bonus.favoriteTeamProgressFallback');
    }
    return t('bonus.favoriteTeamProgressQuestion', { team: favoriteTeamName.value });
  }
  return props.question.questionText;
});

const statusLabel = computed(() => {
  const map = {
    open: t('bonus.open'),
    locked: t('bonus.locked'),
    resolved: t('bonus.resolved'),
  };
  return map[props.question.status] || props.question.status;
});

const statusClass = computed(() => {
  const map = { open: 'badge-success', locked: 'badge-locked', resolved: 'badge-finished' };
  return map[props.question.status] || 'badge-info';
});

const teamOptions = computed(() => props.question.teamOptions || []);
const playerOptions = computed(() => props.question.playerOptions || []);

const filteredTeams = computed(() => {
  const q = teamSearch.value.trim().toLowerCase();
  const list = teamOptions.value;
  if (!q) return list;
  return list.filter((team) => team.name.toLowerCase().includes(q));
});

const filteredPlayers = computed(() => {
  const q = playerSearch.value.trim().toLowerCase();
  const list = playerOptions.value;
  const filtered = q
    ? list.filter((p) => p.name.toLowerCase().includes(q) || p.teamName.toLowerCase().includes(q))
    : list;
  return filtered.slice(0, 200);
});

const selectedTeam = computed(() => teamOptions.value.find((team) => team.id === teamAnswerId.value) || null);
const selectedPlayer = computed(() => playerOptions.value.find((player) => player.id === playerAnswerId.value) || null);

function progressOptionLabel(opt) {
  const key = PROGRESS_OPTION_KEYS[opt];
  return key ? t(key) : opt;
}

function parseStoredAnswer(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

const storedAnswer = computed(() => {
  if (!props.question.userPrediction) return null;
  return parseStoredAnswer(props.question.userPrediction.answerJson);
});

const displayTeamAnswer = computed(() => {
  if (props.question.questionType !== 'national_team' || !storedAnswer.value) return null;
  const val = storedAnswer.value;
  if (typeof val === 'object' && val?.name) {
    const team = teamOptions.value.find((item) => item.id === val.id);
    return { name: val.name, crest: team?.crest || '' };
  }
  const team = teamOptions.value.find((item) => item.name === val);
  return team ? { name: team.name, crest: team.crest } : { name: String(val), crest: '' };
});

const displayPlayerAnswer = computed(() => {
  if (props.question.questionType !== 'national_team_player' || !storedAnswer.value) return null;
  const val = storedAnswer.value;
  if (typeof val === 'object' && val?.name) {
    const player = playerOptions.value.find((p) => p.id === val.id);
    return { name: val.name, teamName: player?.teamName || val.teamName || '' };
  }
  return { name: String(val), teamName: '' };
});

const displayTextAnswer = computed(() => {
  if (!storedAnswer.value) return '';
  const val = storedAnswer.value;
  const text = Array.isArray(val) ? val.join(', ') : String(val);
  if (props.question.questionType === 'favorite_team_progress') {
    return progressOptionLabel(text);
  }
  return text;
});

function formatDate(d) {
  return new Date(d).toLocaleString(locale.value);
}

function initFormFromPrediction() {
  if (!props.question.userPrediction) return;
  const val = storedAnswer.value;
  if (props.question.questionType === 'national_team') {
    teamAnswerId.value = typeof val === 'object' ? val?.id ?? null : null;
    if (!teamAnswerId.value && typeof val === 'string') {
      const team = teamOptions.value.find((item) => item.name === val);
      teamAnswerId.value = team?.id ?? null;
    }
    return;
  }
  if (props.question.questionType === 'national_team_player') {
    playerAnswerId.value = typeof val === 'object' ? val?.id ?? null : null;
    return;
  }
  answer.value = val ?? '';
}

initFormFromPrediction();

function buildSubmitAnswer() {
  if (props.question.questionType === 'national_team') {
    return { id: selectedTeam.value.id, name: selectedTeam.value.name };
  }
  if (props.question.questionType === 'national_team_player') {
    return {
      id: selectedPlayer.value.id,
      name: selectedPlayer.value.name,
      teamName: selectedPlayer.value.teamName,
    };
  }
  return answer.value;
}

async function submit() {
  loading.value = true;
  try {
    const payload = buildSubmitAnswer();
    if (props.question.userPrediction) {
      await api.put(`/bonus-questions/predictions/${props.question.userPrediction.id}`, { answer: payload });
    } else {
      await api.post('/bonus-questions/predictions', { bonusQuestionId: props.question.id, answer: payload });
    }
    showForm.value = false;
    emit('saved');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.bonus-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 1.25rem; margin-bottom: 1rem; }
.card-header-row { display: flex; justify-content: space-between; align-items: start; gap: 1rem; margin-bottom: 0.5rem; }
.question-title { display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; margin: 0; flex-wrap: wrap; }
.question-team-flag { flex-shrink: 0; }
.meta { font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: 1rem; }
.favorite-team-hint { font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 1rem; }
.user-answer { margin-top: 0.75rem; display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
.selected-preview { margin-top: 0.5rem; }
.answer-chip { display: inline-flex; align-items: center; padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); background: var(--color-primary-soft); }
</style>
