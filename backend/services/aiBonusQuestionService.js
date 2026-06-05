const { buildBonusQuestionContext } = require('./aiContextBuilderService');
const { generateText, getSystemPrompt, checkAiAvailability } = require('./llmService');
const { logInteraction } = require('./aiMatchPreviewService');

async function generateBonusQuestionSuggestions(userId, { numberOfQuestions = 5, difficulty = 'medium', category = null } = {}) {
  const availability = checkAiAvailability('admin_bonus');
  if (!availability.available) {
    const err = new Error(availability.error);
    err.code = availability.code;
    throw err;
  }

  const context = await buildBonusQuestionContext();
  const systemPrompt = getSystemPrompt('bonus_question_suggestions');

  const userPrompt = `Erstelle ${numberOfQuestions} Bonusfragen-Vorschläge für die WM 2026.
Schwierigkeit: ${difficulty}. ${category ? `Kategorie: ${category}.` : ''}
Antworte als JSON mit diesem Format:
{"questions":[{"questionText":"...","questionType":"single_choice","options":["..."],"suggestedPoints":10,"suggestedLockTimeRule":"Vor Turnierstart"}]}`;

  const { text, model, tokenUsage } = await generateText({
    systemPrompt, userPrompt, context, responseFormat: 'json',
  });

  let suggestions = [];
  try {
    const parsed = JSON.parse(text);
    suggestions = parsed.questions || parsed.suggestions || (Array.isArray(parsed) ? parsed : []);
  } catch {
    suggestions = [{ questionText: text, questionType: 'single_choice', suggestedPoints: 10 }];
  }

  await logInteraction({
    userId, role: 'admin', feature: 'bonus_question_suggestions',
    question: userPrompt, answer: text, context, model, tokenUsage,
  });

  return { suggestions, raw: text };
}

module.exports = { generateBonusQuestionSuggestions };
