const fs = require('fs');
const path = require('path');

const SUPPORTED_LOCALES = ['de', 'en', 'es', 'fr'];
const DEFAULT_LOCALE = 'de';

const catalogs = {};
for (const locale of SUPPORTED_LOCALES) {
  const filePath = path.join(__dirname, '../locales', `${locale}.json`);
  catalogs[locale] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeLocale(locale) {
  if (!locale) return DEFAULT_LOCALE;
  const code = String(locale).toLowerCase().split('-')[0];
  return SUPPORTED_LOCALES.includes(code) ? code : DEFAULT_LOCALE;
}

function getNestedValue(obj, keyPath) {
  return keyPath.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

function interpolate(text, params = {}) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\{(\w+)\}/g, (_, key) => (params[key] !== undefined ? String(params[key]) : `{${key}}`));
}

function t(key, locale = DEFAULT_LOCALE, params = {}) {
  const normalized = normalizeLocale(locale);
  let value = getNestedValue(catalogs[normalized], key);
  if (value === undefined && normalized !== DEFAULT_LOCALE) {
    value = getNestedValue(catalogs[DEFAULT_LOCALE], key);
  }
  if (value === undefined) return key;
  return interpolate(value, params);
}

function resolveLocale(sources = {}) {
  const { userLanguage, headerLanguage, bodyLanguage, queryLanguage } = sources;
  return normalizeLocale(userLanguage || bodyLanguage || queryLanguage || headerLanguage || DEFAULT_LOCALE);
}

function parseAcceptLanguage(header) {
  if (!header) return null;
  const primary = header.split(',')[0]?.trim().split(';')[0];
  return primary || null;
}

module.exports = {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  normalizeLocale,
  t,
  resolveLocale,
  parseAcceptLanguage,
};
