export const LOCALE_FLAGS = {
  de: '🇩🇪',
  en: '🇬🇧',
  es: '🇪🇸',
  fr: '🇫🇷',
  pt: '🇵🇹',
  pl: '🇵🇱',
  tr: '🇹🇷',
};

export const LOCALE_FLAG_IMAGES = {
  de: 'https://flagcdn.com/w40/de.png',
  en: 'https://flagcdn.com/w40/gb.png',
  es: 'https://flagcdn.com/w40/es.png',
  fr: 'https://flagcdn.com/w40/fr.png',
  pt: 'https://flagcdn.com/w40/pt.png',
  pl: 'https://flagcdn.com/w40/pl.png',
  tr: 'https://flagcdn.com/w40/tr.png',
};

const TEAM_TO_ISO = {
  algerien: 'DZ', algeria: 'DZ',
  argentinien: 'AR', argentina: 'AR',
  australien: 'AU', australia: 'AU',
  belgien: 'BE', belgium: 'BE',
  'bosnien und herzegowina': 'BA', 'bosnia and herzegovina': 'BA', 'bosnia herzegovina': 'BA',
  brasilien: 'BR', brazil: 'BR',
  canada: 'CA', kanada: 'CA',
  'kap verde': 'CV', 'cape verde': 'CV',
  chile: 'CL',
  china: 'CN',
  'costa rica': 'CR',
  curacao: 'CW', curaçao: 'CW',
  'czech republic': 'CZ', czechia: 'CZ', tschechien: 'CZ',
  deutschland: 'DE', germany: 'DE',
  'dr kongo': 'CD', 'dr congo': 'CD', 'congo dr': 'CD',
  'democratic republic of the congo': 'CD', 'demokratische republik kongo': 'CD',
  'demokratische republik des kongo': 'CD',
  ecuador: 'EC',
  ägypten: 'EG', aegypten: 'EG', agypten: 'EG', egypt: 'EG',
  elfenbeinküste: 'CI', elfenbeinkuste: 'CI', 'ivory coast': 'CI', "cote d'ivoire": 'CI', 'cote divoire': 'CI',
  england: 'GB', 'england national': 'GB',
  frankreich: 'FR', france: 'FR',
  ghana: 'GH',
  haiti: 'HT',
  iran: 'IR',
  irak: 'IQ', iraq: 'IQ',
  italien: 'IT', italy: 'IT',
  japan: 'JP',
  jordanien: 'JO', jordan: 'JO',
  kamerun: 'CM', cameroon: 'CM',
  katar: 'QA', qatar: 'QA',
  kolumbien: 'CO', colombia: 'CO',
  kroatien: 'HR', croatia: 'HR',
  marokko: 'MA', morocco: 'MA',
  mexiko: 'MX', mexico: 'MX',
  niederlande: 'NL', netherlands: 'NL',
  neuseeland: 'NZ', 'new zealand': 'NZ',
  nordmazedonien: 'MK', 'north macedonia': 'MK',
  nordirland: 'GB',
  norwegen: 'NO', norway: 'NO',
  österreich: 'AT', osterreich: 'AT', austria: 'AT',
  panama: 'PA',
  paraguay: 'PY',
  peru: 'PE',
  polen: 'PL', poland: 'PL',
  portugal: 'PT',
  'saudi-arabien': 'SA', 'saudi arabia': 'SA',
  schottland: 'GB', scotland: 'GB',
  schweden: 'SE', sweden: 'SE',
  schweiz: 'CH', switzerland: 'CH',
  senegal: 'SN',
  serbien: 'RS', serbia: 'RS',
  spanien: 'ES', spain: 'ES',
  südkorea: 'KR', suedkorea: 'KR', sudkorea: 'KR', 'south korea': 'KR', 'korea republic': 'KR',
  südafrika: 'ZA', suedafrika: 'ZA', sudafrika: 'ZA', 'south africa': 'ZA',
  tunesien: 'TN', tunisia: 'TN',
  türkei: 'TR', turkei: 'TR', tuerkei: 'TR', turkey: 'TR', türkiye: 'TR', turkiye: 'TR',
  uruguay: 'UY',
  usa: 'US', 'united states': 'US', 'vereinigte staaten': 'US',
  usbekistan: 'UZ', uzbekistan: 'UZ',
  ukraine: 'UA',
  ungarn: 'HU', hungary: 'HU',
  wales: 'GB',
  'zentralafrikanische republik': 'CF',
};

function normalizeTeamKey(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export { TEAM_TO_ISO };

export function isoToFlag(iso) {
  if (!iso || iso.length !== 2) return '';
  const code = iso.toUpperCase();
  return String.fromCodePoint(
    ...[...code].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65),
  );
}

export function getLocaleFlag(locale) {
  return LOCALE_FLAGS[locale] || '';
}

export function getLocaleFlagImage(locale) {
  return LOCALE_FLAG_IMAGES[locale] || '';
}

function lookupTeamIso(teamName) {
  if (!teamName?.trim()) return '';
  const raw = teamName.trim().toLowerCase();
  if (TEAM_TO_ISO[raw]) return TEAM_TO_ISO[raw];
  const normalized = normalizeTeamKey(teamName);
  return TEAM_TO_ISO[normalized] || '';
}

export function getTeamFlag(teamName) {
  const iso = lookupTeamIso(teamName);
  return iso ? isoToFlag(iso) : '';
}

export function getTeamIso(teamName) {
  return lookupTeamIso(teamName);
}

export function getTeamFlagImage(teamName, size = 40) {
  const iso = lookupTeamIso(teamName);
  if (!iso) return '';
  return `https://flagcdn.com/w${size}/${iso.toLowerCase()}.png`;
}

export function hasTeamFlag(teamName) {
  return !!getTeamFlag(teamName);
}
