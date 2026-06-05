let lastRateLimits = null;
let throttleUntil = null;
let lastLiveSyncAt = 0;
let persistenceLoaded = false;

const LIVE_SYNC_MIN_INTERVAL_MS = 5 * 60 * 1000;
const RATE_LIMIT_SETTING_KEY = 'footballDataRateLimitState';

const RATE_LIMIT_HEADER_KEYS = [
  'x-requests-available-minute',
  'x-requestcounter-reset',
  'x-requests-available',
  'x-ratelimit-remaining',
  'x-ratelimit-limit',
  'x-ratelimit-reset',
];

async function loadPersistedState() {
  if (persistenceLoaded) return;
  persistenceLoaded = true;
  try {
    const { getSetting, setSetting } = require('./settingsService');
    const saved = await getSetting(RATE_LIMIT_SETTING_KEY, null);
    if (saved && typeof saved === 'object') {
      lastRateLimits = saved.lastRateLimits || null;
      if (saved.throttleUntil) {
        const until = new Date(saved.throttleUntil).getTime();
        if (until > Date.now()) throttleUntil = until;
      }
      if (saved.lastLiveSyncAt) lastLiveSyncAt = saved.lastLiveSyncAt;
    }
    if (!saved) {
      await setSetting(RATE_LIMIT_SETTING_KEY, { lastRateLimits: null, throttleUntil: null, lastLiveSyncAt: 0 });
    }
  } catch {
    // ignore persistence errors in tests
  }
}

async function persistState() {
  try {
    const { setSetting } = require('./settingsService');
    await setSetting(RATE_LIMIT_SETTING_KEY, {
      lastRateLimits,
      throttleUntil: throttleUntil ? new Date(throttleUntil).toISOString() : null,
      lastLiveSyncAt,
      savedAt: new Date().toISOString(),
    });
  } catch {
    // ignore
  }
}

function extractRateLimits(headers) {
  const limits = { capturedAt: new Date().toISOString() };

  if (!headers) return limits;

  const getHeader = (name) => {
    if (typeof headers.get === 'function') return headers.get(name);
    const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
    return key ? headers[key] : null;
  };

  for (const key of RATE_LIMIT_HEADER_KEYS) {
    const value = getHeader(key);
    if (value != null) limits[key] = value;
  }

  const availableMinute = parseInt(
    limits['x-requests-available-minute'] ?? limits['x-requests-available'] ?? limits['x-ratelimit-remaining'],
    10,
  );
  if (!Number.isNaN(availableMinute)) {
    limits.availableMinute = availableMinute;
  }

  return limits;
}

function recordRateLimits(rateLimits) {
  if (!rateLimits) return;
  lastRateLimits = { ...rateLimits, recordedAt: new Date().toISOString() };

  if (rateLimits.availableMinute != null && rateLimits.availableMinute <= 2) {
    setThrottled(10 * 60 * 1000, 'low_remaining_requests');
  } else {
    persistState();
  }
}

function setThrottled(durationMs, reason = 'rate_limit') {
  throttleUntil = Date.now() + durationMs;
  lastRateLimits = {
    ...(lastRateLimits || {}),
    throttled: true,
    throttleReason: reason,
    throttleUntil: new Date(throttleUntil).toISOString(),
  };
  persistState();
}

async function shouldSkipSyncDueToRateLimit(syncType) {
  await loadPersistedState();

  if (throttleUntil && Date.now() < throttleUntil) {
    return { skip: true, reason: 'throttled', rateLimits: lastRateLimits };
  }

  if (syncType === 'live_scores') {
    const elapsed = Date.now() - lastLiveSyncAt;
    if (lastLiveSyncAt && elapsed < LIVE_SYNC_MIN_INTERVAL_MS) {
      return { skip: true, reason: 'live_interval', waitMs: LIVE_SYNC_MIN_INTERVAL_MS - elapsed };
    }
    if (lastRateLimits?.availableMinute != null && lastRateLimits.availableMinute <= 5) {
      return { skip: true, reason: 'low_quota_live', rateLimits: lastRateLimits };
    }
  }

  if (syncType === 'results' && lastRateLimits?.availableMinute != null && lastRateLimits.availableMinute <= 3) {
    return { skip: true, reason: 'low_quota_results', rateLimits: lastRateLimits };
  }

  return { skip: false };
}

function markLiveSyncCompleted() {
  lastLiveSyncAt = Date.now();
  persistState();
}

async function getRateLimitState() {
  await loadPersistedState();
  return {
    lastRateLimits,
    throttled: throttleUntil ? Date.now() < throttleUntil : false,
    throttleUntil: throttleUntil ? new Date(throttleUntil).toISOString() : null,
    liveSyncMinIntervalMs: LIVE_SYNC_MIN_INTERVAL_MS,
  };
}

function resetRateLimitStateForTests() {
  lastRateLimits = null;
  throttleUntil = null;
  lastLiveSyncAt = 0;
  persistenceLoaded = false;
}

module.exports = {
  extractRateLimits,
  recordRateLimits,
  setThrottled,
  shouldSkipSyncDueToRateLimit,
  markLiveSyncCompleted,
  getRateLimitState,
  loadPersistedState,
  resetRateLimitStateForTests,
};
