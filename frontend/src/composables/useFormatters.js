import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const INTL_LOCALES = {
  de: 'de-DE',
  en: 'en-GB',
  es: 'es-ES',
  fr: 'fr-FR',
};

export function useFormatters() {
  const { locale } = useI18n();

  const intlLocale = computed(() => INTL_LOCALES[locale.value] || INTL_LOCALES.de);

  function formatDate(value, options = {}) {
    if (!value) return '–';
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(intlLocale.value, {
      day: '2-digit', month: '2-digit', year: 'numeric', ...options,
    }).format(date);
  }

  function formatTime(value, options = {}) {
    if (!value) return '–';
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(intlLocale.value, {
      hour: '2-digit', minute: '2-digit', ...options,
    }).format(date);
  }

  function formatDateTime(value, options = {}) {
    if (!value) return '–';
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(intlLocale.value, {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', ...options,
    }).format(date);
  }

  function formatNumber(value, options = {}) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '–';
    return new Intl.NumberFormat(intlLocale.value, options).format(Number(value));
  }

  function formatPoints(value) {
    return formatNumber(value, { maximumFractionDigits: 2 });
  }

  function formatPercent(value) {
    return formatNumber(value, { maximumFractionDigits: 0 });
  }

  return {
    intlLocale,
    formatDate,
    formatTime,
    formatDateTime,
    formatNumber,
    formatPoints,
    formatPercent,
  };
}
