const apiFootballProvider = require('./providers/apiFootballProvider');
const sportmonksProvider = require('./providers/sportmonksProvider');
const footballDataProvider = require('./providers/footballDataProvider');
const theStatsApiProvider = require('./providers/theStatsApiProvider');
const { mapStatus } = require('./providers/providerUtils');
const { getSetting } = require('./settingsService');

const PROVIDERS = {
  'api-football': apiFootballProvider,
  apifootball: apiFootballProvider,
  'api-sports': apiFootballProvider,
  sportmonks: sportmonksProvider,
  'football-data': footballDataProvider,
  'football-data.org': footballDataProvider,
  thestatsapi: theStatsApiProvider,
  'the-stats-api': theStatsApiProvider,
};

const MANUAL_MODE_MESSAGE = 'Keine Football API konfiguriert. Die App läuft im manuellen CSV-Modus.';
const FOOTBALL_DATA_KEY_ERROR = 'Football-data.org API-Key ist nicht konfiguriert.';
const API_SYNC_ERROR = 'Football-API-Synchronisierung ist nicht konfiguriert. Bitte FOOTBALL_API_KEY setzen oder im manuellen CSV-Modus bleiben.';

function normalizeProviderName(name) {
  if (!name) return 'football-data';
  const key = String(name).toLowerCase().trim();
  if (PROVIDERS[key]) return PROVIDERS[key].name;
  return key;
}

function getProviderModule(providerName) {
  const normalized = normalizeProviderName(providerName);
  const provider = PROVIDERS[normalized];
  if (!provider) {
    throw new Error(`Unbekannter Football-API-Provider: ${providerName}`);
  }
  return provider;
}

async function getProviderConfig() {
  // football-data.org v4 is the mandatory primary API provider
  const module = footballDataProvider;

  return {
    provider: module.name,
    providerLabel: module.label,
    baseUrl: process.env.FOOTBALL_API_BASE_URL || module.defaultBaseUrl,
    apiKey: process.env.FOOTBALL_API_KEY || '',
    competitionCode: process.env.FOOTBALL_API_COMPETITION_CODE
      || process.env.FOOTBALL_API_COMPETITION_ID
      || module.defaultCompetitionCode,
    competitionNumericId: process.env.FOOTBALL_API_COMPETITION_NUMERIC_ID
      || module.defaultCompetitionNumericId,
    competitionId: process.env.FOOTBALL_API_COMPETITION_CODE
      || process.env.FOOTBALL_API_COMPETITION_ID
      || module.defaultCompetitionCode,
    season: process.env.FOOTBALL_API_SEASON || '2026',
    timezone: process.env.FOOTBALL_API_TIMEZONE || 'Europe/Zurich',
    syncEnabled: process.env.FOOTBALL_API_SYNC_ENABLED !== 'false',
    resultSyncEnabled: process.env.FOOTBALL_API_RESULT_SYNC_ENABLED !== 'false',
  };
}

function isApiConfigured(config = null) {
  const cfg = config || { apiKey: process.env.FOOTBALL_API_KEY || '' };
  return !!cfg.apiKey;
}

function getOperationMode(config = null) {
  return isApiConfigured(config) ? 'api' : 'manual_csv';
}

function getStatusMessage(config = null) {
  return isApiConfigured(config) ? null : MANUAL_MODE_MESSAGE;
}

function getApiKeyErrorMessage(config) {
  if (config?.provider === 'football-data') {
    return FOOTBALL_DATA_KEY_ERROR;
  }
  return API_SYNC_ERROR;
}

function assertApiConfigured(config) {
  if (!isApiConfigured(config)) {
    const err = new Error(getApiKeyErrorMessage(config));
    err.code = 'NO_API_KEY';
    throw err;
  }
}

function getSupportedProviders() {
  return [{
    id: footballDataProvider.name,
    label: footballDataProvider.label,
    requiresApiKey: true,
    defaultBaseUrl: footballDataProvider.defaultBaseUrl,
    defaultCompetitionCode: footballDataProvider.defaultCompetitionCode,
    defaultCompetitionNumericId: footballDataProvider.defaultCompetitionNumericId,
  }];
}

async function fetchForSync(config, syncType = 'fixtures') {
  const cfg = config || await getProviderConfig();
  assertApiConfigured(cfg);
  return footballDataProvider.fetchForSync(cfg, syncType);
}

async function fetchFixtures(overrideConfig = null) {
  const result = await fetchForSync(overrideConfig, 'fixtures');
  return result.fixtures;
}

async function testConnection(overrideConfig = null) {
  const config = overrideConfig || await getProviderConfig();
  assertApiConfigured(config);
  return footballDataProvider.testConnection(config);
}

module.exports = {
  MANUAL_MODE_MESSAGE,
  FOOTBALL_DATA_KEY_ERROR,
  API_SYNC_ERROR,
  getProviderConfig,
  getProviderModule,
  getSupportedProviders,
  isApiConfigured,
  getOperationMode,
  getStatusMessage,
  getApiKeyErrorMessage,
  assertApiConfigured,
  fetchForSync,
  fetchFixtures,
  testConnection,
  mapStatus,
  normalizeProviderName,
};
