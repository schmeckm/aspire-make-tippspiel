const { AICommentary, AIInteractionLog } = require('../models');
const { PROMPT_VERSION, buildDisclaimer, getUserPrompt } = require('./aiGuardrailService');
const { buildMatchContext } = require('./aiContextBuilderService');
const { generateText, checkAiAvailability, getAiConfig, getSystemPrompt } = require('./llmService');

async function logInteraction({ userId, role, feature, question, answer, context, model, tokenUsage, status, errorMessage }) {
  try {
    await AIInteractionLog.create({
      userId, role, feature, question, answer,
      inputContextJson: context ? JSON.stringify(context).slice(0, 10000) : null,
      model, tokenUsageJson: tokenUsage ? JSON.stringify(tokenUsage) : null,
      status: status || 'success', errorMessage,
    });
  } catch (e) {
    console.error('AI interaction log error:', e.message);
  }
}

async function getCachedCommentary(type, { matchId, userId } = {}) {
  const config = getAiConfig();
  if (!config.cacheEnabled) return null;

  const where = { type, isCached: true };
  if (matchId) where.matchId = matchId;
  if (userId) where.userId = userId;

  return AICommentary.findOne({ where, order: [['createdAt', 'DESC']] });
}

async function saveCommentary({ type, matchId, userId, content, context, model, tokenUsage, isCached }) {
  return AICommentary.create({
    type, matchId: matchId || null, userId: userId || null,
    content, inputContextJson: JSON.stringify(context).slice(0, 10000),
    promptVersion: PROMPT_VERSION, model,
    tokenUsageJson: tokenUsage ? JSON.stringify(tokenUsage) : null,
    isCached: !!isCached,
  });
}

async function generateMatchPreview(matchId, userId, { regenerate = false, language = 'de' } = {}) {
  const availability = checkAiAvailability('match_preview', language);
  if (!availability.available) {
    const err = new Error(availability.error);
    err.code = availability.code;
    throw err;
  }

  if (!regenerate) {
    const cached = await getCachedCommentary('match_preview', { matchId });
    if (cached) {
      return {
        content: cached.content,
        disclaimer: buildDisclaimer('match_preview', language),
        cached: true,
        createdAt: cached.createdAt,
      };
    }
  }

  const context = await buildMatchContext(matchId, userId);
  if (!context) {
    const { t } = require('./i18nService');
    throw new Error(t('errors.matchNotFound', language));
  }

  const systemPrompt = getSystemPrompt('match_preview', language);
  const userPrompt = getUserPrompt('match_preview', language);

  const { text, model, tokenUsage } = await generateText({ systemPrompt, userPrompt, context, locale: language });

  await saveCommentary({
    type: 'match_preview', matchId, userId, content: text, context, model, tokenUsage, isCached: true,
  });

  await logInteraction({
    userId, role: 'user', feature: 'match_preview',
    question: `Spielvorschau #${matchId}`, answer: text, context, model, tokenUsage,
  });

  return { content: text, disclaimer: buildDisclaimer('match_preview', language), cached: false };
}

module.exports = { generateMatchPreview, getCachedCommentary, saveCommentary, logInteraction };
