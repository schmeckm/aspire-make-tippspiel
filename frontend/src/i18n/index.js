import { createI18n } from 'vue-i18n';
import de from '../locales/de.json';

export const SUPPORTED_LOCALES = ['de', 'en', 'es', 'fr', 'pt', 'pl', 'tr'];
export const DEFAULT_LOCALE = 'de';
export const LOCALE_STORAGE_KEY = 'locale';

const localeLoaders = {
  en: () => import('../locales/en.json'),
  es: () => import('../locales/es.json'),
  fr: () => import('../locales/fr.json'),
  pt: () => import('../locales/pt.json'),
  pl: () => import('../locales/pl.json'),
  tr: () => import('../locales/tr.js'),
};

const loadedLocales = new Set([DEFAULT_LOCALE]);

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
  fallbackLocale: ['en', DEFAULT_LOCALE],
  messages: {
    de: preprocessLocaleMessages(de),
  },
});

export async function loadLocaleMessages(locale) {
  const normalized = normalizeLocale(locale);
  if (loadedLocales.has(normalized)) {
    return normalized;
  }

  const loader = localeLoaders[normalized];
  if (!loader) {
    return DEFAULT_LOCALE;
  }

  const mod = await loader();
  i18n.global.setLocaleMessage(normalized, preprocessLocaleMessages(mod.default));
  loadedLocales.add(normalized);
  return normalized;
}

export default i18n;
