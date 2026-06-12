const express = require('express');
const { sendError } = require('../utils/apiResponse');
const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const { getSetting } = require('../services/settingsService');
const { getMatchdayChallenge } = require('../services/matchdayChallengeService');

const router = express.Router();

function safeBool(value) {
  if (value === true || value === 'true' || value === '1' || value === 1) return true;
  if (value === false || value === 'false' || value === '0' || value === 0) return false;
  return null;
}

router.get('/matchday', optionalAuthMiddleware, async (req, res) => {
  try {
    const leaderboardPublic = await getSetting('leaderboardPublic', false);
    if (!req.user && !leaderboardPublic) {
      return sendError(res, req, 401, 'errors.notAuthenticated');
    }

    const includeAdminsSetting = await getSetting('includeAdminsInLeaderboard', false);
    const includeAdminsQuery = safeBool(req.query.includeAdmins);
    const includeAdmins = req.user?.role === 'admin'
      ? (includeAdminsQuery ?? includeAdminsSetting)
      : false;

    const teamId = req.query.teamId ? Number.parseInt(req.query.teamId, 10) : null;
    const date = typeof req.query.date === 'string' ? req.query.date.trim().slice(0, 10) : null;
    const timeZone = typeof req.query.timeZone === 'string' ? req.query.timeZone.trim().slice(0, 64) : null;
    const limit = req.query.limit ? Number.parseInt(req.query.limit, 10) : 10;

    const challenge = await getMatchdayChallenge({
      date: date || null,
      timeZone: timeZone || null,
      includeAdmins,
      teamId,
      limit,
    });

    return res.json(challenge);
  } catch (error) {
    console.error('Matchday challenge error:', error);
    return sendError(res, req, 500, 'errors.internalServer');
  }
});

// Admin-only endpoint to force-refresh cache version indirectly (future extension).
router.post('/matchday/refresh', authMiddleware, async (req, res) => {
  // For now: just compute and return (caller can refresh by varying date/tz).
  try {
    const date = typeof req.body?.date === 'string' ? req.body.date.trim().slice(0, 10) : null;
    const timeZone = typeof req.body?.timeZone === 'string' ? req.body.timeZone.trim().slice(0, 64) : null;
    const includeAdmins = req.user?.role === 'admin';
    const challenge = await getMatchdayChallenge({ date, timeZone, includeAdmins, limit: 10 });
    return res.json(challenge);
  } catch (error) {
    console.error('Matchday challenge refresh error:', error);
    return sendError(res, req, 500, 'errors.internalServer');
  }
});

module.exports = router;

