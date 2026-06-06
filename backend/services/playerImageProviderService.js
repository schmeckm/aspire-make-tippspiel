const manualPlayerImageProvider = require('./providers/manualPlayerImageProvider');
const theSportsDbPlayerImageProvider = require('./providers/theSportsDbPlayerImageProvider');
const { getTheSportsDbApiKey, getTheSportsDbBaseUrl } = require('./providers/theSportsDbClient');
const wikidataPlayerImageProvider = require('./providers/wikidataPlayerImageProvider');
const wikipediaPlayerImageProvider = require('./providers/wikipediaPlayerImageProvider');

const EXTERNAL_PROVIDERS = [
  theSportsDbPlayerImageProvider,
  wikidataPlayerImageProvider,
  wikipediaPlayerImageProvider,
];

const RATE_LIMIT_MS = parseInt(process.env.PLAYER_IMAGE_RATE_LIMIT_MS || '3000', 10);
const RATE_LIMIT_COOLDOWN_MS = parseInt(
  process.env.PLAYER_IMAGE_RATE_LIMIT_COOLDOWN_MS || String(15 * 60 * 1000),
  10,
);
let lastExternalCallAt = 0;
let externalProviderCooldownUntil = 0;

function isRateLimitError(error) {
  const message = error?.message || '';
  return message.includes('429') || /too many requests/i.test(message);
}

function markExternalProvidersRateLimited() {
  externalProviderCooldownUntil = Math.max(
    externalProviderCooldownUntil,
    Date.now() + RATE_LIMIT_COOLDOWN_MS,
  );
}

function isExternalProviderPaused() {
  return Date.now() < externalProviderCooldownUntil;
}

function isEnabled() {
  return process.env.PLAYER_IMAGE_ENABLED !== 'false';
}

function getTheSportsDbConfig() {
  return {
    apiKey: getTheSportsDbApiKey(),
    baseUrl: getTheSportsDbBaseUrl(),
  };
}

function isTheSportsDbConfigured() {
  return !!getTheSportsDbApiKey();
}

function getCacheTtlMs() {
  const days = parseInt(process.env.PLAYER_IMAGE_CACHE_TTL_DAYS || '30', 10);
  return days * 24 * 60 * 60 * 1000;
}

async function throttleExternalCall() {
  const now = Date.now();
  const wait = RATE_LIMIT_MS - (now - lastExternalCallAt);
  if (wait > 0) {
    await new Promise((resolve) => { setTimeout(resolve, wait); });
  }
  lastExternalCallAt = Date.now();
}

function getSupportedProviders() {
  return [
    {
      id: manualPlayerImageProvider.name,
      label: manualPlayerImageProvider.label,
      requiresApiKey: false,
      priority: 1,
    },
    {
      id: theSportsDbPlayerImageProvider.name,
      label: theSportsDbPlayerImageProvider.label,
      requiresApiKey: true,
      configured: isTheSportsDbConfigured(),
      priority: 2,
    },
    {
      id: wikidataPlayerImageProvider.name,
      label: wikidataPlayerImageProvider.label,
      requiresApiKey: false,
      priority: 3,
    },
    {
      id: wikipediaPlayerImageProvider.name,
      label: wikipediaPlayerImageProvider.label,
      requiresApiKey: false,
      priority: 4,
    },
    {
      id: 'placeholder',
      label: 'Placeholder avatar',
      requiresApiKey: false,
      priority: 5,
    },
  ];
}

async function fetchFromProvider(provider, params) {
  if (isExternalProviderPaused()) return null;

  if (provider.name === theSportsDbPlayerImageProvider.name) {
    const config = getTheSportsDbConfig();
    if (!config.apiKey) return null;
    await throttleExternalCall();
    return theSportsDbPlayerImageProvider.fetchPlayerImage(config, params);
  }

  await throttleExternalCall();
  return provider.fetchPlayerImage(params);
}

async function resolveFromExternalProviders(params, { includeSources = null } = {}) {
  if (isExternalProviderPaused()) return null;

  const providers = EXTERNAL_PROVIDERS.filter((provider) => {
    if (includeSources && !includeSources.includes(provider.name)) return false;
    if (provider.name === theSportsDbPlayerImageProvider.name && !isTheSportsDbConfigured()) {
      return false;
    }
    return true;
  });

  for (const provider of providers) {
    try {
      const result = await fetchFromProvider(provider, params);
      if (result?.imageUrl) return result;
    } catch (error) {
      if (isRateLimitError(error)) {
        markExternalProvidersRateLimited();
        console.warn(
          `Player image providers rate-limited; pausing external lookups until ${new Date(externalProviderCooldownUntil).toISOString()}`,
        );
        break;
      }
      console.warn(`Player image provider ${provider.name} failed:`, error.message);
    }
  }

  return null;
}

async function searchAllProviders(params) {
  const results = [];

  const manual = await manualPlayerImageProvider.fetchPlayerImage(params);
  if (manual?.imageUrl) {
    results.push({ ...manual, provider: manualPlayerImageProvider.name });
  }

  if (isExternalProviderPaused()) {
    return results;
  }

  for (const provider of EXTERNAL_PROVIDERS) {
    if (provider.name === theSportsDbPlayerImageProvider.name && !isTheSportsDbConfigured()) {
      continue;
    }
    try {
      const result = await fetchFromProvider(provider, params);
      if (result?.imageUrl) {
        results.push({ ...result, provider: provider.name });
      }
    } catch (error) {
      if (isRateLimitError(error)) {
        markExternalProvidersRateLimited();
        break;
      }
      console.warn(`Player image search ${provider.name} failed:`, error.message);
    }
  }

  return results;
}

async function testTheSportsDbConnection() {
  const config = getTheSportsDbConfig();
  return theSportsDbPlayerImageProvider.testConnection(config);
}

module.exports = {
  isEnabled,
  getTheSportsDbConfig,
  isTheSportsDbConfigured,
  getCacheTtlMs,
  getSupportedProviders,
  isExternalProviderPaused,
  resolveFromExternalProviders,
  searchAllProviders,
  testTheSportsDbConnection,
  manualPlayerImageProvider,
  theSportsDbPlayerImageProvider,
  wikidataPlayerImageProvider,
  wikipediaPlayerImageProvider,
};
