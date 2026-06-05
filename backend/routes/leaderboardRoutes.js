const express = require('express');
const { sendError, translate } = require('../utils/apiResponse');
const { getLeaderboard, getTeamRanking, exportLeaderboardCsv } = require('../services/leaderboardService');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { filter, teamId, sortBy } = req.query;
    const includeEmail = req.user.role === 'admin';
    const leaderboard = await getLeaderboard({
      filter: filter || 'overall',
      teamId: teamId ? parseInt(teamId, 10) : null,
      sortBy: sortBy || 'total',
      includeEmail,
    });
    res.json(leaderboard);
  } catch (error) {
    console.error(error);
    sendError(res, req, 500, 'errors.leaderboardLoadFailed');
  }
});

router.get('/export', authMiddleware, async (req, res) => {
  try {
    const includeEmail = req.user.role === 'admin';
    const leaderboard = await getLeaderboard({
      filter: req.query.filter || 'overall',
      teamId: req.query.teamId ? parseInt(req.query.teamId, 10) : null,
      includeEmail,
    });
    const csv = exportLeaderboardCsv(leaderboard);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=hitliste.csv');
    res.send(csv);
  } catch (error) {
    sendError(res, req, 500, 'errors.exportFailed');
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

module.exports = router;
