const { getSystemPrompt, sanitizeOutput } = require('./aiGuardrailService');
const { t } = require('./i18nService');

function isAiEnabled() {
  return process.env.AI_FEATURES_ENABLED !== 'false';
}

function isApiKeyConfigured() {
  return !!process.env.OPENAI_API_KEY;
}

function getAiConfig() {
  return {
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '800', 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.4'),
    cacheEnabled: process.env.AI_CACHE_ENABLED !== 'false',
    adminFeaturesEnabled: process.env.AI_ADMIN_FEATURES_ENABLED !== 'false',
    userCoachEnabled: process.env.AI_USER_COACH_ENABLED !== 'false',
    matchPreviewEnabled: process.env.AI_MATCH_PREVIEW_ENABLED !== 'false',
    leaderboardCommentaryEnabled: process.env.AI_LEADERBOARD_COMMENTARY_ENABLED !== 'false',
  };
}

function checkAiAvailability(feature = 'general', locale = 'de') {
  if (!isAiEnabled()) {
    return { available: false, error: t('errors.aiDisabled', locale), code: 'AI_DISABLED' };
  }
  if (!isApiKeyConfigured()) {
    return { available: false, error: t('errors.aiNoApiKey', locale), code: 'NO_API_KEY' };
  }

  const config = getAiConfig();
  if (feature === 'user_coach' && !config.userCoachEnabled) {
    return { available: false, error: t('errors.aiCoachDisabled', locale), code: 'FEATURE_DISABLED' };
  }
  if (feature === 'match_preview' && !config.matchPreviewEnabled) {
    return { available: false, error: t('errors.aiMatchPreviewDisabled', locale), code: 'FEATURE_DISABLED' };
  }
  if (feature === 'leaderboard_summary' && !config.leaderboardCommentaryEnabled) {
    return { available: false, error: t('errors.aiLeaderboardDisabled', locale), code: 'FEATURE_DISABLED' };
  }
  if (feature.startsWith('admin') && !config.adminFeaturesEnabled) {
    return { available: false, error: t('errors.aiAdminDisabled', locale), code: 'FEATURE_DISABLED' };
  }

  return { available: true };
}

async function generateText({ systemPrompt, userPrompt, context, maxTokens, temperature, responseFormat, locale = 'de' }) {
  const availability = checkAiAvailability('general', locale);
  if (!availability.available) {
    const err = new Error(availability.error);
    err.code = availability.code;
    throw err;
  }

  const config = getAiConfig();
  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const contextStr = context ? `\n\nContext (JSON):\n${JSON.stringify(context, null, 0).slice(0, 8000)}` : '';
  const fullUserPrompt = `${userPrompt}${contextStr}`;

  try {
    const params = {
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: fullUserPrompt },
      ],
      max_tokens: maxTokens || config.maxTokens,
      temperature: temperature ?? config.temperature,
    };

    if (responseFormat === 'json') {
      params.response_format = { type: 'json_object' };
    }

    const response = await client.chat.completions.create(params);
    const text = sanitizeOutput(response.choices[0]?.message?.content || '');
    const usage = response.usage ? {
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
    } : null;

    return { text, model: config.model, tokenUsage: usage };
  } catch (error) {
    console.error('LLM API error:', error.message);
    const err = new Error(t('errors.aiLlmError', locale));
    err.code = 'LLM_ERROR';
    err.originalMessage = error.message;
    throw err;
  }
}

module.exports = {
  isAiEnabled,
  isApiKeyConfigured,
  getAiConfig,
  checkAiAvailability,
  generateText,
  getSystemPrompt,
};
