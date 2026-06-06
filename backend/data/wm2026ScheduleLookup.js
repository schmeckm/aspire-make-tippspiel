const { WM2026_MATCH_SCHEDULE } = require('./wm2026MatchSchedule');
const { normalizeStadiumKey } = require('./wm2026Venues');

const TEAM_ALIAS_GROUPS = [
  ['mexico', 'mexiko'],
  ['south africa', 'suedafrika', 'sudafrika'],
  ['south korea', 'suedkorea', 'sudkorea', 'korea republic'],
  ['czechia', 'czech republic', 'tschechien'],
  ['canada', 'kanada'],
  ['bosnia herzegovina', 'bosnia and herzegovina', 'bosnien und herzegowina'],
  ['qatar', 'katar'],
  ['switzerland', 'schweiz'],
  ['brazil', 'brasilien'],
  ['morocco', 'marokko'],
  ['haiti'],
  ['scotland', 'schottland'],
  ['united states', 'usa', 'vereinigte staaten'],
  ['paraguay'],
  ['australia', 'australien'],
  ['turkey', 'tuerkei', 'turkei'],
  ['germany', 'deutschland'],
  ['curacao', 'curaçao'],
  ['ivory coast', 'cote divoire', 'elfenbeinkueste', 'elfenbeinkuste'],
  ['ecuador'],
  ['netherlands', 'niederlande'],
  ['japan'],
  ['sweden', 'schweden'],
  ['tunisia', 'tunesien'],
  ['belgium', 'belgien'],
  ['egypt', 'aegypten', 'agypten', 'ägypten'],
  ['iran'],
  ['new zealand', 'neuseeland'],
  ['spain', 'spanien'],
  ['cape verde', 'kap verde'],
  ['saudi arabia', 'saudi arabien'],
  ['uruguay'],
  ['france', 'frankreich'],
  ['senegal'],
  ['iraq', 'irak'],
  ['norway', 'norwegen'],
  ['argentina', 'argentinien'],
  ['algeria', 'algerien'],
  ['austria', 'oesterreich', 'osterreich', 'österreich'],
  ['jordan', 'jordanien'],
  ['portugal'],
  ['dr congo', 'dr kongo', 'democratic republic of the congo', 'demokratische republik kongo'],
  ['uzbekistan', 'usbekistan'],
  ['colombia', 'kolumbien'],
  ['england'],
  ['croatia', 'kroatien'],
  ['ghana'],
  ['panama'],
];

function normalizeTeamName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function teamsMatch(a, b) {
  const left = normalizeTeamName(a);
  const right = normalizeTeamName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;

  for (const group of TEAM_ALIAS_GROUPS) {
    if (group.includes(left) && group.includes(right)) return true;
    if (group.some((alias) => left.includes(alias)) && group.some((alias) => right.includes(alias))) {
      return true;
    }
  }
  return false;
}

function fixtureKey(homeTeam, awayTeam) {
  return `${normalizeTeamName(homeTeam)}|${normalizeTeamName(awayTeam)}`;
}

const SCHEDULE_BY_TEAMS = new Map();
for (const entry of WM2026_MATCH_SCHEDULE) {
  SCHEDULE_BY_TEAMS.set(fixtureKey(entry.homeTeam, entry.awayTeam), entry);
}

function resolveVenueFromWm2026Schedule(homeTeam, awayTeam) {
  const direct = SCHEDULE_BY_TEAMS.get(fixtureKey(homeTeam, awayTeam));
  if (direct) {
    return { stadium: direct.stadium, city: direct.city };
  }

  for (const entry of WM2026_MATCH_SCHEDULE) {
    if (teamsMatch(entry.homeTeam, homeTeam) && teamsMatch(entry.awayTeam, awayTeam)) {
      return { stadium: entry.stadium, city: entry.city };
    }
  }

  return null;
}

module.exports = {
  normalizeTeamName,
  teamsMatch,
  resolveVenueFromWm2026Schedule,
};
