const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { aiRateLimitMiddleware } = require('../middleware/aiRateLimiter');
const { generateMatchPreview } = require('../services/aiMatchPreviewService');
const { askUserCoach } = require('../services/aiUserCoachService');
const { getLatestLeaderboardSummary } = require('../services/aiLeaderboardService');
const { getDashboardInsights } = require('../services/aiDashboardInsightsService');
const { isAiEnabled, isApiKeyConfigured, getAiConfig } = require('../services/llmService');
const { sendError } = require('../utils/apiResponse');
const { normalizeLocale } = require('../services/i18nService');

const router = express.Router();

function resolveLanguage(req) {
  return normalizeLocale(req.body?.language || req.query?.language || req.locale);
}

function handleAiError(error, req, res) {
  const status = error.code === 'AI_DISABLED' || error.code === 'NO_API_KEY' ? 503
    : error.code === 'LLM_ERROR' ? 502 : 500;
  res.status(status).json({ error: error.message, code: error.code });
}

router.get('/status', authMiddleware, (req, res) => {
  res.json({ enabled: isAiEnabled(), apiKeyConfigured: isApiKeyConfigured(), config: getAiConfig() });
});

router.post('/match-preview/:matchId', authMiddleware, aiRateLimitMiddleware('match_preview'), async (req, res) => {
  try {
    const regenerate = req.body?.regenerate && req.user.role === 'admin';
    const language = resolveLanguage(req);
    const result = await generateMatchPreview(parseInt(req.params.matchId, 10), req.user.id, { regenerate, language });
    res.json(result);
  } catch (error) {
    handleAiError(error, req, res);
  }
});

router.post('/user-coach', authMiddleware, aiRateLimitMiddleware('user_coach'), async (req, res) => {
  try {
    const language = resolveLanguage(req);
    const result = await askUserCoach(req.user.id, req.body?.question, language);
    res.json(result);
  } catch (error) {
    handleAiError(error, req, res);
  }
});

router.get('/leaderboard-summary', authMiddleware, aiRateLimitMiddleware('leaderboard_summary'), async (req, res) => {
  try {
    const language = resolveLanguage(req);
    const result = await getLatestLeaderboardSummary(req.user.id, language);
    res.json(result);
  } catch (error) {
    handleAiError(error, req, res);
  }
});

router.get('/dashboard-insights', authMiddleware, aiRateLimitMiddleware('dashboard_insights'), async (req, res) => {
  try {
    const language = resolveLanguage(req);
    const result = await getDashboardInsights(req.user.id, language);
    res.json(result);
  } catch (error) {
    handleAiError(error, req, res);
  }
});

module.exports = router;
