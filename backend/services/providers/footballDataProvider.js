const { mapStatus, buildNormalizedFixture } = require('./providerUtils');
const {
  extractRateLimits,
  recordRateLimits,
  setThrottled,
} = require('../footballDataRateLimitService');

const NAME = 'football-data';
const DEFAULT_BASE_URL = 'https://api.football-data.org/v4';
const DEFAULT_COMPETITION_CODE = 'WC';
const DEFAULT_COMPETITION_NUMERIC_ID = '2000';
const DEFAULT_SEASON = '2026';

function mapStage(stage) {
  if (!stage) return 'Group Stage';
  const labels = {
    GROUP_STAGE: 'Group Stage',
    LAST_16: 'Round of 16',
    QUARTER_FINALS: 'Quarter-finals',
    SEMI_FINALS: 'Semi-finals',
    THIRD_PLACE: 'Third place',
    FINAL: 'Final',
  };
  return labels[stage] || stage.replace(/_/g, ' ');
}

function mapGroupName(group) {
  if (!group) return null;
  return String(group).replace(/^GROUP_/i, '');
}

function resolveScores(m) {
  const ft = m.score?.fullTime;
  const rt = m.score?.regularTime;
  const ht = m.score?.halfTime;
  const status = String(m.status || '').toUpperCase();
  const isFinished = status === 'FINISHED' || ['FT', 'AET', 'PEN'].includes(status);

  if (isFinished) {
    return {
      homeScore: ft?.home ?? rt?.home ?? null,
      awayScore: ft?.away ?? rt?.away ?? null,
    };
  }

  if (status === 'PAUSED' || status === 'IN_PLAY' || status === 'LIVE') {
    return {
      homeScore: ht?.home ?? rt?.home ?? ft?.home ?? null,
      awayScore: ht?.away ?? rt?.away ?? ft?.away ?? null,
      isLiveScore: true,
    };
  }

  return {
    homeScore: ft?.home ?? rt?.home ?? null,
    awayScore: ft?.away ?? rt?.away ?? null,
  };
}

function normalizeMatch(m) {
  const { homeScore, awayScore, isLiveScore } = resolveScores(m);
  const status = mapStatus(m.status);

  const normalized = {
    ...buildNormalizedFixture({
      externalApiId: m.id,
      stage: mapStage(m.stage),
      groupName: mapGroupName(m.group),
      homeTeam: m.homeTeam?.name || m.homeTeam?.shortName || 'TBD',
      awayTeam: m.awayTeam?.name || m.awayTeam?.shortName || 'TBD',
      kickoffTime: m.utcDate || m.lastUpdated,
      timezone: 'UTC',
      stadium: m.venue || null,
      city: null,
      homeScore: status === 'finished' ? homeScore : (isLiveScore ? homeScore : null),
      awayScore: status === 'finished' ? awayScore : (isLiveScore ? awayScore : null),
      status,
      apiLastStatus: m.status,
    }),
    dataSource: 'api',
    apiProvider: NAME,
    rawJson: JSON.stringify(m),
  };

  if (isLiveScore && status !== 'finished') {
    normalized.liveHomeScore = homeScore;
    normalized.liveAwayScore = awayScore;
  }

  return normalized;
}

function mergeFixtures(existingMap, matches) {
  for (const m of matches || []) {
    const normalized = normalizeMatch(m);
    if (normalized.externalApiId) {
      existingMap.set(normalized.externalApiId, normalized);
    }
  }
  return existingMap;
}

function getCompetitionCandidates(config) {
  const code = config.competitionCode || config.competitionId || DEFAULT_COMPETITION_CODE;
  const numericId = String(config.competitionNumericId || DEFAULT_COMPETITION_NUMERIC_ID);
  const candidates = [code, numericId];
  return [...new Set(candidates)];
}

async function apiRequest(config, path, queryParams = {}) {
  const baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  const url = new URL(`${baseUrl}${path}`);

  for (const [key, value] of Object.entries(queryParams)) {
    if (value != null && value !== '') url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    let response;
    try {
      response = await fetch(url.toString(), {
        headers: { 'X-Auth-Token': config.apiKey },
        signal: controller.signal,
      });
    } catch (error) {
      const cause = error?.cause;
      const parts = [];
      if (error?.name === 'AbortError') parts.push('timeout after 30s');
      if (cause?.code) parts.push(cause.code);
      if (cause?.syscall) parts.push(cause.syscall);
      if (cause?.hostname) parts.push(cause.hostname);
      if (cause?.address) parts.push(cause.address);
      if (cause?.port) parts.push(String(cause.port));
      const detail = parts.length ? ` (${parts.join(' ')})` : '';

      const err = new Error(`football-data.org request failed${detail}: ${url.toString()}`);
      err.cause = error;
      throw err;
    }

    const rateLimits = extractRateLimits(response.headers);
    recordRateLimits(rateLimits);

    if (response.status === 429) {
      setThrottled(15 * 60 * 1000, 'http_429');
      const body = await response.text().catch(() => '');
      throw new Error(`football-data.org Rate-Limit erreicht (429)${body ? `: ${body.slice(0, 120)}` : ''}`);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const err = new Error(`football-data.org ${response.status} ${response.statusText}${body ? ` – ${body.slice(0, 200)}` : ''}`);
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    return { data, rateLimits, url: url.toString() };
  } finally {
    clearTimeout(timer);
  }
}

async function requestWithCompetitionFallback(config, buildPath, queryParams = {}) {
  const candidates = getCompetitionCandidates(config);
  let lastError;

  for (let i = 0; i < candidates.length; i += 1) {
    const competition = candidates[i];
    try {
      const result = await apiRequest(config, buildPath(competition), queryParams);
      return {
        ...result,
        competitionUsed: competition,
        usedFallback: i > 0,
      };
    } catch (error) {
      lastError = error;
      const canFallback = i < candidates.length - 1 && (error.status === 404 || error.status === 400);
      if (!canFallback) break;
    }
  }

  throw lastError;
}

async function fetchCompetitionMatches(config, extraQuery = {}) {
  return requestWithCompetitionFallback(
    config,
    (competition) => `/competitions/${competition}/matches`,
    { season: config.season || DEFAULT_SEASON, ...extraQuery },
  );
}

async function fetchLiveMatchesRequest(config) {
  const candidates = getCompetitionCandidates(config);
  let lastError;

  for (let i = 0; i < candidates.length; i += 1) {
    const competition = candidates[i];
    try {
      return await apiRequest(config, '/matches', {
        competitions: competition,
        status: 'LIVE',
      });
    } catch (error) {
      lastError = error;
      if (i < candidates.length - 1 && (error.status === 404 || error.status === 400)) continue;
      break;
    }
  }

  throw lastError;
}

async function fetchTeams(config) {
  const result = await requestWithCompetitionFallback(
    config,
    (competition) => `/competitions/${competition}/teams`,
    { season: config.season || DEFAULT_SEASON },
  );
  return { teams: result.data.teams || [], rateLimits: result.rateLimits, competitionUsed: result.competitionUsed };
}

function normalizePlayer(p) {
  return {
    id: p.id,
    name: p.name,
    position: p.position || null,
    dateOfBirth: p.dateOfBirth || null,
    nationality: p.nationality || null,
  };
}

function normalizeTeamDetail(t) {
  if (!t) return null;
  return {
    id: t.id,
    name: t.name,
    shortName: t.shortName || t.name,
    tla: t.tla || null,
    crest: t.crest || t.area?.flag || null,
    area: t.area ? { name: t.area.name, code: t.area.code, flag: t.area.flag } : null,
    coach: t.coach ? {
      name: t.coach.name || `${t.coach.firstName || ''} ${t.coach.lastName || ''}`.trim(),
      nationality: t.coach.nationality || null,
    } : null,
    squad: (t.squad || []).map(normalizePlayer),
  };
}

async function fetchTeamById(config, teamId) {
  const result = await apiRequest(config, `/teams/${teamId}`);
  return { team: normalizeTeamDetail(result.data), rateLimits: result.rateLimits };
}

const MATCH_QUERY_KEYS = [
  'status', 'date', 'dateFrom', 'dateTo', 'stage', 'group', 'matchday', 'season', 'limit', 'offset', 'competitions',
];

const STANDING_QUERY_KEYS = ['matchday', 'season', 'date'];
const SCORER_QUERY_KEYS = ['limit', 'season'];

function pickQuery(source, allowedKeys) {
  const query = {};
  for (const key of allowedKeys) {
    if (source[key] != null && source[key] !== '') query[key] = source[key];
  }
  return query;
}

function normalizeStandingTable(table) {
  return (table || []).map((row) => ({
    position: row.position,
    team: {
      id: row.team?.id,
      name: row.team?.name,
      shortName: row.team?.shortName,
      tla: row.team?.tla,
      crest: row.team?.crest,
    },
    playedGames: row.playedGames,
    won: row.won,
    draw: row.draw,
    lost: row.lost,
    points: row.points,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    goalDifference: row.goalDifference,
    form: row.form || '',
  }));
}

function normalizeStandings(data) {
  return (data.standings || []).map((s) => ({
    stage: s.stage || null,
    type: s.type || null,
    group: mapGroupName(s.group),
    table: normalizeStandingTable(s.table),
  }));
}

function normalizeScorers(data) {
  return (data.scorers || []).map((s) => ({
    player: {
      id: s.player?.id,
      name: s.player?.name,
      nationality: s.player?.nationality,
      position: s.player?.position,
    },
    team: {
      id: s.team?.id,
      name: s.team?.name,
      crest: s.team?.crest,
    },
    goals: s.goals ?? 0,
    assists: s.assists ?? null,
    penalties: s.penalties ?? null,
  }));
}

function normalizeApiMatch(m) {
  const { homeScore, awayScore } = resolveScores(m);
  return {
    id: m.id,
    matchday: m.matchday,
    stage: mapStage(m.stage),
    group: mapGroupName(m.group),
    status: m.status,
    utcDate: m.utcDate,
    homeTeam: {
      id: m.homeTeam?.id,
      name: m.homeTeam?.name,
      crest: m.homeTeam?.crest,
    },
    awayTeam: {
      id: m.awayTeam?.id,
      name: m.awayTeam?.name,
      crest: m.awayTeam?.crest,
    },
    score: { home: homeScore, away: awayScore },
    venue: m.venue || null,
    competition: m.competition ? { id: m.competition.id, name: m.competition.name } : null,
    season: m.season ? { startDate: m.season.startDate, endDate: m.season.endDate } : null,
  };
}

async function fetchStandings(config, query = {}) {
  const params = pickQuery(query, STANDING_QUERY_KEYS);
  if (!params.season) params.season = config.season || DEFAULT_SEASON;

  const result = await requestWithCompetitionFallback(
    config,
    (competition) => `/competitions/${competition}/standings`,
    params,
  );

  return {
    standings: normalizeStandings(result.data),
    competitionUsed: result.competitionUsed,
    rateLimits: result.rateLimits,
  };
}

async function fetchScorers(config, query = {}) {
  const params = pickQuery(query, SCORER_QUERY_KEYS);
  if (!params.season) params.season = config.season || DEFAULT_SEASON;
  if (!params.limit) params.limit = 10;

  const result = await requestWithCompetitionFallback(
    config,
    (competition) => `/competitions/${competition}/scorers`,
    params,
  );

  return {
    scorers: normalizeScorers(result.data),
    competitionUsed: result.competitionUsed,
    rateLimits: result.rateLimits,
  };
}

async function fetchMatchById(config, matchId) {
  const result = await apiRequest(config, `/matches/${matchId}`);
  return normalizeApiMatch(result.data);
}

async function fetchTeamMatches(config, teamId, query = {}) {
  const params = pickQuery(query, MATCH_QUERY_KEYS);

  const result = await apiRequest(config, `/teams/${teamId}/matches`, params);
  return {
    matches: (result.data.matches || []).map(normalizeApiMatch),
    resultSet: result.data.resultSet || null,
    rateLimits: result.rateLimits,
  };
}

async function fetchHead2Head(config, externalMatchId, query = {}) {
  const params = {};
  if (query.limit != null) params.limit = query.limit;
  if (query.dateFrom) params.dateFrom = query.dateFrom;
  if (query.dateTo) params.dateTo = query.dateTo;
  if (query.competitions) params.competitions = query.competitions;

  const result = await apiRequest(config, `/matches/${externalMatchId}/head2head`, params);
  return {
    aggregates: result.data.aggregates || result.data.head2head || null,
    matches: (result.data.matches || []).map(normalizeApiMatch),
    referenceMatch: result.data.match ? normalizeApiMatch(result.data.match) : null,
    rateLimits: result.rateLimits,
  };
}

async function fetchFilteredMatches(config, query = {}) {
  const params = pickQuery(query, MATCH_QUERY_KEYS);
  const useGlobal = !query.competitionScoped;

  if (useGlobal) {
    const candidates = getCompetitionCandidates(config);
    const result = await apiRequest(config, '/matches', {
      competitions: candidates[0],
      ...params,
    });
    return {
      matches: (result.data.matches || []).map(normalizeApiMatch),
      resultSet: result.data.resultSet || null,
      rateLimits: result.rateLimits,
    };
  }

  const result = await fetchCompetitionMatches(config, params);
  return {
    matches: (result.data.matches || []).map(normalizeApiMatch),
    resultSet: result.data.resultSet || null,
    competitionUsed: result.competitionUsed,
    rateLimits: result.rateLimits,
  };
}

async function fetchForSync(config, syncType = 'fixtures') {
  const merged = new Map();
  const rateLimitsCollected = [];
  let competitionUsed = null;
  let usedFallback = false;

  if (syncType === 'live_scores') {
    const { data, rateLimits } = await fetchLiveMatchesRequest(config);
    rateLimitsCollected.push(rateLimits);
    mergeFixtures(merged, data.matches);
  } else if (syncType === 'results') {
    // Keep result-sync lightweight: only fetch recently finished matches.
    // This avoids re-fetching the entire season history once results are already in the DB.
    const now = new Date();
    const addDays = (date, days) => {
      const d = new Date(date);
      d.setUTCDate(d.getUTCDate() + days);
      return d;
    };
    const asDate = (date) => date.toISOString().slice(0, 10);
    const finishedRes = await fetchCompetitionMatches(config, {
      status: 'FINISHED',
      dateFrom: asDate(addDays(now, -7)),
      dateTo: asDate(addDays(now, 1)),
    });
    rateLimitsCollected.push(finishedRes.rateLimits);
    competitionUsed = finishedRes.competitionUsed;
    usedFallback = finishedRes.usedFallback;
    mergeFixtures(merged, finishedRes.data.matches);
  } else {
    const { data, rateLimits, competitionUsed: comp, usedFallback: fallback } = await fetchCompetitionMatches(config);
    rateLimitsCollected.push(rateLimits);
    competitionUsed = comp;
    usedFallback = fallback;
    mergeFixtures(merged, data.matches);
  }

  return {
    fixtures: Array.from(merged.values()),
    rateLimits: rateLimitsCollected[rateLimitsCollected.length - 1] || null,
    rateLimitsHistory: rateLimitsCollected,
    competitionUsed,
    usedFallback,
    endpoint: competitionUsed
      ? `/competitions/${competitionUsed}/matches?season=${config.season || DEFAULT_SEASON}`
      : null,
  };
}

async function fetchFixtures(config) {
  const result = await fetchForSync(config, 'fixtures');
  return result.fixtures;
}

async function testConnection(config) {
  const result = await requestWithCompetitionFallback(
    config,
    (competition) => `/competitions/${competition}`,
  );

  return {
    ok: true,
    message: `football-data.org verbunden (${result.data.name || result.competitionUsed})`,
    details: {
      competitionUsed: result.competitionUsed,
      usedFallback: result.usedFallback,
      area: result.data.area?.name,
      currentSeason: result.data.currentSeason?.startDate,
      rateLimits: result.rateLimits,
    },
  };
}

module.exports = {
  name: NAME,
  label: 'football-data.org v4',
  requiresApiKey: true,
  defaultBaseUrl: DEFAULT_BASE_URL,
  defaultCompetitionCode: DEFAULT_COMPETITION_CODE,
  defaultCompetitionNumericId: DEFAULT_COMPETITION_NUMERIC_ID,
  defaultCompetitionId: DEFAULT_COMPETITION_CODE,
  fetchFixtures,
  fetchForSync,
  fetchTeams,
  fetchTeamById,
  fetchMatchById,
  fetchStandings,
  fetchScorers,
  fetchTeamMatches,
  fetchHead2Head,
  fetchFilteredMatches,
  normalizeTeamDetail,
  testConnection,
  normalizeMatch,
  resolveScores,
  getCompetitionCandidates,
};
