import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

const STORAGE_KEY = 'theme';
const THEME_MIGRATION_KEY = 'theme-migration-v';
const THEME_MIGRATION_VERSION = 2;

function readInitialTheme() {
  const migrated = localStorage.getItem(THEME_MIGRATION_KEY);
  if (migrated !== String(THEME_MIGRATION_VERSION)) {
    localStorage.setItem(THEME_MIGRATION_KEY, String(THEME_MIGRATION_VERSION));
    return 'dark';
  }
  return localStorage.getItem(STORAGE_KEY) || 'dark';
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref(readInitialTheme());

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
