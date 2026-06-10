import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../services/api';

export const useAppSettingsStore = defineStore('appSettings', () => {
  const loaded = ref(false);
  const prizesEnabled = ref(false);
  const prizes = ref([]);
  const prizeImageVersions = ref({ 1: 0, 2: 0, 3: 0 });

  const showPrizesNav = computed(() => prizesEnabled.value);

  function bumpPrizeImageVersion(rank, version = Date.now()) {
    prizeImageVersions.value = {
      ...prizeImageVersions.value,
      [rank]: version,
    };
  }

  function resolvePrizeImageUrl(url, rank) {
    if (!url) return '';
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;
    const version = prizeImageVersions.value[rank];
    if (!version) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${version}`;
  }

  async function load() {
    try {
      const { data } = await api.get('/settings');
      prizesEnabled.value = !!data.prizesEnabled;
      prizes.value = Array.isArray(data.prizes) ? data.prizes : [];
    } catch {
      prizesEnabled.value = false;
      prizes.value = [];
    } finally {
      loaded.value = true;
    }
  }

  function applySettings(data) {
    if (data.prizesEnabled !== undefined) prizesEnabled.value = !!data.prizesEnabled;
    if (Array.isArray(data.prizes)) prizes.value = data.prizes;
  }

  return {
    loaded,
    prizesEnabled,
    prizes,
    prizeImageVersions,
    showPrizesNav,
    load,
    applySettings,
    bumpPrizeImageVersion,
    resolvePrizeImageUrl,
  };
});
