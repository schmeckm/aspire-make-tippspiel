const { buildLeaderboardContext } = require('./aiContextBuilderService');
const { generateText, getSystemPrompt, checkAiAvailability } = require('./llmService');
const { buildDisclaimer, getUserPrompt } = require('./aiGuardrailService');
const { getCachedCommentary, saveCommentary, logInteraction } = require('./aiMatchPreviewService');

async function generateLeaderboardSummary(userId = null, { regenerate = false, language = 'de' } = {}) {
  const availability = checkAiAvailability('leaderboard_summary', language);
  if (!availability.available) {
    const err = new Error(availability.error);
    err.code = availability.code;
    throw err;
  }

  if (!regenerate) {
    const cached = await getCachedCommentary('leaderboard_summary');
    if (cached) {
      return { content: cached.content, disclaimer: buildDisclaimer('leaderboard_summary', language), cached: true, createdAt: cached.createdAt };
    }
  }

  const context = await buildLeaderboardContext(userId);
  const systemPrompt = getSystemPrompt('leaderboard_summary', language);
  const userPrompt = getUserPrompt('leaderboard_summary', language);

  const { text, model, tokenUsage } = await generateText({ systemPrompt, userPrompt, context, locale: language });

  await saveCommentary({
    type: 'leaderboard_summary', content: text, context, model, tokenUsage, isCached: true,
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

  const cached = await getCachedCommentary('leaderboard_summary');
  if (cached) {
    return { content: cached.content, disclaimer: buildDisclaimer('leaderboard_summary', language), cached: true, createdAt: cached.createdAt };
  }
  return generateLeaderboardSummary(userId, { language });
}

module.exports = { generateLeaderboardSummary, getLatestLeaderboardSummary };
