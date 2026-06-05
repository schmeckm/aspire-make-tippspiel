const { fetchJson, mapStatus, buildNormalizedFixture } = require('./providerUtils');

const NAME = 'thestatsapi';
const DEFAULT_BASE_URL = 'https://api.thestatsapi.com/api';

function buildHeaders(config) {
  return { Authorization: `Bearer ${config.apiKey}` };
}

function normalizeMatch(m) {
  const home = m.home || m.home_team || {};
  const away = m.away || m.away_team || {};
  const score = m.score || m.full_time_score || {};

  return buildNormalizedFixture({
    externalApiId: m.match_id || m.id,
    stage: m.stage || m.round || m.competition?.name || 'Group Stage',
    groupName: m.group || null,
    homeTeam: home.name || home.team_name,
    awayTeam: away.name || away.team_name,
    kickoffTime: m.kickoff_utc || m.utc_date || m.date,
    timezone: 'UTC',
    stadium: m.venue || m.stadium || null,
    city: m.city || null,
    homeScore: score.home ?? m.home_score ?? null,
    awayScore: score.away ?? m.away_score ?? null,
    status: mapStatus(m.status),
    apiLastStatus: m.status,
  });
}

async function fetchAllPages(baseUrl, config) {
  const fixtures = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= 50) {
    const params = new URLSearchParams({
      competition_id: String(config.competitionId),
      season: String(config.season),
      page: String(page),
      per_page: '100',
    });

    const url = `${baseUrl}/football/matches?${params}`;
    const data = await fetchJson(url, buildHeaders(config));
    const batch = data.data || data.matches || [];
    fixtures.push(...batch.map(normalizeMatch));

    totalPages = data.pagination?.total_pages || data.meta?.total_pages || 1;
    page += 1;
    if (!batch.length) break;
  }

  return fixtures;
}

async function fetchFixtures(config) {
  const baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  return fetchAllPages(baseUrl, config);
}

async function testConnection(config) {
  const baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  const url = `${baseUrl}/football/competitions/${config.competitionId}`;
  try {
    const data = await fetchJson(url, buildHeaders(config));
    const comp = data.data || data;
    return {
      ok: true,
      message: `TheStatsAPI verbunden (${comp.name || config.competitionId})`,
      details: { id: comp.competition_id || comp.id },
    };
  } catch {
    const url2 = `${baseUrl}/football/matches?competition_id=${config.competitionId}&per_page=1`;
    await fetchJson(url2, buildHeaders(config));
    return { ok: true, message: 'TheStatsAPI verbunden (Matches-Endpunkt erreichbar)' };
  }
}

module.exports = {
  name: NAME,
  label: 'TheStatsAPI',
  requiresApiKey: true,
  defaultBaseUrl: DEFAULT_BASE_URL,
  fetchFixtures,
  testConnection,
};
