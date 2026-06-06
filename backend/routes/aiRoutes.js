const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { aiRateLimitMiddleware } = require('../middleware/aiRateLimiter');
const { generateMatchPreview } = require('../services/aiMatchPreviewService');
const { askUserCoach } = require('../services/aiUserCoachService');
const { generateLeaderboardSummary } = require('../services/aiLeaderboardService');
const { getCachedCommentary } = require('../services/aiMatchPreviewService');
const { buildDisclaimer } = require('../services/aiGuardrailService');
const { checkRateLimit } = require('../middleware/aiRateLimiter');
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

router.get('/leaderboard-summary', authMiddleware, async (req, res) => {
  try {
    const language = resolveLanguage(req);
    const cached = await getCachedCommentary('leaderboard_summary');
    if (cached) {
      return res.json({
        content: cached.content,
        disclaimer: buildDisclaimer('leaderboard_summary', language),
        cached: true,
        createdAt: cached.createdAt,
      });
    }

    const rateResult = await checkRateLimit(req.user.id, 'leaderboard_summary', language);
    if (!rateResult.allowed) {
      return res.status(429).json({ error: rateResult.error, code: 'AI_RATE_LIMIT' });
    }

    try {
      const result = await generateLeaderboardSummary(req.user.id, { language });
      return res.json(result);
    } catch (error) {
      if (['LLM_ERROR', 'NO_API_KEY', 'AI_DISABLED', 'FEATURE_DISABLED'].includes(error.code)) {
        return res.json({
          content: null,
          unavailable: true,
          error: error.message,
          disclaimer: buildDisclaimer('leaderboard_summary', language),
          cached: false,
        });
      }
      throw error;
    }
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
