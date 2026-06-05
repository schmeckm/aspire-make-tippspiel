const express = require('express');
const { sendError } = require('../utils/apiResponse');
const { getSetting } = require('../services/settingsService');
const { getLeaderboard } = require('../services/leaderboardService');
const { Match } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

async function assertDisplayEnabled(req, res) {
  const enabled = await getSetting('displayModeEnabled', true);
  if (!enabled) {
    sendError(res, req, 403, 'errors.displayDisabled');
    return false;
  }
  return true;
}

router.get('/leaderboard', async (req, res) => {
  try {
    if (!(await assertDisplayEnabled(req, res))) return;
    const leaderboard = await getLeaderboard({ filter: 'overall', includeEmail: false });
    const top = leaderboard.slice(0, 20);
    res.json({ updatedAt: new Date().toISOString(), entries: top });
  } catch (error) {
    sendError(res, req, 500, 'errors.leaderboardLoadFailed');
  }
});

router.get('/live-matches', async (req, res) => {
  try {
    if (!(await assertDisplayEnabled(req, res))) return;
    const matches = await Match.findAll({
      where: { status: { [Op.in]: ['live', 'halftime', 'scheduled'] } },
      order: [['kickoffTime', 'ASC']],
      limit: 12,
    });
    res.json({
      updatedAt: new Date().toISOString(),
      matches: matches.map((m) => ({
        id: m.id,
        matchNumber: m.matchNumber,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        status: m.status,
        kickoffTime: m.kickoffTime,
        stage: m.stage,
      })),
    });
  } catch (error) {
    sendError(res, req, 500, 'errors.matchesLoadFailed');
  }
});

module.exports = router;
