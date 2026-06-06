const { fetchJson } = require('./providerUtils');

const DEFAULT_BASE_URL = 'https://www.thesportsdb.com/api/v1/json';
const DEFAULT_API_KEY = '123';

function getTheSportsDbApiKey() {
  return process.env.PLAYER_IMAGE_THESPORTSDB_API_KEY
    || process.env.THESPORTSDB_API_KEY
    || DEFAULT_API_KEY;
}

function getTheSportsDbBaseUrl() {
  return (process.env.PLAYER_IMAGE_THESPORTSDB_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
}

function buildTheSportsDbUrl(endpoint, params = {}, config = {}) {
  const baseUrl = (config.baseUrl || getTheSportsDbBaseUrl()).replace(/\/$/, '');
  const apiKey = config.apiKey || getTheSportsDbApiKey();
  const url = new URL(`${baseUrl}/${apiKey}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function fetchTheSportsDb(endpoint, params = {}, config = {}) {
  const url = buildTheSportsDbUrl(endpoint, params, config);
  return fetchJson(url);
}

function isVenueEnrichmentEnabled() {
  return process.env.THESPORTSDB_VENUE_ENRICHMENT_ENABLED !== 'false';
}

module.exports = {
  DEFAULT_API_KEY,
  DEFAULT_BASE_URL,
  getTheSportsDbApiKey,
  getTheSportsDbBaseUrl,
  buildTheSportsDbUrl,
  fetchTheSportsDb,
  isVenueEnrichmentEnabled,
};
