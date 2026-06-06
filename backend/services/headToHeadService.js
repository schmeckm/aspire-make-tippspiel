const { Op } = require('sequelize');
const { Match } = require('../models');
const footballDataProvider = require('./providers/footballDataProvider');
const { getProviderConfig, assertApiConfigured } = require('./footballProviderService');
const { findTeamByName, listTeams } = require('./footballTeamService');

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_COMPETITIONS = 'WC';
const DEFAULT_LIMIT = 15;

const cache = new Map();

function normalizeTeamKey(name) {
  return String(name || '').trim().toLowerCase();
}

function teamsMatch(nameA, nameB) {
  const a = normalizeTeamKey(nameA);
  const b = normalizeTeamKey(nameB);
  return a === b || a.includes(b) || b.includes(a);
}

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return { ...entry.data, cached: true };
}

function cacheSet(key, data) {
  cache.set(key, { data: { ...data, cached: false }, fetchedAt: Date.now() });
}

function extractSeasonYear(season) {
  if (!season?.startDate) return null;
  const year = parseInt(String(season.startDate).slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

function normalizeMeeting(apiMatch) {
  const homeScore = apiMatch.score?.home;
  const awayScore = apiMatch.score?.away;
  let winner = null;
  if (homeScore != null && awayScore != null) {
    if (homeScore > awayScore) winner = 'home';
    else if (awayScore > homeScore) winner = 'away';
    else winner = 'draw';
  }

  return {
    id: apiMatch.id,
    date: apiMatch.utcDate,
    competition: apiMatch.competition?.name || null,
    seasonYear: extractSeasonYear(apiMatch.season),
    stage: apiMatch.stage || null,
    homeTeam: apiMatch.homeTeam?.name || null,
    awayTeam: apiMatch.awayTeam?.name || null,
    homeScore,
    awayScore,
    winner,
  };
}

function computeSummary(meetings, teamAName, teamBName) {
  let teamAWins = 0;
  let teamBWins = 0;
  let draws = 0;
  let totalGoals = 0;
  let counted = 0;

  for (const meeting of meetings) {
    if (meeting.homeScore == null || meeting.awayScore == null) continue;
    counted += 1;
    totalGoals += meeting.homeScore + meeting.awayScore;

    const teamAIsHome = teamsMatch(meeting.homeTeam, teamAName);
    if (meeting.winner === 'draw') {
      draws += 1;
    } else if (meeting.winner === 'home') {
      if (teamAIsHome) teamAWins += 1;
      else teamBWins += 1;
    } else if (meeting.winner === 'away') {
      if (teamAIsHome) teamBWins += 1;
      else teamAWins += 1;
    }
  }

  return {
    totalMatches: counted,
    totalGoals,
    teamAWins,
    teamBWins,
    draws,
  };
}

function buildResult({ teamAName, teamBName, meetings, competitions, source = 'football-data.org' }) {
  const summary = computeSummary(meetings, teamAName, teamBName);
  return {
    available: true,
    teamA: teamAName,
    teamB: teamBName,
    competitions,
    summary,
    meetings,
    source,
  };
}

async function findBridgeExternalMatchId(config, teamAId, teamBId, competitions) {
  const { matches } = await footballDataProvider.fetchTeamMatches(config, teamAId, {
    competitions,
    limit: 100,
    status: 'FINISHED',
  });

  const bridge = matches.find((m) => (
    m.homeTeam?.id === teamBId || m.awayTeam?.id === teamBId
  ));
  if (bridge?.id) return String(bridge.id);

  const { matches: reverseMatches } = await footballDataProvider.fetchTeamMatches(config, teamBId, {
    competitions,
    limit: 100,
    status: 'FINISHED',
  });

  const reverseBridge = reverseMatches.find((m) => (
    m.homeTeam?.id === teamAId || m.awayTeam?.id === teamAId
  ));
  return reverseBridge?.id ? String(reverseBridge.id) : null;
}

async function findBridgeFromLocalMatch(teamAName, teamBName) {
  const matches = await Match.findAll({
    where: {
      externalApiId: { [Op.ne]: null },
    },
    order: [['kickoffTime', 'DESC']],
    limit: 200,
  });

  const bridge = matches.find((m) => (
    (teamsMatch(m.homeTeam, teamAName) && teamsMatch(m.awayTeam, teamBName))
    || (teamsMatch(m.homeTeam, teamBName) && teamsMatch(m.awayTeam, teamAName))
  ));

  return bridge?.externalApiId ? String(bridge.externalApiId) : null;
}

async function fetchHead2HeadData({
  externalMatchId,
  teamAName,
  teamBName,
  competitions = DEFAULT_COMPETITIONS,
  limit = DEFAULT_LIMIT,
}) {
  const config = await getProviderConfig();
  assertApiConfigured(config);

  const { matches } = await footballDataProvider.fetchHead2Head(config, externalMatchId, {
    competitions,
    limit,
  });

  const meetings = matches
    .map(normalizeMeeting)
    .filter((m) => m.homeScore != null && m.awayScore != null)
    .slice(0, limit);

  return buildResult({
    teamAName,
    teamBName,
    meetings,
    competitions,
  });
}

async function resolveTeamById(teamId, fallbackName = null) {
  const id = parseInt(teamId, 10);
  if (!Number.isFinite(id)) return null;
  const teams = await listTeams();
  const team = teams.find((t) => t.id === id);
  if (!team && !fallbackName) return null;
  return { id, name: fallbackName || team?.name || null };
}

async function getHead2HeadByTeamIds(teamAId, teamBId, {
  teamAName = null,
  teamBName = null,
  competitions = DEFAULT_COMPETITIONS,
  limit = DEFAULT_LIMIT,
} = {}) {
  const cacheKey = `teams:${teamAId}:${teamBId}:${competitions}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const config = await getProviderConfig();
  assertApiConfigured(config);

  const resolvedA = await resolveTeamById(teamAId, teamAName);
  const resolvedB = await resolveTeamById(teamBId, teamBName);
  if (!resolvedA?.name || !resolvedB?.name) {
    return { available: false, reason: 'team_not_found' };
  }

  const labelA = resolvedA.name;
  const labelB = resolvedB.name;

  let externalMatchId = await findBridgeFromLocalMatch(labelA, labelB);
  if (!externalMatchId) {
    externalMatchId = await findBridgeExternalMatchId(config, resolvedA.id, resolvedB.id, competitions);
  }

  if (!externalMatchId) {
    const empty = {
      available: true,
      teamA: labelA,
      teamB: labelB,
      competitions,
      summary: {
        totalMatches: 0, totalGoals: 0, teamAWins: 0, teamBWins: 0, draws: 0,
      },
      meetings: [],
      source: 'football-data.org',
    };
    cacheSet(cacheKey, empty);
    return empty;
  }

  const result = await fetchHead2HeadData({
    externalMatchId,
    teamAName: labelA,
    teamBName: labelB,
    competitions,
    limit,
  });

  cacheSet(cacheKey, result);
  return result;
}

async function getHead2HeadForMatch(matchId, {
  competitions = DEFAULT_COMPETITIONS,
  limit = DEFAULT_LIMIT,
} = {}) {
  const match = await Match.findByPk(matchId);
  if (!match) return null;

  const cacheKey = `match:${matchId}:${competitions}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  if (match.externalApiId) {
    const result = await fetchHead2HeadData({
      externalMatchId: match.externalApiId,
      teamAName: match.homeTeam,
      teamBName: match.awayTeam,
      competitions,
      limit,
    });
    cacheSet(cacheKey, result);
    return result;
  }

  const home = await findTeamByName(match.homeTeam);
  const away = await findTeamByName(match.awayTeam);
  if (!home?.id || !away?.id) {
    return {
      available: false,
      reason: 'no_api_id',
      teamA: match.homeTeam,
      teamB: match.awayTeam,
    };
  }

  const result = await getHead2HeadByTeamIds(home.id, away.id, {
    teamAName: match.homeTeam,
    teamBName: match.awayTeam,
    competitions,
    limit,
  });

  if (result.available) {
    cacheSet(cacheKey, result);
  }
  return result;
}

async function getHead2HeadForAiContext(matchId) {
  try {
    const data = await getHead2HeadForMatch(matchId, { limit: 8 });
    if (!data?.available || !data.summary?.totalMatches) return null;
    return {
      competitions: data.competitions,
      summary: data.summary,
      teamA: data.teamA,
      teamB: data.teamB,
      lastMeetings: data.meetings.slice(0, 5).map((m) => ({
        date: m.date,
        competition: m.competition,
        seasonYear: m.seasonYear,
        stage: m.stage,
        score: `${m.homeScore}:${m.awayScore}`,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
      })),
    };
  } catch (error) {
    console.warn(`Head2Head AI context skipped for match ${matchId}:`, error.message);
    return null;
  }
}

module.exports = {
  getHead2HeadForMatch,
  getHead2HeadByTeamIds,
  getHead2HeadForAiContext,
  computeSummary,
  teamsMatch,
};
