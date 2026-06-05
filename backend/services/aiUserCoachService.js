const { buildUserContext } = require('./aiContextBuilderService');
const { generateText, checkAiAvailability } = require('./llmService');
const {
  getSystemPrompt,
  buildDisclaimer,
  getSuggestedCoachQuestions,
  getDefaultCoachPrompt,
} = require('./aiGuardrailService');
const { logInteraction } = require('./aiMatchPreviewService');
const { t } = require('./i18nService');

async function askUserCoach(userId, question, locale = 'de') {
  const availability = checkAiAvailability('user_coach', locale);
  if (!availability.available) {
    const err = new Error(availability.error);
    err.code = availability.code;
    throw err;
  }

  const context = await buildUserContext(userId);
  if (!context) throw new Error(t('errors.userNotFound', locale));

  const systemPrompt = getSystemPrompt('user_coach', locale);
  const userPrompt = question || getDefaultCoachPrompt(locale);

  const { text, model, tokenUsage } = await generateText({
    systemPrompt,
    userPrompt,
    context,
    locale,
  });

  await logInteraction({
    userId, role: 'user', feature: 'user_coach',
    question: userPrompt, answer: text, context, model, tokenUsage,
  });

  return {
    answer: text,
    disclaimer: buildDisclaimer('user_coach', locale),
    suggestedQuestions: getSuggestedCoachQuestions(locale),
  };
}

module.exports = { askUserCoach };
