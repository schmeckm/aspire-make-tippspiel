const { getEntry, setEntry } = require('../services/rateLimitStore');
const { sendError } = require('../utils/apiResponse');
const { t } = require('../services/i18nService');

const LIMITS = {
  user_coach: { max: 20, windowMs: 24 * 60 * 60 * 1000 },
  match_preview: { max: 30, windowMs: 24 * 60 * 60 * 1000 },
  admin_assistant: { max: 50, windowMs: 24 * 60 * 60 * 1000 },
  bonus_question_suggestions: { max: 20, windowMs: 24 * 60 * 60 * 1000 },
  reminder_text: { max: 20, windowMs: 24 * 60 * 60 * 1000 },
  leaderboard_summary: { max: 10, windowMs: 24 * 60 * 60 * 1000 },
  dashboard_insights: { max: 30, windowMs: 24 * 60 * 60 * 1000 },
};

function getKey(userId, feature) {
  return `${userId}:${feature}`;
}

async function checkRateLimit(userId, feature, locale = 'de') {
  const limit = LIMITS[feature];
  if (!limit) return { allowed: true };

  const key = getKey(userId, feature);
  const now = Date.now();
  let entry = await getEntry(key);

  if (!entry || now - entry.windowStart > limit.windowMs) {
    entry = { count: 0, windowStart: now };
  }

  if (entry.count >= limit.max) {
    return {
      allowed: false,
      error: t('errors.aiRateLimit', locale),
      remaining: 0,
    };
  }

  entry.count++;
  await setEntry(key, entry, limit.windowMs);

  return { allowed: true, remaining: limit.max - entry.count };
}

function aiRateLimitMiddleware(feature) {
  return async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) return sendError(res, req, 401, 'errors.notAuthenticatedShort');

    const result = await checkRateLimit(userId, feature, req.locale);
    if (!result.allowed) {
      return res.status(429).json({ error: result.error });
    }

    req.aiRateLimit = { remaining: result.remaining };
    next();
  };
}

module.exports = { checkRateLimit, aiRateLimitMiddleware, LIMITS };
