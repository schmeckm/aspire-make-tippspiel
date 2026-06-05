const { buildAdminContext, buildMissingPredictionsContext } = require('./aiContextBuilderService');
const { generateText, getSystemPrompt, checkAiAvailability } = require('./llmService');
const { logInteraction } = require('./aiMatchPreviewService');

async function askAdminAssistant(userId, question) {
  const availability = checkAiAvailability('admin_assistant');
  if (!availability.available) {
    const err = new Error(availability.error);
    err.code = availability.code;
    throw err;
  }

  const context = await buildAdminContext();
  const systemPrompt = getSystemPrompt('admin_assistant');
  const userPrompt = question || 'Gib mir einen Überblick über den aktuellen Systemzustand und mögliche Probleme.';

  const { text, model, tokenUsage } = await generateText({ systemPrompt, userPrompt, context });

  await logInteraction({
    userId, role: 'admin', feature: 'admin_assistant',
    question: userPrompt, answer: text, context, model, tokenUsage,
  });

  return {
    answer: text,
    suggestedActions: [
      { label: 'Fehlende Tipps analysieren', question: 'Welche Nutzer haben heute noch keine Tipps abgegeben?' },
      { label: 'Punkteproblem prüfen', question: 'Warum wurden für ein Spiel möglicherweise keine Punkte berechnet?' },
      { label: 'CSV Import prüfen', question: 'Welche Daten könnten nach dem CSV-Import fehlen?' },
      { label: 'Reminder-Text erstellen', question: 'Erstelle einen freundlichen Reminder-Text für fehlende Tipps.' },
      { label: 'Bonusfragen vorschlagen', question: 'Schlage 5 passende Bonusfragen für die WM 2026 vor.' },
    ],
  };
}

module.exports = { askAdminAssistant };
