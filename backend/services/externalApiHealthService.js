const footballProviderService = require('./footballProviderService');
const { getRateLimitState } = require('./footballDataRateLimitService');
const { isEmailConfigured } = require('./emailService');
const { isGoogleEnabled } = require('./oauthService');
const { fetchTheSportsDb } = require('./providers/theSportsDbClient');
const playerImageProviderService = require('./playerImageProviderService');

const CACHE_TTL_MS = 5 * 60 * 1000;
const PROBE_TIMEOUT_MS = 6000;

let cache = { at: 0, apis: null };
let probeInFlight = null;

function buildStatus(id, { configured, enabled, active, reason, detail }) {
  let state = 'inactive';
  if (enabled && configured && active) state = 'online';
  else if (enabled && configured && !active) state = 'offline';

  return {
    id,
    configured: !!configured,
    enabled: enabled !== false,
    active: !!active,
    state,
    reason: reason || null,
    detail: detail || null,
  };
}

async function withTimeout(promise, ms = PROBE_TIMEOUT_MS) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function probeFootballApi(config) {
  if (!footballProviderService.isApiConfigured(config)) {
    return buildStatus('football', {
      configured: false,
      enabled: true,
      active: false,
      reason: 'not_configured',
    });
  }

  const rateLimit = await getRateLimitState();
  if (rateLimit.throttled) {
    return buildStatus('football', {
      configured: true,
      enabled: true,
      active: false,
      reason: 'rate_limited',
      detail: rateLimit.throttleUntil || null,
    });
  }

  if (process.env.NODE_ENV === 'test') {
    return buildStatus('football', {
      configured: true,
      enabled: true,
      active: true,
      reason: 'ok',
    });
  }

  try {
    await withTimeout(footballProviderService.testConnection(config));
    return buildStatus('football', {
      configured: true,
      enabled: true,
      active: true,
      reason: 'ok',
    });
  } catch (error) {
    return buildStatus('football', {
      configured: true,
      enabled: true,
      active: false,
      reason: 'unreachable',
      detail: error.message?.slice(0, 160) || null,
    });
  }
}

async function probeTheSportsDbApi() {
  const enabled = playerImageProviderService.isEnabled();
  if (!enabled) {
    return buildStatus('theSportsDb', {
      configured: false,
      enabled: false,
      active: false,
      reason: 'disabled',
    });
  }

  if (process.env.NODE_ENV === 'test') {
    return buildStatus('theSportsDb', {
      configured: true,
      enabled: true,
      active: true,
      reason: 'ok',
    });
  }

  if (playerImageProviderService.isExternalProviderPaused()) {
    return buildStatus('theSportsDb', {
      configured: true,
      enabled: true,
      active: false,
      reason: 'rate_limited',
    });
  }

  try {
    await withTimeout(fetchTheSportsDb('searchteams.php', { t: 'Germany' }));
    return buildStatus('theSportsDb', {
      configured: true,
      enabled: true,
      active: true,
      reason: 'ok',
    });
  } catch (error) {
    return buildStatus('theSportsDb', {
      configured: true,
      enabled: true,
      active: false,
      reason: 'unreachable',
      detail: error.message?.slice(0, 160) || null,
    });
  }
}

function getEmailApiStatus() {
  const configured = isEmailConfigured();
  return buildStatus('email', {
    configured,
    enabled: true,
    active: configured,
    reason: configured ? 'ok' : 'not_configured',
  });
}

function getGoogleSsoStatus() {
  const configured = isGoogleEnabled();
  return buildStatus('google', {
    configured,
    enabled: true,
    active: configured,
    reason: configured ? 'ok' : 'not_configured',
  });
}

async function probeExternalApis() {
  const config = await footballProviderService.getProviderConfig();
  const [football, theSportsDb] = await Promise.all([
    probeFootballApi(config),
    probeTheSportsDbApi(),
  ]);

  return [
    football,
    theSportsDb,
    getEmailApiStatus(),
    getGoogleSsoStatus(),
  ];
}

async function getExternalApiHealth({ refresh = false } = {}) {
  const isFresh = cache.apis && Date.now() - cache.at < CACHE_TTL_MS;
  if (!refresh && isFresh) {
    return { apis: cache.apis, cached: true, checkedAt: new Date(cache.at).toISOString() };
  }

  if (probeInFlight) {
    const apis = await probeInFlight;
    return { apis, cached: false, checkedAt: new Date().toISOString() };
  }

  probeInFlight = probeExternalApis()
    .then((apis) => {
      cache = { at: Date.now(), apis };
      return apis;
    })
    .finally(() => {
      probeInFlight = null;
    });

  const apis = await probeInFlight;
  return { apis, cached: false, checkedAt: new Date().toISOString() };
}

function resetExternalApiHealthCacheForTests() {
  cache = { at: 0, apis: null };
  probeInFlight = null;
}

module.exports = {
  getExternalApiHealth,
  resetExternalApiHealthCacheForTests,
};
