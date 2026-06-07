const { Op } = require('sequelize');
const { Match } = require('../models');
const footballDataProvider = require('./providers/footballDataProvider');
const { getProviderConfig, assertApiConfigured } = require('./footballProviderService');
const { findTeamByName, listTeams } = require('./footballTeamService');
const { findHistoricalHeadToHead } = require('../data/wcHistoricalHeadToHead');

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_VERSION = 'v4';
const BRIDGE_SEARCH_MAX_DAYS = 750;
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

function formatApiDate(date) {
  return date.toISOString().slice(0, 10);
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
    breakdownAvailable: counted > 0,
  };
}

function mapAggregatesToSummary(aggregates, teamAName, teamBName, refHomeName, refAwayName) {
  if (!aggregates?.numberOfMatches) {
    return {
      totalMatches: 0, totalGoals: 0, teamAWins: 0, teamBWins: 0, draws: 0, breakdownAvailable: false,
    };
  }

  const homeAgg = aggregates.homeTeam || {};
  const awayAgg = aggregates.awayTeam || {};
  const refHome = refHomeName || homeAgg.name;
  const refAway = refAwayName || awayAgg.name;

  let homeWins = homeAgg.wins ?? 0;
  let homeDraws = homeAgg.draws ?? 0;
  let homeLosses = homeAgg.losses ?? 0;
  let awayWins = awayAgg.wins ?? 0;
  let awayDraws = awayAgg.draws ?? 0;
  let awayLosses = awayAgg.losses ?? 0;

  if (homeWins + awayWins === 0 && (homeLosses > 0 || awayLosses > 0)) {
    homeWins = awayLosses;
    awayWins = homeLosses;
  }

  const draws = Math.max(homeDraws, awayDraws, 0);
  const breakdownAvailable = (homeWins + awayWins + draws) > 0;

  let teamAWins = 0;
  let teamBWins = 0;
  if (breakdownAvailable) {
    if (teamsMatch(refHome, teamAName) || teamsMatch(homeAgg.name, teamAName)) {
      teamAWins = homeWins;
      teamBWins = awayWins;
    } else if (teamsMatch(refAway, teamAName) || teamsMatch(awayAgg.name, teamAName)) {
      teamAWins = awayWins;
      teamBWins = homeWins;
    } else {
      teamAWins = awayWins;
      teamBWins = homeWins;
    }
  }

  return {
    totalMatches: aggregates.numberOfMatches,
    totalGoals: aggregates.totalGoals ?? 0,
    teamAWins,
    teamBWins,
    draws,
    breakdownAvailable,
  };
}

function buildUnavailable(teamAName, teamBName, reason = 'incomplete_data') {
  return {
    available: false,
    reason,
    teamA: teamAName,
    teamB: teamBName,
  };
}

function buildResult({
  teamAName,
  teamBName,
  meetings,
  summary,
  competitions,
  detailLevel = 'full',
  source = 'football-data.org',
  statsPartial = false,
}) {
  return {
    available: true,
    teamA: teamAName,
    teamB: teamBName,
    competitions,
    summary,
    meetings,
    detailLevel,
    matchListLimited: detailLevel === 'summary_only',
    statsPartial,
    source,
  };
}

function buildHistoricalFallbackResult(teamAName, teamBName, competitions) {
  const historical = findHistoricalHeadToHead(teamAName, teamBName);
  if (!historical?.meetings?.length) return null;

  const summary = computeSummary(historical.meetings, teamAName, teamBName);
  return buildResult({
    teamAName,
    teamBName,
    meetings: historical.meetings,
    summary,
    competitions,
    detailLevel: 'full',
    source: 'fifa-wc-records',
  });
}

function findOpponentMatch(matches, teamAId, teamBId) {
  return matches.find((m) => (
    (m.homeTeam?.id === teamAId && m.awayTeam?.id === teamBId)
    || (m.homeTeam?.id === teamBId && m.awayTeam?.id === teamAId)
  )) || null;
}

async function findBridgeExternalMatch(config, teamAId, teamBId) {
  const today = new Date();
  const recentFrom = new Date(today);
  recentFrom.setDate(recentFrom.getDate() - BRIDGE_SEARCH_MAX_DAYS);

  const strategies = [
    { limit: 100 },
    { limit: 100, dateFrom: formatApiDate(recentFrom), dateTo: formatApiDate(today) },
    { limit: 50, status: 'FINISHED', dateFrom: formatApiDate(recentFrom), dateTo: formatApiDate(today) },
  ];

  for (const teamId of [teamAId, teamBId]) {
    for (const params of strategies) {
      try {
        const { matches } = await footballDataProvider.fetchTeamMatches(config, teamId, params);
        const bridge = findOpponentMatch(matches, teamAId, teamBId);
        if (bridge?.id) {
          return {
            id: String(bridge.id),
            homeTeam: bridge.homeTeam?.name,
            awayTeam: bridge.awayTeam?.name,
          };
        }
      } catch (error) {
        if (error.status !== 403) {
          console.warn(`Head2Head bridge search (team ${teamId}):`, error.message);
        }
      }
    }
  }

  return null;
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

  if (!bridge?.externalApiId) return null;
  return {
    id: String(bridge.externalApiId),
    homeTeam: bridge.homeTeam,
    awayTeam: bridge.awayTeam,
  };
}

async function resolveBridgeReference(config, bridge) {
  if (bridge?.homeTeam && bridge?.awayTeam) return bridge;
  if (!bridge?.id) return bridge;
  try {
    const match = await footballDataProvider.fetchMatchById(config, bridge.id);
    return {
      id: bridge.id,
      homeTeam: match.homeTeam?.name,
      awayTeam: match.awayTeam?.name,
    };
  } catch {
    return bridge;
  }
}

async function fetchHead2HeadData({
  externalMatchId,
  teamAName,
  teamBName,
  refHomeName = null,
  refAwayName = null,
  competitions = DEFAULT_COMPETITIONS,
  limit = DEFAULT_LIMIT,
}) {
  const config = await getProviderConfig();
  assertApiConfigured(config);

  const { matches, aggregates, referenceMatch } = await footballDataProvider.fetchHead2Head(config, externalMatchId, {
    competitions,
    limit,
  });

  const meetings = matches
    .map(normalizeMeeting)
    .filter((m) => m.homeScore != null && m.awayScore != null)
    .slice(0, limit);

  const refHome = refHomeName || referenceMatch?.homeTeam?.name || aggregates?.homeTeam?.name || null;
  const refAway = refAwayName || referenceMatch?.awayTeam?.name || aggregates?.awayTeam?.name || null;

  let summary;
  let detailLevel = 'none';

  let statsPartial = false;

  if (meetings.length > 0) {
    summary = computeSummary(meetings, teamAName, teamBName);
    detailLevel = 'full';
  } else if (aggregates?.numberOfMatches) {
    summary = mapAggregatesToSummary(aggregates, teamAName, teamBName, refHome, refAway);
    if (summary.breakdownAvailable) {
      detailLevel = 'summary_only';
    } else {
      summary = {
        totalMatches: aggregates.numberOfMatches,
        totalGoals: aggregates.totalGoals ?? 0,
        teamAWins: null,
        teamBWins: null,
        draws: null,
        breakdownAvailable: false,
      };
      detailLevel = 'summary_only';
      statsPartial = true;
    }
  } else {
    summary = {
      totalMatches: 0, totalGoals: 0, teamAWins: 0, teamBWins: 0, draws: 0, breakdownAvailable: false,
    };
  }

  return buildResult({
    teamAName,
    teamBName,
    meetings,
    summary,
    competitions,
    detailLevel,
    statsPartial,
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
  const cacheKey = `${CACHE_VERSION}:teams:${teamAId}:${teamBId}:${competitions}:${limit}`;
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

  let bridge = await findBridgeFromLocalMatch(labelA, labelB);
  if (!bridge) {
    bridge = await findBridgeExternalMatch(config, resolvedA.id, resolvedB.id);
  }
  bridge = await resolveBridgeReference(config, bridge);

  if (!bridge?.id) {
    const fallback = buildHistoricalFallbackResult(labelA, labelB, competitions);
    if (fallback) {
      cacheSet(cacheKey, fallback);
      return fallback;
    }

    const empty = buildResult({
      teamAName: labelA,
      teamBName: labelB,
      meetings: [],
      summary: {
        totalMatches: 0, totalGoals: 0, teamAWins: 0, teamBWins: 0, draws: 0, breakdownAvailable: false,
      },
      competitions,
      detailLevel: 'none',
      statsPartial: false,
    });
    cacheSet(cacheKey, empty);
    return empty;
  }

  const result = await fetchHead2HeadData({
    externalMatchId: bridge.id,
    teamAName: labelA,
    teamBName: labelB,
    refHomeName: bridge.homeTeam,
    refAwayName: bridge.awayTeam,
    competitions,
    limit,
  });

  if ((result.summary?.totalMatches || 0) === 0 && (result.meetings?.length || 0) === 0) {
    const fallback = buildHistoricalFallbackResult(labelA, labelB, competitions);
    if (fallback) {
      cacheSet(cacheKey, fallback);
      return fallback;
    }
  }

  cacheSet(cacheKey, result);
  return result;
}

async function getHead2HeadForMatch(matchId, {
  competitions = DEFAULT_COMPETITIONS,
  limit = DEFAULT_LIMIT,
} = {}) {
  const match = await Match.findByPk(matchId);
  if (!match) return null;

  const cacheKey = `${CACHE_VERSION}:match:${matchId}:${competitions}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  if (match.externalApiId) {
    const result = await fetchHead2HeadData({
      externalMatchId: match.externalApiId,
      teamAName: match.homeTeam,
      teamBName: match.awayTeam,
      refHomeName: match.homeTeam,
      refAwayName: match.awayTeam,
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
    if (!data?.available || !data.summary?.totalMatches || data.summary?.breakdownAvailable === false) return null;
    return {
      competitions: data.competitions,
      summary: data.summary,
      teamA: data.teamA,
      teamB: data.teamB,
      detailLevel: data.detailLevel,
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
  mapAggregatesToSummary,
  teamsMatch,
};
