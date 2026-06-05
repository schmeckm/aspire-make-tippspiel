<template>

  <div>

    <div class="page-header">

      <h1>{{ t('adminPages.bonus.title') }}</h1>

      <button class="btn btn-primary btn-sm" @click="openCreate">+ Neue Frage</button>

    </div>

    <AlertMessage v-if="message" :message="message" type="success" />

    <div class="card mb-2"><div class="card-body"><AIBonusQuestionSuggestions @use="applySuggestion" /></div></div>

    <LoadingSpinner v-if="loading" />

    <div v-else class="card"><div class="card-body">

      <div class="table-wrapper">

        <table>

          <thead><tr><th>Frage</th><th>Typ</th><th>Punkte</th><th>Status</th><th>Sperrung</th><th>Aktionen</th></tr></thead>

          <tbody>

            <tr v-for="q in questions" :key="q.id">

              <td>{{ q.questionText }}</td>

              <td>{{ typeLabel(q.questionType) }}</td>

              <td>{{ q.points }}</td>

              <td>{{ q.status }}</td>

              <td>{{ q.lockTime ? new Date(q.lockTime).toLocaleString('de-DE') : '–' }}</td>

              <td>

                <div class="btn-group">

                  <button class="btn btn-secondary btn-sm" @click="openResolve(q)">Auflösen</button>

                  <button class="btn btn-danger btn-sm" @click="handleDelete(q)">Löschen</button>

                </div>

              </td>

            </tr>

          </tbody>

        </table>

      </div>

    </div></div>



    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">

      <div class="modal">

        <div class="modal-header"><h3>{{ modalMode === 'create' ? 'Neue Bonusfrage' : 'Bonusfrage auflösen' }}</h3><button class="modal-close" @click="showModal = false">&times;</button></div>

        <form @submit.prevent="handleSave">

          <div class="modal-body">

            <template v-if="modalMode === 'create'">

              <div class="form-group"><label>Frage</label><input v-model="form.questionText" class="form-control" required /></div>

              <div class="form-row">

                <div class="form-group">

                  <label>Typ</label>

                  <select v-model="form.questionType" class="form-control">

                    <option value="single_choice">Einfachauswahl (fest)</option>

                    <option value="national_team">Nationalmannschaft (API)</option>

                    <option value="national_team_player">Spieler / Torjäger (API)</option>
                    <option value="favorite_team_progress">Lieblingsteam – wie weit? (Profil)</option>

                    <option value="number">Zahl</option>

                    <option value="text">Text</option>

                  </select>

                </div>

                <div class="form-group"><label>Punkte</label><input v-model.number="form.points" type="number" class="form-control" /></div>

              </div>

              <div v-if="form.questionType === 'single_choice' || form.questionType === 'favorite_team_progress'" class="form-group">
                <label>Optionen (kommagetrennt)</label>
                <input
                  v-model="form.optionsStr"
                  class="form-control"
                  :placeholder="form.questionType === 'favorite_team_progress'
                    ? 'Gruppenphase, Achtelfinale, Viertelfinale, Halbfinale, Finale, Weltmeister'
                    : 'Deutschland, Brasilien, Frankreich'"
                />
                <p v-if="form.questionType === 'favorite_team_progress'" class="text-muted api-hint">
                  Frage wird pro Nutzer mit seinem Lieblingsteam aus dem Profil personalisiert.
                </p>
              </div>
              <p v-else-if="usesApiOptions(form.questionType)" class="text-muted api-hint">

                Optionen werden automatisch aus der Football-API geladen.

              </p>

              <div class="form-group"><label>Sperrzeit</label><input v-model="form.lockTime" type="datetime-local" class="form-control" /></div>

            </template>

            <template v-else>

              <p>{{ resolvingQuestion?.questionText }}</p>

              <div v-if="resolvingQuestion?.questionType === 'national_team'" class="form-group">

                <label>Richtige Nationalmannschaft</label>

                <input v-model="resolveTeamSearch" type="search" class="form-control mb-2" placeholder="Team suchen…" />

                <select v-model="form.resolveTeamId" class="form-control" required>

                  <option :value="null">Bitte wählen…</option>

                  <option v-for="team in filteredResolveTeams" :key="team.id" :value="team.id">{{ team.name }}</option>

                </select>

              </div>

              <div v-else-if="resolvingQuestion?.questionType === 'national_team_player'" class="form-group">

                <label>Richtiger Spieler</label>

                <input v-model="resolvePlayerSearch" type="search" class="form-control mb-2" placeholder="Spieler suchen…" />

                <select v-model="form.resolvePlayerId" class="form-control" required size="8">

                  <option :value="null">Bitte wählen…</option>

                  <option v-for="player in filteredResolvePlayers" :key="player.id" :value="player.id">

                    {{ player.name }} ({{ player.teamName }})

                  </option>

                </select>

              </div>

              <div v-else class="form-group">

                <label>Richtige Antwort</label>

                <input v-model="form.correctAnswer" class="form-control" required />

              </div>

            </template>

          </div>

          <div class="modal-footer">

            <button type="button" class="btn btn-secondary" @click="showModal = false">Abbrechen</button>

            <button type="submit" class="btn btn-primary">Speichern</button>

          </div>

        </form>

      </div>

    </div>

  </div>

</template>



<script setup>

import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '../../services/api';

import LoadingSpinner from '../../components/LoadingSpinner.vue';

import AlertMessage from '../../components/AlertMessage.vue';

import AIBonusQuestionSuggestions from '../../components/AIBonusQuestionSuggestions.vue';




const { t } = useI18n();

const questions = ref([]);

const loading = ref(true);

const showModal = ref(false);

const modalMode = ref('create');

const resolvingQuestion = ref(null);

const message = ref('');

const resolveTeamSearch = ref('');

const resolvePlayerSearch = ref('');

const form = ref({

  questionText: '',

  questionType: 'single_choice',

  points: 10,

  optionsStr: '',

  lockTime: '',

  correctAnswer: '',

  resolveTeamId: null,

  resolvePlayerId: null,

});



const filteredResolveTeams = computed(() => {

  const teams = resolvingQuestion.value?.teamOptions || [];

  const q = resolveTeamSearch.value.trim().toLowerCase();

  if (!q) return teams;

  return teams.filter((team) => team.name.toLowerCase().includes(q));

});



const filteredResolvePlayers = computed(() => {

  const players = resolvingQuestion.value?.playerOptions || [];

  const q = resolvePlayerSearch.value.trim().toLowerCase();

  const filtered = q

    ? players.filter((p) => p.name.toLowerCase().includes(q) || p.teamName.toLowerCase().includes(q))

    : players;

  return filtered.slice(0, 200);

});



function usesApiOptions(type) {

  return type === 'national_team' || type === 'national_team_player';

}



function typeLabel(type) {

  const map = {

    single_choice: 'Einfachauswahl',

    national_team: 'Nationalmannschaft (API)',

    national_team_player: 'Spieler (API)',
    favorite_team_progress: 'Lieblingsteam (Profil)',

    number: 'Zahl',

    text: 'Text',

  };

  return map[type] || type;

}



async function load() {

  loading.value = true;

  try { const { data } = await api.get('/admin/bonus-questions'); questions.value = data; }

  finally { loading.value = false; }

}



function openCreate() {

  modalMode.value = 'create';

  form.value = {

    questionText: '',

    questionType: 'single_choice',

    points: 10,

    optionsStr: '',

    lockTime: '',

    correctAnswer: '',

    resolveTeamId: null,

    resolvePlayerId: null,

  };

  showModal.value = true;

}



function applySuggestion(s) {

  modalMode.value = 'create';

  form.value = {

    questionText: s.questionText,

    questionType: s.questionType || 'single_choice',

    points: s.suggestedPoints || 10,

    optionsStr: (s.options || []).join(', '),

    lockTime: '',

    correctAnswer: '',

    resolveTeamId: null,

    resolvePlayerId: null,

  };

  showModal.value = true;

}



async function openResolve(q) {

  modalMode.value = 'resolve';

  resolvingQuestion.value = q.teamOptions || q.playerOptions ? q : (await api.get(`/admin/bonus-questions/${q.id}`)).data;

  resolveTeamSearch.value = '';

  resolvePlayerSearch.value = '';

  form.value.correctAnswer = '';

  form.value.resolveTeamId = null;

  form.value.resolvePlayerId = null;

  showModal.value = true;

}



function buildCorrectAnswer() {

  if (resolvingQuestion.value?.questionType === 'national_team') {

    const team = (resolvingQuestion.value.teamOptions || []).find((t) => t.id === form.value.resolveTeamId);

    return team ? { id: team.id, name: team.name } : null;

  }

  if (resolvingQuestion.value?.questionType === 'national_team_player') {

    const player = (resolvingQuestion.value.playerOptions || []).find((p) => p.id === form.value.resolvePlayerId);

    return player ? { id: player.id, name: player.name, teamName: player.teamName } : null;

  }

  return form.value.correctAnswer;

}



async function handleSave() {

  if (modalMode.value === 'create') {

    const options = form.value.optionsStr ? form.value.optionsStr.split(',').map((s) => s.trim()) : [];

    await api.post('/admin/bonus-questions', {

      questionText: form.value.questionText,

      questionType: form.value.questionType,

      points: form.value.points,

      options: usesApiOptions(form.value.questionType) ? null : options,

      lockTime: form.value.lockTime ? new Date(form.value.lockTime).toISOString() : null,

    });

    message.value = 'Bonusfrage erstellt.';

  } else {

    await api.post(`/admin/bonus-questions/${resolvingQuestion.value.id}/resolve`, {

      correctAnswer: buildCorrectAnswer(),

    });

    message.value = 'Bonusfrage aufgelöst.';

  }

  showModal.value = false;

  await load();

}



async function handleDelete(q) {

  if (!confirm('Wirklich löschen?')) return;

  await api.delete(`/admin/bonus-questions/${q.id}`);

  await load();

}



onMounted(load);

</script>



<style scoped>

.api-hint {

  font-size: 0.85rem;

  margin-bottom: 1rem;

}

</style>

