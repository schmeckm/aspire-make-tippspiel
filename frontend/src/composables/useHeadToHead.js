import { ref } from 'vue';
import api from '../services/api';
import i18n from '../i18n';

export function useHeadToHead() {
  const data = ref(null);
  const loading = ref(false);
  const error = ref('');

  async function loadForMatch(matchId) {
    if (!matchId) return;
    loading.value = true;
    error.value = '';
    data.value = null;
    try {
      const { data: response } = await api.get(`/football/head2head/match/${matchId}`, {
        params: { limit: 15, competitions: 'WC' },
        timeout: 30000,
      });
      data.value = response;
    } catch (err) {
      error.value = err.response?.data?.error || i18n.global.t('head2head.loadFailed');
    } finally {
      loading.value = false;
    }
  }

  async function loadForTeams(teamAId, teamBId, { teamAName = null, teamBName = null } = {}) {
    if (!teamAId || !teamBId) return;
    loading.value = true;
    error.value = '';
    data.value = null;
    try {
      const params = { limit: 15, competitions: 'WC' };
      if (teamAName) params.teamAName = teamAName;
      if (teamBName) params.teamBName = teamBName;
      const { data: response } = await api.get(`/football/head2head/teams/${teamAId}/${teamBId}`, {
        params,
        timeout: 30000,
      });
      data.value = response;
    } catch (err) {
      error.value = err.response?.data?.error || i18n.global.t('head2head.loadFailed');
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    data.value = null;
    loading.value = false;
    error.value = '';
  }

  return {
    data,
    loading,
    error,
    loadForMatch,
    loadForTeams,
    reset,
  };
}
