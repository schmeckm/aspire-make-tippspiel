const { fetchJson, mapStatus, buildNormalizedFixture } = require('./providerUtils');

const NAME = 'api-football';
const DEFAULT_BASE_URL = 'https://v3.football.api-sports.io';

function buildHeaders(config) {
  const host = new URL(config.baseUrl || DEFAULT_BASE_URL).host;
  if (host.includes('rapidapi')) {
    return {
      'x-rapidapi-key': config.apiKey,
      'x-rapidapi-host': host,
    };
  }
  return { 'x-apisports-key': config.apiKey };
}

function normalizeMatch(m) {
  const fix = m.fixture || m;
  const teams = m.teams || {};
  const goals = m.goals || {};
  const league = m.league || {};
  return buildNormalizedFixture({
    externalApiId: fix.id,
    stage: league.round || league.name || 'Group Stage',
    groupName: league.group || null,
    homeTeam: teams.home?.name,
    awayTeam: teams.away?.name,
    kickoffTime: fix.date,
    timezone: fix.timezone || null,
    stadium: fix.venue?.name || null,
    city: fix.venue?.city || null,
    homeScore: goals.home,
    awayScore: goals.away,
    status: mapStatus(fix.status?.short || fix.status?.long),
    apiLastStatus: fix.status?.long || fix.status?.short,
  });
}

async function fetchFixtures(config) {
  const baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  const url = `${baseUrl}/fixtures?league=${config.competitionId}&season=${config.season}&timezone=${encodeURIComponent(config.timezone || 'UTC')}`;
  const data = await fetchJson(url, buildHeaders({ ...config, baseUrl }));
  return (data.response || []).map(normalizeMatch);
}

async function testConnection(config) {
  const baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  const url = `${baseUrl}/status`;
  const data = await fetchJson(url, buildHeaders({ ...config, baseUrl }));
  return {
    ok: true,
    message: `API-Football verbunden (${data.response?.account?.email || 'OK'})`,
    details: { requests: data.response?.requests },
  };
}

module.exports = {
  name: NAME,
  label: 'API-Football / API-Sports',
  requiresApiKey: true,
  defaultBaseUrl: DEFAULT_BASE_URL,
  fetchFixtures,
  testConnection,
};
