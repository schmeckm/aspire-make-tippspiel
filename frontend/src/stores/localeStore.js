import { ref, watch } from 'vue';
import { defineStore } from 'pinia';
import i18n, { getStoredLocale, setStoredLocale, normalizeLocale } from '../i18n';
import api from '../services/api';

export const useLocaleStore = defineStore('locale', () => {
  const locale = ref(getStoredLocale());

  function applyLocale(code) {
    const normalized = setStoredLocale(code);
    locale.value = normalized;
    i18n.global.locale.value = normalized;
    document.documentElement.lang = normalized;
    return normalized;
  }

  async function setLocale(code, { persistProfile = true, userId = null } = {}) {
    const normalized = applyLocale(code);
    if (persistProfile && userId) {
      try {
        await api.put(`/users/${userId}`, { language: normalized });
      } catch {
        // localStorage still holds preference
      }
    }
    return normalized;
  }

  function syncFromUser(user) {
    if (user?.language) {
      applyLocale(user.language);
    }
  }

  watch(locale, (value) => {
    document.documentElement.lang = normalizeLocale(value);
  }, { immediate: true });

  return { locale, applyLocale, setLocale, syncFromUser };
});
