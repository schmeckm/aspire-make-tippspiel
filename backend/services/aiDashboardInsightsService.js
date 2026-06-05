const { buildUserContext } = require('./aiContextBuilderService');
const { generateText, getSystemPrompt, checkAiAvailability } = require('./llmService');

async function getDashboardInsights(userId) {
  const context = await buildUserContext(userId);
  if (!context) return { insights: [], aiEnabled: false };

  const deterministic = [];

  if (context.missingTodayCount > 0) {
    deterministic.push({
      type: 'warning',
      icon: '⚠️',
      text: `Dir fehlen noch ${context.missingTodayCount} Tipp${context.missingTodayCount > 1 ? 's' : ''} für heute.`,
      action: '/matches?filter=missing',
    });
  }

  if (context.missingPredictionsCount > 0 && context.missingTodayCount === 0) {
    deterministic.push({
      type: 'info',
      icon: '📝',
      text: `Insgesamt fehlen dir noch ${context.missingPredictionsCount} Tipps.`,
      action: '/matches?filter=missing',
    });
  }

  if (context.exactResults > 0) {
    deterministic.push({
      type: 'success',
      icon: '🎯',
      text: `Du hast bereits ${context.exactResults} exakte${context.exactResults > 1 ? ' Ergebnisse' : 's Ergebnis'} getippt.`,
      action: '/my-predictions',
    });
  }

  if (context.rank && context.rank > 1) {
    const leader = context.rank - 1;
    deterministic.push({
      type: 'info',
      icon: '🏆',
      text: `Du bist auf Platz ${context.rank}. Mit guten Tipps kannst du noch aufholen!`,
      action: '/leaderboard',
    });
  }

  if (context.teamRanking && context.teamRanking.rank > 1) {
    deterministic.push({
      type: 'info',
      icon: '👥',
      text: `Dein Team "${context.teamName}" liegt auf Platz ${context.teamRanking.rank} in der Teamwertung.`,
      action: '/team-ranking',
    });
  }

  let aiInsight = null;
  const aiCheck = checkAiAvailability('user_coach');

  if (aiCheck.available && deterministic.length > 0) {
    try {
      const systemPrompt = getSystemPrompt('user_coach');
      const userPrompt = 'Formuliere EINEN kurzen, motivierenden Satz (max. 25 Wörter) als Dashboard-Tipp basierend auf den Daten. Keine Garantien.';
      const { text } = await generateText({ systemPrompt, userPrompt, context, maxTokens: 100 });
      aiInsight = { type: 'ai', icon: '🤖', text, action: '/ai-coach' };
    } catch {
      // AI optional for insights
    }
  }

  const insights = aiInsight ? [aiInsight, ...deterministic.slice(0, 2)] : deterministic.slice(0, 3);

  return { insights, aiEnabled: aiCheck.available };
}

module.exports = { getDashboardInsights };
