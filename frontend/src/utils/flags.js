export const LOCALE_FLAGS = {
  de: '🇩🇪',
  en: '🇬🇧',
  es: '🇪🇸',
  fr: '🇫🇷',
};

export const LOCALE_FLAG_IMAGES = {
  de: 'https://flagcdn.com/w40/de.png',
  en: 'https://flagcdn.com/w40/gb.png',
  es: 'https://flagcdn.com/w40/es.png',
  fr: 'https://flagcdn.com/w40/fr.png',
};

const TEAM_TO_ISO = {
  argentinien: 'AR', argentina: 'AR',
  australien: 'AU', australia: 'AU',
  belgien: 'BE', belgium: 'BE',
  brasilien: 'BR', brazil: 'BR',
  canada: 'CA', kanada: 'CA',
  chile: 'CL',
  china: 'CN',
  'costa rica': 'CR',
  deutschland: 'DE', germany: 'DE',
  ecuador: 'EC',
  england: 'GB', 'england national': 'GB',
  frankreich: 'FR', france: 'FR',
  ghana: 'GH',
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
  neuseeland: 'NZ',
  'new zealand': 'NZ',
  nordmazedonien: 'MK', 'north macedonia': 'MK',
  nordirland: 'GB',
  norwegen: 'NO', norway: 'NO',
  österreich: 'AT', osterreich: 'AT', austria: 'AT',
  paraguay: 'PY',
  peru: 'PE',
  polen: 'PL', poland: 'PL',
  portugal: 'PT',
  'saudi-arabien': 'SA', 'saudi arabia': 'SA',
  schottland: 'GB', scotland: 'GB',
  schweiz: 'CH', switzerland: 'CH',
  senegal: 'SN',
  serbien: 'RS', serbia: 'RS',
  spanien: 'ES', spain: 'ES',
  südkorea: 'KR', 'south korea': 'KR', 'korea republic': 'KR',
  tunesien: 'TN', tunisia: 'TN',
  türkei: 'TR', turkei: 'TR', turkey: 'TR',
  uruguay: 'UY',
  usa: 'US', 'united states': 'US', 'vereinigte staaten': 'US',
  ukraine: 'UA',
  ungarn: 'HU', hungary: 'HU',
  wales: 'GB',
  'zentralafrikanische republik': 'CF',
};

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

export function getTeamFlag(teamName) {
  if (!teamName?.trim()) return '';
  const key = teamName.trim().toLowerCase();
  const iso = TEAM_TO_ISO[key];
  return iso ? isoToFlag(iso) : '';
}

export function getTeamIso(teamName) {
  if (!teamName?.trim()) return '';
  return TEAM_TO_ISO[teamName.trim().toLowerCase()] || '';
}

export function hasTeamFlag(teamName) {
  return !!getTeamFlag(teamName);
}
