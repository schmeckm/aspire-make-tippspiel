const express = require('express');
const { sendError, translate } = require('../utils/apiResponse');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { aiRateLimitMiddleware } = require('../middleware/aiRateLimiter');
const { askAdminAssistant } = require('../services/aiAdminAssistantService');
const { generateLeaderboardSummary } = require('../services/aiLeaderboardService');
const { generateBonusQuestionSuggestions } = require('../services/aiBonusQuestionService');
const { generateReminderText } = require('../services/aiReminderTextService');
const { AICommentary, AIInteractionLog } = require('../models');

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

function handleAiError(error, res) {
  const status = error.code === 'AI_DISABLED' || error.code === 'NO_API_KEY' ? 503
    : error.code === 'LLM_ERROR' ? 502 : 500;
  res.status(status).json({ error: error.message, code: error.code });
}

const { normalizeLocale } = require('../services/i18nService');

function resolveLanguage(req) {
  return normalizeLocale(req.body?.language || req.query?.language || req.locale);
}

router.post('/assistant', aiRateLimitMiddleware('admin_assistant'), async (req, res) => {
  try {
    const language = resolveLanguage(req);
    const result = await askAdminAssistant(req.user.id, req.body?.question, language);
    res.json(result);
  } catch (error) {
    handleAiError(error, res);
  }
});

router.post('/leaderboard-summary/regenerate', async (req, res) => {
  try {
    const language = resolveLanguage(req);
    const result = await generateLeaderboardSummary(null, { regenerate: true, language });
    res.json(result);
  } catch (error) {
    handleAiError(error, res);
  }
});

router.post('/bonus-question-suggestions', aiRateLimitMiddleware('bonus_question_suggestions'), async (req, res) => {
  try {
    const language = resolveLanguage(req);
    const result = await generateBonusQuestionSuggestions(req.user.id, { ...req.body, language });
    res.json(result);
  } catch (error) {
    handleAiError(error, res);
  }
});

router.post('/reminder-text', aiRateLimitMiddleware('reminder_text'), async (req, res) => {
  try {
    const language = resolveLanguage(req);
    const result = await generateReminderText(req.user.id, { ...req.body, language });
    res.json(result);
  } catch (error) {
    handleAiError(error, res);
  }
});

router.get('/commentaries', async (req, res) => {
  try {
    const where = {};
    if (req.query.type) where.type = req.query.type;
    const commentaries = await AICommentary.findAll({
      where, order: [['createdAt', 'DESC']], limit: parseInt(req.query.limit || '50', 10),
    });
    res.json(commentaries);
  } catch (error) {
    sendError(res, req, 500, 'errors.aiCommentsLoadFailed');
  }
});

router.get('/interaction-log', async (req, res) => {
  try {
    const where = {};
    if (req.query.feature) where.feature = req.query.feature;
    if (req.query.userId) where.userId = req.query.userId;
    const logs = await AIInteractionLog.findAll({
      where, order: [['createdAt', 'DESC']], limit: parseInt(req.query.limit || '100', 10),
    });
    res.json(logs);
  } catch (error) {
    sendError(res, req, 500, 'errors.aiLogLoadFailed');
  }
});

module.exports = router;
