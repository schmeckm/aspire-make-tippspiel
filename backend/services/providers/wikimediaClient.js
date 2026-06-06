const MIN_INTERVAL_MS = parseInt(process.env.WIKIMEDIA_API_MIN_INTERVAL_MS || '6000', 10);
const MAX_CONCURRENT = Math.min(
  Math.max(parseInt(process.env.WIKIMEDIA_API_MAX_CONCURRENT || '2', 10), 1),
  3,
);
const DEFAULT_RETRY_MS = parseInt(process.env.WIKIMEDIA_API_RETRY_MS || '60000', 10);

let lastRequestAt = 0;
let activeRequests = 0;
const waitQueue = [];

function getWikimediaUserAgent() {
  if (process.env.WIKIMEDIA_USER_AGENT) {
    return process.env.WIKIMEDIA_USER_AGENT;
  }

  const appUrl = process.env.APP_URL || 'https://github.com/schmeckm/aspire-make-tippspiel';
  const contact = process.env.WIKIMEDIA_CONTACT_EMAIL
    || process.env.SMTP_FROM
    || process.env.BOOTSTRAP_ADMIN_EMAIL
    || 'please-set-WIKIMEDIA_CONTACT_EMAIL@example.com';

  return `WM2026-Tippspiel/2.5 (${appUrl}; ${contact}) player-image-resolver`;
}

function parseRetryAfterMs(retryAfterHeader) {
  if (!retryAfterHeader) return null;
  const trimmed = String(retryAfterHeader).trim();
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

async function acquireSlot() {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests += 1;
    return;
  }
  await new Promise((resolve) => {
    waitQueue.push(resolve);
  });
  activeRequests += 1;
}

function releaseSlot() {
  activeRequests = Math.max(0, activeRequests - 1);
  const next = waitQueue.shift();
  if (next) next();
}

async function throttleWikimedia() {
  const now = Date.now();
  const wait = MIN_INTERVAL_MS - (now - lastRequestAt);
  if (wait > 0) {
    await sleep(wait);
  }
  lastRequestAt = Date.now();
}

class WikimediaApiError extends Error {
  constructor(message, { status, retryAfterMs = null } = {}) {
    super(message);
    this.name = 'WikimediaApiError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

async function fetchWikimediaJson(url, { timeoutMs = 30000 } = {}) {
  await acquireSlot();
  try {
    await throttleWikimedia();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': getWikimediaUserAgent() },
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));
        const suffix = body ? ` – ${body.slice(0, 200)}` : '';
        throw new WikimediaApiError(
          `API request failed: ${response.status} ${response.statusText}${suffix}`,
          { status: response.status, retryAfterMs },
        );
      }

      return response.json();
    } finally {
      clearTimeout(timer);
    }
  } finally {
    releaseSlot();
  }
}

function isWikimediaEnabled() {
  return process.env.PLAYER_IMAGE_WIKIMEDIA_ENABLED !== 'false';
}

function getSuggestedRateLimitCooldownMs(error) {
  if (error?.retryAfterMs != null) return error.retryAfterMs;
  if (error?.status === 429 || error?.status === 503) return DEFAULT_RETRY_MS;
  return null;
}

module.exports = {
  getWikimediaUserAgent,
  fetchWikimediaJson,
  WikimediaApiError,
  isWikimediaEnabled,
  getSuggestedRateLimitCooldownMs,
  parseRetryAfterMs,
};
