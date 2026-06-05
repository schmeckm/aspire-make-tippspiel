const express = require('express');
const { sendError, translate } = require('../utils/apiResponse');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
  getUserStatistics,
  getTeamStatistics,
  getAdminOverview,
  getUserFavoritesOverview,
} = require('../services/statisticsService');
const { getTeamRanking } = require('../services/leaderboardService');

const router = express.Router();

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const stats = await getUserStatistics(req.user.id);
    res.json(stats);
  } catch (error) {
    sendError(res, req, 500, 'errors.statisticsLoadFailed');
  }
});

router.get('/users/:id', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const isSelf = req.user.id === parseInt(req.params.id, 10);
    if (!isAdmin && !isSelf) return sendError(res, req, 403, 'errors.accessDenied');

    const stats = await getUserStatistics(req.params.id);
    if (!stats) return sendError(res, req, 404, 'errors.userNotFound');
    res.json(stats);
  } catch (error) {
    sendError(res, req, 500, 'errors.statisticsLoadFailed');
  }
});

router.get('/team-ranking', authMiddleware, async (req, res) => {
  try {
    const ranking = await getTeamRanking();
    res.json(ranking);
  } catch (error) {
    sendError(res, req, 500, 'errors.teamRankingLoadFailed');
  }
});

router.get('/team/:id', authMiddleware, async (req, res) => {
  try {
    const stats = await getTeamStatistics(req.params.id);
    if (!stats) return sendError(res, req, 404, 'errors.teamNotFound');
    res.json(stats);
  } catch (error) {
    sendError(res, req, 500, 'errors.statisticsLoadFailed');
  }
});

router.get('/admin/overview', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const overview = await getAdminOverview();
    res.json(overview);
  } catch (error) {
    sendError(res, req, 500, 'errors.overviewLoadFailed');
  }
});

router.get('/admin/favorites', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const overview = await getUserFavoritesOverview();
    res.json(overview);
  } catch (error) {
    sendError(res, req, 500, 'errors.favoritesOverviewLoadFailed');
  }
});

module.exports = router;
