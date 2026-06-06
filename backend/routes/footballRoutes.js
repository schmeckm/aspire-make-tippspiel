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
const {
  getHead2HeadForMatch,
  getHead2HeadByTeamIds,
} = require('../services/headToHeadService');

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
      const summary = await findTeamByName(String(name));
      if (!summary) return sendError(res, req, 404, 'errors.footballTeamNotFound');
      const team = await getTeamById(summary.id);
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
    const maxResolve = Math.min(
      Math.max(parseInt(req.query.maxResolve, 10) || 2, 1),
      6,
    );
    const team = await getTeamById(req.params.id, { resolveImages, maxResolve });
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

router.get('/head2head/match/:matchId', async (req, res) => {
  try {
    if (!isFootballApiAvailable()) {
      return sendError(res, req, 503, 'errors.footballApiNotConfigured');
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 30);
    const competitions = req.query.competitions || 'WC';
    const data = await getHead2HeadForMatch(req.params.matchId, { limit, competitions });
    if (!data) return sendError(res, req, 404, 'errors.matchNotFound');
    if (!data.available) return sendError(res, req, 404, 'errors.footballHead2HeadUnavailable');
    res.json(data);
  } catch (error) {
    console.error('Football head2head match error:', error.message);
    sendError(res, req, error.code === 'NO_API_KEY' ? 503 : 502, 'errors.footballHead2HeadLoadFailed');
  }
});

router.get('/head2head/teams/:teamAId/:teamBId', async (req, res) => {
  try {
    if (!isFootballApiAvailable()) {
      return sendError(res, req, 503, 'errors.footballApiNotConfigured');
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 30);
    const competitions = req.query.competitions || 'WC';
    const data = await getHead2HeadByTeamIds(req.params.teamAId, req.params.teamBId, {
      limit,
      competitions,
      teamAName: req.query.teamAName || null,
      teamBName: req.query.teamBName || null,
    });
    if (!data.available) return sendError(res, req, 404, 'errors.footballHead2HeadUnavailable');
    res.json(data);
  } catch (error) {
    console.error('Football head2head teams error:', error.message);
    sendError(res, req, error.code === 'NO_API_KEY' ? 503 : 502, 'errors.footballHead2HeadLoadFailed');
  }
});

module.exports = router;
