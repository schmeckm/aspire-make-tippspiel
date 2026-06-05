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

/** vue-i18n v9: @ starts linked messages — escape literal @ in emails etc. */
export function escapeI18nAtSign(text) {
  if (typeof text !== 'string' || text.includes("{'@'}")) return text;
  return text.replace(/@(?![:.])/g, "{'@'}");
}

export function preprocessLocaleMessages(messages) {
  if (typeof messages === 'string') return escapeI18nAtSign(messages);
  if (Array.isArray(messages)) return messages.map(preprocessLocaleMessages);
  if (messages && typeof messages === 'object') {
    return Object.fromEntries(
      Object.entries(messages).map(([key, value]) => [key, preprocessLocaleMessages(value)]),
    );
  }
  return messages;
}

const i18n = createI18n({
  legacy: false,
  locale: getStoredLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: {
    de: preprocessLocaleMessages(de),
    en: preprocessLocaleMessages(en),
    es: preprocessLocaleMessages(es),
    fr: preprocessLocaleMessages(fr),
  },
});

export default i18n;
