const { fetchJson, mapStatus, buildNormalizedFixture } = require('./providerUtils');

const NAME = 'sportmonks';
const DEFAULT_BASE_URL = 'https://api.sportmonks.com/v3/football';

const STATE_MAP = {
  1: 'scheduled',
  2: 'live',
  3: 'live',
  4: 'halftime',
  5: 'finished',
  6: 'postponed',
  7: 'cancelled',
  8: 'postponed',
};

function mapSportmonksState(stateId, stateName) {
  if (stateId && STATE_MAP[stateId]) return STATE_MAP[stateId];
  return mapStatus(stateName);
}

function extractParticipants(participants = []) {
  const home = participants.find((p) => p.meta?.location === 'home') || participants[0];
  const away = participants.find((p) => p.meta?.location === 'away') || participants[1];
  return {
    homeTeam: home?.name || 'TBD',
    awayTeam: away?.name || 'TBD',
  };
}

function extractScores(scores = []) {
  const current = scores.find((s) => s.description === 'CURRENT') || scores.find((s) => s.description === 'FULLTIME');
  if (!current?.score) return { homeScore: null, awayScore: null };
  return {
    homeScore: current.score.participant === 'home' ? current.score.goals : current.score.home ?? null,
    awayScore: current.score.participant === 'away' ? current.score.goals : current.score.away ?? null,
  };
}

function normalizeMatch(m) {
  const participants = extractParticipants(m.participants);
  let homeScore = null;
  let awayScore = null;

  if (Array.isArray(m.scores) && m.scores.length) {
    const ftHome = m.scores.find((s) => s.description === 'CURRENT' && s.score?.participant === 'home');
    const ftAway = m.scores.find((s) => s.description === 'CURRENT' && s.score?.participant === 'away');
    if (ftHome) homeScore = ftHome.score?.goals ?? null;
    if (ftAway) awayScore = ftAway.score?.goals ?? null;
  }

  const status = mapSportmonksState(m.state_id, m.state?.name || m.state?.state);

  return buildNormalizedFixture({
    externalApiId: m.id,
    stage: m.stage?.name || m.league?.name || m.round?.name || 'Group Stage',
    groupName: m.group?.name || null,
    homeTeam: participants.homeTeam,
    awayTeam: participants.awayTeam,
    kickoffTime: m.starting_at,
    timezone: null,
    stadium: m.venue?.name || null,
    city: m.venue?.city || null,
    homeScore,
    awayScore,
    status,
    apiLastStatus: m.state?.name || String(m.state_id),
  });
}

async function fetchAllPages(baseUrl, config) {
  const fixtures = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 50) {
    const params = new URLSearchParams({
      api_token: config.apiKey,
      include: 'participants;scores;state;venue;stage;group;league',
      page: String(page),
    });

    if (config.competitionId) {
      params.set('filters', `fixtureLeagues:${config.competitionId}`);
    }

    const url = `${baseUrl}/fixtures?${params}`;
    const data = await fetchJson(url);
    const batch = data.data || [];
    fixtures.push(...batch.map(normalizeMatch));

    hasMore = !!data.pagination?.has_more;
    page += 1;
    if (!batch.length) break;
  }

  return fixtures;
}

async function fetchFixturesBySeason(baseUrl, config) {
  const url = `${baseUrl}/fixtures/seasons/${config.competitionId}?api_token=${config.apiKey}&include=participants;scores;state;venue;stage;group;league`;
  const data = await fetchJson(url);
  return (data.data || []).map(normalizeMatch);
}

async function fetchFixtures(config) {
  const baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');

  if (/^\d+$/.test(String(config.competitionId))) {
    try {
      return await fetchFixturesBySeason(baseUrl, config);
    } catch {
      // fall back to league filter if competitionId is league id
    }
  }

  return fetchAllPages(baseUrl, config);
}

async function testConnection(config) {
  const baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  const url = `${baseUrl}/leagues/${config.competitionId}?api_token=${config.apiKey}`;
  try {
    const data = await fetchJson(url);
    return {
      ok: true,
      message: `Sportmonks verbunden (${data.data?.name || config.competitionId})`,
      details: { id: data.data?.id },
    };
  } catch {
    const url2 = `${baseUrl}/fixtures?api_token=${config.apiKey}&per_page=1`;
    await fetchJson(url2);
    return { ok: true, message: 'Sportmonks verbunden (Fixtures-Endpunkt erreichbar)' };
  }
}

module.exports = {
  name: NAME,
  label: 'Sportmonks',
  requiresApiKey: true,
  defaultBaseUrl: DEFAULT_BASE_URL,
  fetchFixtures,
  testConnection,
};
