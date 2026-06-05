import { createI18n } from 'vue-i18n';
import de from '../locales/de.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';

export const SUPPORTED_LOCALES = ['de', 'en', 'es', 'fr'];
export const DEFAULT_LOCALE = 'de';
export const LOCALE_STORAGE_KEY = 'locale';

export function normalizeLocale(locale) {
  if (!locale) return DEFAULT_LOCALE;
  const code = String(locale).toLowerCase().split('-')[0];
  return SUPPORTED_LOCALES.includes(code) ? code : DEFAULT_LOCALE;
}

export function getStoredLocale() {
  return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
}

export function setStoredLocale(locale) {
  const normalized = normalizeLocale(locale);
  localStorage.setItem(LOCALE_STORAGE_KEY, normalized);
  return normalized;
}

const i18n = createI18n({
  legacy: false,
  locale: getStoredLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: { de, en, es, fr },
});

export default i18n;
