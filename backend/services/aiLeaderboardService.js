const { buildLeaderboardContext } = require('./aiContextBuilderService');
const { generateText, getSystemPrompt, checkAiAvailability } = require('./llmService');
const { buildDisclaimer, getUserPrompt } = require('./aiGuardrailService');
const { getCachedCommentary, saveCommentary, logInteraction } = require('./aiMatchPreviewService');

function getDigestTimezone() {
  return process.env.REMINDER_TIMEZONE
    || process.env.DEFAULT_TIMEZONE
    || process.env.SENTRY_CRON_TIMEZONE
    || 'Europe/Zurich';
}

function getDateStringInTimezone(date, timezone) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date);
  } catch {
    // Fallback: server-local date string; still prevents unbounded cache growth.
    return new Date(date).toISOString().slice(0, 10);
  }
}

async function generateLeaderboardSummary(userId = null, { regenerate = false, language = 'de' } = {}) {
  const availability = checkAiAvailability('leaderboard_summary', language);
  if (!availability.available) {
    const err = new Error(availability.error);
    err.code = availability.code;
    throw err;
  }

  if (!regenerate) {
    const cached = await getCachedCommentary('leaderboard_summary', { language });
    if (cached) {
      return { content: cached.content, disclaimer: buildDisclaimer('leaderboard_summary', language), cached: true, createdAt: cached.createdAt };
    }
  }

  const context = await buildLeaderboardContext(userId);
  const systemPrompt = getSystemPrompt('leaderboard_summary', language);
  const userPrompt = getUserPrompt('leaderboard_summary', language);

  const { text, model, tokenUsage } = await generateText({ systemPrompt, userPrompt, context, locale: language });

  await saveCommentary({
    type: 'leaderboard_summary', content: text, context, model, tokenUsage, isCached: true, language,
  });

  await logInteraction({
    userId, role: userId ? 'user' : 'admin', feature: 'leaderboard_summary',
    question: 'Leaderboard summary', answer: text, context, model, tokenUsage,
  });

  return { content: text, disclaimer: buildDisclaimer('leaderboard_summary', language), cached: false };
}

async function getLatestLeaderboardSummary(userId = null, language = 'de') {
  const availability = checkAiAvailability('leaderboard_summary', language);
  if (!availability.available) {
    const err = new Error(availability.error);
    err.code = availability.code;
    throw err;
  }

  const cached = await getCachedCommentary('leaderboard_summary', { language });
  if (cached) {
    // Morning digest must be dynamic day-to-day: only reuse cache within the same day (digest timezone).
    const tz = getDigestTimezone();
    const cachedDay = getDateStringInTimezone(cached.createdAt, tz);
    const today = getDateStringInTimezone(new Date(), tz);
    if (cachedDay === today) {
      return { content: cached.content, disclaimer: buildDisclaimer('leaderboard_summary', language), cached: true, createdAt: cached.createdAt };
    }
  }
  return generateLeaderboardSummary(userId, { language, regenerate: true });
}

module.exports = { generateLeaderboardSummary, getLatestLeaderboardSummary };
