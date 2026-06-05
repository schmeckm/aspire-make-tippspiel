import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

const STORAGE_KEY = 'theme';

export const useThemeStore = defineStore('theme', () => {
  const theme = ref(localStorage.getItem(STORAGE_KEY) || 'light');

  function applyTheme(value) {
    theme.value = value === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme.value);
    localStorage.setItem(STORAGE_KEY, theme.value);
  }

  function toggleTheme() {
    applyTheme(theme.value === 'dark' ? 'light' : 'dark');
  }

  function initTheme() {
    applyTheme(theme.value);
  }

  watch(theme, (value) => {
    document.documentElement.setAttribute('data-theme', value);
  });

  return { theme, applyTheme, toggleTheme, initTheme };
});
