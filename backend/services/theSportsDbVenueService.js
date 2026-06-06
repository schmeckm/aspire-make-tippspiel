const { Match } = require('../models');
const { fetchTheSportsDb, isVenueEnrichmentEnabled, getTheSportsDbApiKey } = require('./providers/theSportsDbClient');

const DEFAULT_LEAGUE_ID = '4429';
const DEFAULT_SEASON = '2026';

const TEAM_ALIAS_GROUPS = [
  ['czechia', 'czech republic'],
  ['south korea', 'korea republic', 'korea south'],
  ['usa', 'united states'],
  ['ivory coast', 'cote divoire'],
  ['curacao', 'curaçao'],
  ['bosnia herzegovina', 'bosnia-herzegovina'],
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

function teamsMatch(localName, remoteName) {
  const a = normalizeTeamName(localName);
  const b = normalizeTeamName(remoteName);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  for (const group of TEAM_ALIAS_GROUPS) {
    if (group.includes(a) && group.includes(b)) return true;
    if (group.some((alias) => a.includes(alias)) && group.some((alias) => b.includes(alias))) {
      return true;
    }
  }
  return false;
}

function kickoffDateKeys(kickoffTime) {
  const date = new Date(kickoffTime);
  if (Number.isNaN(date.getTime())) return [];
  const utc = date.toISOString().slice(0, 10);
  const prev = new Date(date);
  prev.setUTCDate(prev.getUTCDate() - 1);
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return [...new Set([utc, prev.toISOString().slice(0, 10), next.toISOString().slice(0, 10)])];
}

function findMatchingEvent(events, match) {
  const dateKeys = kickoffDateKeys(match.kickoffTime);
  return events.find((event) => {
    if (!dateKeys.includes(event.dateEvent)) return false;
    return teamsMatch(match.homeTeam, event.strHomeTeam)
      && teamsMatch(match.awayTeam, event.strAwayTeam);
  }) || null;
}

async function fetchWorldCupEvents(config = {}) {
  const leagueId = config.leagueId
    || process.env.THESPORTSDB_LEAGUE_ID
    || DEFAULT_LEAGUE_ID;
  const season = config.season
    || process.env.THESPORTSDB_SEASON
    || DEFAULT_SEASON;

  const data = await fetchTheSportsDb('eventsseason.php', { id: leagueId, s: season }, config);
  return data.events || [];
}

async function enrichMatchVenuesFromTheSportsDb(config = {}) {
  if (!isVenueEnrichmentEnabled()) {
    return { skipped: true, message: 'TheSportsDB Venue-Anreicherung ist deaktiviert.' };
  }

  if (!getTheSportsDbApiKey()) {
    return { skipped: true, message: 'TheSportsDB API-Key fehlt.' };
  }

  const events = await fetchWorldCupEvents(config);
  if (!events.length) {
    return { skipped: true, message: 'Keine TheSportsDB-Events für die WM gefunden.' };
  }

  const matches = await Match.findAll({
    where: {},
    order: [['kickoffTime', 'ASC']],
  });

  let enrichedCount = 0;
  let skippedCount = 0;
  const errors = [];

  for (const match of matches) {
    if (match.stadium && match.city) {
      skippedCount++;
      continue;
    }

    try {
      const event = findMatchingEvent(events, match);
      if (!event) {
        skippedCount++;
        continue;
      }

      const updates = {};
      if (!match.stadium && event.strVenue) updates.stadium = event.strVenue.trim();
      if (!match.city && event.strCountry) updates.city = event.strCountry.trim();

      if (!Object.keys(updates).length) {
        skippedCount++;
        continue;
      }

      await match.update(updates);
      enrichedCount++;
    } catch (error) {
      errors.push({ matchId: match.id, message: error.message });
    }
  }

  return {
    enrichedCount,
    skippedCount,
    eventCount: events.length,
    errors,
    message: `${enrichedCount} Spiel(e) mit Stadion/Ort aus TheSportsDB angereichert.`,
  };
}

module.exports = {
  normalizeTeamName,
  teamsMatch,
  findMatchingEvent,
  fetchWorldCupEvents,
  enrichMatchVenuesFromTheSportsDb,
};
