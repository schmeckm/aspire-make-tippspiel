import { defineStore } from 'pinia';
import api from '../services/api';
import { getTeamIso, TEAM_TO_ISO } from '../utils/flags';

export const useFootballTeamStore = defineStore('footballTeams', {
  state: () => ({
    crestByKey: {},
    canonicalNameByKey: {},
    iso2ToCrest: {},
    loaded: false,
    loading: false,
    error: null,
  }),

  getters: {
    crestFor: (state) => (teamName) => {
      if (!teamName?.trim()) return '';
      const key = teamName.trim().toLowerCase();
      if (state.crestByKey[key]) return state.crestByKey[key];

      const iso2 = getTeamIso(teamName);
      if (iso2 && state.iso2ToCrest[iso2]) return state.iso2ToCrest[iso2];

      return '';
    },

    canonicalFor: (state) => (teamName) => {
      if (!teamName?.trim()) return teamName;
      const key = teamName.trim().toLowerCase();
      return state.canonicalNameByKey[key] || teamName;
    },
  },

  actions: {
    registerTeam(team) {
      if (!team?.crest) return;
      const keys = new Set([
        team.name,
        team.shortName,
        team.tla,
        team.area?.name,
      ].filter(Boolean).map((k) => k.toLowerCase()));

      for (const key of keys) {
        this.crestByKey[key] = team.crest;
        this.canonicalNameByKey[key] = team.name;
      }

      const iso2 = getTeamIso(team.name) || getTeamIso(team.area?.name);
      if (iso2) {
        this.iso2ToCrest[iso2] = team.crest;
        for (const [alias, aliasIso] of Object.entries(TEAM_TO_ISO)) {
          if (aliasIso === iso2) {
            this.crestByKey[alias] = team.crest;
            this.canonicalNameByKey[alias] = team.name;
          }
        }
      }
    },

    async ensureLoaded() {
      if (this.loaded || this.loading) return;
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.get('/football/teams');
        for (const team of data) {
          this.registerTeam(team);
        }
        this.loaded = true;
      } catch (err) {
        this.error = err.response?.data?.error || err.message;
      } finally {
        this.loading = false;
      }
    },
  },
});
