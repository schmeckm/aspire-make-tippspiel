const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { sendError } = require('../utils/apiResponse');
const {
  listTeams,
  getTeamById,
  findTeamByName,
  listPlayers,
  isFootballApiAvailable,
} = require('../services/footballTeamService');
const {
  getStandings,
  getScorers,
  getLiveMatches,
} = require('../services/footballCompetitionService');

const router = express.Router();

router.use(authMiddleware);

router.get('/players', async (req, res) => {
  try {
    if (!isFootballApiAvailable()) {
      return sendError(res, req, 503, 'errors.footballApiNotConfigured');
    }

    const players = await listPlayers(req.query.search || '');
    res.json(players);
  } catch (error) {
    console.error('Football players list error:', error.message);
    sendError(res, req, error.code === 'NO_API_KEY' ? 503 : 502, 'errors.footballPlayersLoadFailed');
  }
});

router.get('/teams', async (req, res) => {
  try {
    if (!isFootballApiAvailable()) {
      return sendError(res, req, 503, 'errors.footballApiNotConfigured');
    }

    const { name } = req.query;
    if (name) {
      const team = await findTeamByName(String(name));
      if (!team) return sendError(res, req, 404, 'errors.footballTeamNotFound');
      return res.json(team);
    }

    const teams = await listTeams();
    res.json(teams);
  } catch (error) {
    console.error('Football teams list error:', error.message);
    sendError(res, req, error.code === 'NO_API_KEY' ? 503 : 502, 'errors.footballTeamsLoadFailed');
  }
});

router.get('/teams/:id', async (req, res) => {
  try {
    if (!isFootballApiAvailable()) {
      return sendError(res, req, 503, 'errors.footballApiNotConfigured');
    }

    const resolveImages = req.query.resolveImages === '1' || req.query.resolveImages === 'true';
    const team = await getTeamById(req.params.id, { resolveImages });
    if (!team) return sendError(res, req, 404, 'errors.footballTeamNotFound');
    res.json(team);
  } catch (error) {
    console.error('Football team detail error:', error.message);
    sendError(res, req, error.code === 'NO_API_KEY' ? 503 : 502, 'errors.footballTeamLoadFailed');
  }
});

router.get('/standings', async (req, res) => {
  try {
    if (!isFootballApiAvailable()) {
      return sendError(res, req, 503, 'errors.footballApiNotConfigured');
    }

    const { matchday, season, date } = req.query;
    const standings = await getStandings({ matchday, season, date });
    res.json(standings);
  } catch (error) {
    console.error('Football standings error:', error.message);
    sendError(res, req, error.code === 'NO_API_KEY' ? 503 : 502, 'errors.footballStandingsLoadFailed');
  }
});

router.get('/scorers', async (req, res) => {
  try {
    if (!isFootballApiAvailable()) {
      return sendError(res, req, 503, 'errors.footballApiNotConfigured');
    }

    const { limit, season } = req.query;
    const scorers = await getScorers({ limit, season });
    res.json(scorers);
  } catch (error) {
    console.error('Football scorers error:', error.message);
    sendError(res, req, error.code === 'NO_API_KEY' ? 503 : 502, 'errors.footballScorersLoadFailed');
  }
});

router.get('/matches', async (req, res) => {
  try {
    if (!isFootballApiAvailable()) {
      return sendError(res, req, 503, 'errors.footballApiNotConfigured');
    }

    const {
      status, date, dateFrom, dateTo, stage, group, matchday, season, limit, offset,
    } = req.query;

    const matches = await getLiveMatches({
      status,
      date,
      dateFrom,
      dateTo,
      stage,
      group,
      matchday,
      season,
      limit,
      offset,
    });

    res.json(matches);
  } catch (error) {
    console.error('Football matches error:', error.message);
    sendError(res, req, error.code === 'NO_API_KEY' ? 503 : 502, 'errors.footballMatchesLoadFailed');
  }
});

module.exports = router;
