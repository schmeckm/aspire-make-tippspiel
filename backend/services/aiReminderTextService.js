const { generateText, getSystemPrompt, checkAiAvailability } = require('./llmService');
const { logInteraction } = require('./aiMatchPreviewService');

async function generateReminderText(userId, { targetGroup = 'Nutzer mit fehlenden Tipps', missingCount = 0, upcomingDate = null, tone = 'friendly' } = {}) {
  const availability = checkAiAvailability('admin_reminder');
  if (!availability.available) {
    const err = new Error(availability.error);
    err.code = availability.code;
    throw err;
  }

  const context = { targetGroup, missingCount, upcomingDate, tone };
  const systemPrompt = getSystemPrompt('reminder_text');

  const userPrompt = `Erstelle einen Reminder für "${targetGroup}".
Fehlende Tipps: ${missingCount}. ${upcomingDate ? `Anstehendes Datum: ${upcomingDate}.` : ''}
Ton: ${tone}.
Antworte als JSON: {"subject":"...","emailBody":"...","notificationText":"..."}`;

  const { text, model, tokenUsage } = await generateText({
    systemPrompt, userPrompt, context, responseFormat: 'json',
  });

  let result = { subject: '', emailBody: text, notificationText: text.slice(0, 160) };
  try {
    result = { ...result, ...JSON.parse(text) };
  } catch {
    // use defaults
  }

  await logInteraction({
    userId, role: 'admin', feature: 'reminder_text',
    question: userPrompt, answer: text, context, model, tokenUsage,
  });

  return result;
}

module.exports = { generateReminderText };
