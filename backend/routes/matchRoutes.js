const express = require('express');
const { sendError, translate } = require('../utils/apiResponse');
const { Op } = require('sequelize');
const { Match, Prediction, User, Team } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { applyFinishedMatchUpdate } = require('../services/resultSyncService');
const { saveLeaderboardSnapshot } = require('../services/leaderboardService');
const { logAudit } = require('../services/auditService');
const socketService = require('../services/socketService');
const { isMatchEditable } = require('../services/matchLockService');
const { countPredictionsForMatch } = require('../services/predictionProtectionService');
const { attachStadiumImage, attachStadiumImages } = require('../services/matchPresentationService');
const { getGroupStandings } = require('../services/groupStandingsService');
const { validatePredictionScores } = require('../utils/predictionValidation');

const router = express.Router();

router.get('/group-standings', authMiddleware, async (req, res) => {
  try {
    const standings = await getGroupStandings();
    res.json(standings);
  } catch (error) {
    console.error(error);
    sendError(res, req, 500, 'errors.matchesLoadFailed');
  }
});

router.get('/groups', authMiddleware, async (req, res) => {
  try {
    const rows = await Match.findAll({
      attributes: ['groupName'],
      where: { groupName: { [Op.ne]: null } },
      group: ['groupName'],
      order: [['groupName', 'ASC']],
      raw: true,
    });
    res.json(rows.map((row) => row.groupName));
  } catch (error) {
    console.error(error);
    sendError(res, req, 500, 'errors.matchesLoadFailed');
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { filter, groupName } = req.query;
    const userId = req.user.id;

    let where = {};

    if (filter === 'finished') {
      where.status = 'finished';
    } else if (filter === 'group') {
      where.groupName = { [Op.ne]: null };
    } else if (filter === 'knockout') {
      where.groupName = null;
    }

    if (groupName) {
      where.groupName = String(groupName).trim().toUpperCase();
    }

    const matches = await Match.findAll({
      where,
      order: [['kickoffTime', 'ASC']],
    });

    const userPredictions = await Prediction.findAll({
      where: { userId },
    });
    const predictionMap = new Map(userPredictions.map((p) => [p.matchId, p]));

    let result = attachStadiumImages(matches.map((match) => {
      const prediction = predictionMap.get(match.id);
      const editable = isMatchEditable(match);
      return {
        ...match.toJSON(),
        prediction: prediction || null,
        canPredict: editable,
        hasPrediction: !!prediction,
      };
    }));

    if (filter === 'open') {
      result = result.filter((m) => m.canPredict);
    } else if (filter === 'missing') {
      result = result.filter((m) => m.canPredict && !m.hasPrediction);
    }

    res.json(result);
  } catch (error) {
    console.error(error);
    sendError(res, req, 500, 'errors.matchesLoadFailed');
  }
});

router.get('/:id/predictions', authMiddleware, async (req, res) => {
  try {
    const match = await Match.findByPk(req.params.id);
    if (!match) {
      return sendError(res, req, 404, 'errors.matchNotFound');
    }
    const { sanitizePredictionsForViewer } = require('../services/predictionVisibilityService');
    const predictions = await Prediction.findAll({
      where: { matchId: match.id },
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'], include: [{ model: Team, as: 'team', attributes: ['id', 'name'] }] },
        { model: Match, as: 'match' },
      ],
      order: [['submittedAt', 'ASC']],
    });
    res.json(await sanitizePredictionsForViewer(predictions, req.user));
  } catch (error) {
    sendError(res, req, 500, 'errors.predictionsLoadFailed');
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const match = await Match.findByPk(req.params.id);
    if (!match) {
      return sendError(res, req, 404, 'errors.matchNotFound');
    }
    res.json(attachStadiumImage(match.toJSON()));
  } catch (error) {
    sendError(res, req, 500, 'errors.matchLoadFailed');
  }
});

router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      matchNumber, stage, groupName, homeTeam, awayTeam,
      kickoffTime, stadium, city,
    } = req.body;

    if (!matchNumber || !stage || !homeTeam || !awayTeam || !kickoffTime) {
      return sendError(res, req, 400, 'errors.requiredFields');
    }

    const match = await Match.create({
      matchNumber,
      stage,
      groupName: groupName || null,
      homeTeam,
      awayTeam,
      kickoffTime,
      stadium: stadium || null,
      city: city || null,
    });

    res.status(201).json(match);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return sendError(res, req, 409, 'errors.matchNumberTaken');
    }
    sendError(res, req, 500, 'errors.matchCreateFailed');
  }
});

router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const match = await Match.findByPk(req.params.id);
    if (!match) {
      return sendError(res, req, 404, 'errors.matchNotFound');
    }

    const fields = [
      'matchNumber', 'stage', 'groupName', 'homeTeam', 'awayTeam',
      'kickoffTime', 'stadium', 'city', 'homeScore', 'awayScore', 'status', 'isManuallyLocked',
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        match[field] = req.body[field];
      }
    });

    await match.save();
    res.json(match);
  } catch (error) {
    sendError(res, req, 500, 'errors.matchUpdateFailed');
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const match = await Match.findByPk(req.params.id);
    if (!match) {
      return sendError(res, req, 404, 'errors.matchNotFound');
    }

    const predictionCount = await countPredictionsForMatch(match.id);
    if (predictionCount > 0) {
      return sendError(res, req, 409, 'errors.matchHasPredictions', { count: predictionCount });
    }

    await match.destroy();
    res.json({ message: 'Spiel gelöscht.' });
  } catch (error) {
    sendError(res, req, 500, 'errors.matchDeleteFailed');
  }
});

router.post('/:id/result', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const match = await Match.findByPk(req.params.id);
    if (!match) {
      return sendError(res, req, 404, 'errors.matchNotFound');
    }

    const { homeScore, awayScore } = req.body;
    if (homeScore === undefined || awayScore === undefined) {
      return sendError(res, req, 400, 'errors.scoresRequired');
    }

    const scoreValidation = validatePredictionScores(homeScore, awayScore);
    if (!scoreValidation.ok) {
      return sendError(res, req, 400, scoreValidation.error, scoreValidation.meta);
    }

    await applyFinishedMatchUpdate(match, {
      homeScore: scoreValidation.predictedHomeScore,
      awayScore: scoreValidation.predictedAwayScore,
      status: 'finished',
      isManuallyLocked: true,
      isApiManaged: false,
    });
    await match.reload();

    await saveLeaderboardSnapshot();
    socketService.emitToMatches('match:update', match);
    await logAudit({
      userId: req.user.id,
      action: 'MATCH_RESULT',
      entityType: 'Match',
      entityId: match.id,
      newValue: { homeScore, awayScore },
      req,
    });

    res.json({ message: 'Ergebnis gespeichert und Punkte berechnet.', match });
  } catch (error) {
    sendError(res, req, 500, 'errors.resultSaveFailed');
  }
});

router.post('/:id/lock', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const match = await Match.findByPk(req.params.id);
    if (!match) {
      return sendError(res, req, 404, 'errors.matchNotFound');
    }

    await match.update({ status: 'locked', isManuallyLocked: true });
    res.json({ message: 'Spiel gesperrt.', match });
  } catch (error) {
    sendError(res, req, 500, 'errors.matchLockFailed');
  }
});

router.post('/:id/unlock', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const match = await Match.findByPk(req.params.id);
    if (!match) {
      return sendError(res, req, 404, 'errors.matchNotFound');
    }

    const newStatus = match.homeScore !== null && match.awayScore !== null ? 'finished' : 'scheduled';
    await match.update({ status: newStatus, isManuallyLocked: false });
    res.json({ message: 'Spiel entsperrt.', match });
  } catch (error) {
    sendError(res, req, 500, 'errors.matchUnlockFailed');
  }
});

router.post('/:id/toggle-api', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const match = await Match.findByPk(req.params.id);
    if (!match) return sendError(res, req, 404, 'errors.matchNotFound');

    const isApiManaged = req.body.isApiManaged !== undefined ? req.body.isApiManaged : !match.isApiManaged;
    await match.update({ isApiManaged, isManuallyLocked: !isApiManaged });
    await logAudit({
      userId: req.user.id,
      action: 'MATCH_API_TOGGLE',
      entityType: 'Match',
      entityId: match.id,
      newValue: { isApiManaged },
      req,
    });
    res.json({ message: isApiManaged ? 'API-Sync aktiviert.' : 'API-Sync deaktiviert (manuell).', match });
  } catch (error) {
    sendError(res, req, 500, 'errors.actionFailed');
  }
});

module.exports = router;
