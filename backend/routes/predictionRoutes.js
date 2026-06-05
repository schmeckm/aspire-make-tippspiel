const express = require('express');
const { UniqueConstraintError } = require('sequelize');
const { sendError, translate } = require('../utils/apiResponse');
const { Prediction, Match, sequelize } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const { canEditPrediction } = require('../services/matchLockService');
const { calculatePoints } = require('../services/pointsCalculationService');
const { getScoringRules, saveLeaderboardSnapshot } = require('../services/leaderboardService');
const { validatePredictionScores } = require('../utils/predictionValidation');

const router = express.Router();

router.get('/my', authMiddleware, async (req, res) => {
  try {
    const predictions = await Prediction.findAll({
      where: { userId: req.user.id },
      include: [{ model: Match, as: 'match' }],
      order: [[{ model: Match, as: 'match' }, 'kickoffTime', 'ASC']],
    });
    res.json(predictions);
  } catch (error) {
    sendError(res, req, 500, 'errors.predictionsLoadFailed');
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { matchId, predictedHomeScore, predictedAwayScore } = req.body;

    if (!matchId || predictedHomeScore === undefined || predictedAwayScore === undefined) {
      return sendError(res, req, 400, 'errors.predictionRequired');
    }

    const scoreValidation = validatePredictionScores(predictedHomeScore, predictedAwayScore);
    if (!scoreValidation.ok) {
      return sendError(res, req, 400, scoreValidation.error, scoreValidation.meta);
    }

    const match = await Match.findByPk(matchId);
    if (!match) {
      return sendError(res, req, 404, 'errors.matchNotFound');
    }

    if (!canEditPrediction(match)) {
      return sendError(res, req, 403, 'errors.predictionClosed');
    }

    const prediction = await sequelize.transaction(async (transaction) => {
      const existing = await Prediction.findOne({
        where: { userId: req.user.id, matchId },
        transaction,
      });

      if (existing) {
        const err = new Error('exists');
        err.code = 'PREDICTION_EXISTS';
        throw err;
      }

      return Prediction.create({
        userId: req.user.id,
        matchId,
        predictedHomeScore: scoreValidation.predictedHomeScore,
        predictedAwayScore: scoreValidation.predictedAwayScore,
        submittedAt: new Date(),
      }, { transaction });
    });

    const full = await Prediction.findByPk(prediction.id, {
      include: [{ model: Match, as: 'match' }],
    });

    res.status(201).json(full);
  } catch (error) {
    if (error.code === 'PREDICTION_EXISTS') {
      return sendError(res, req, 409, 'errors.predictionExists');
    }
    if (error instanceof UniqueConstraintError) {
      return sendError(res, req, 409, 'errors.predictionExists');
    }
    sendError(res, req, 500, 'errors.predictionSaveFailed');
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const prediction = await Prediction.findByPk(req.params.id, {
      include: [{ model: Match, as: 'match' }],
    });

    if (!prediction) {
      return sendError(res, req, 404, 'errors.predictionNotFound');
    }

    const isAdmin = req.user.role === 'admin';
    if (prediction.userId !== req.user.id && !isAdmin) {
      return sendError(res, req, 403, 'errors.accessDenied');
    }

    if (!canEditPrediction(prediction.match, { allowAdminOverride: isAdmin, isAdmin })) {
      return sendError(res, req, 403, 'errors.predictionEditClosed');
    }

    const { predictedHomeScore, predictedAwayScore } = req.body;
    const home = predictedHomeScore !== undefined
      ? predictedHomeScore
      : prediction.predictedHomeScore;
    const away = predictedAwayScore !== undefined
      ? predictedAwayScore
      : prediction.predictedAwayScore;

    const scoreValidation = validatePredictionScores(home, away);
    if (!scoreValidation.ok) {
      return sendError(res, req, 400, scoreValidation.error, scoreValidation.meta);
    }

    prediction.predictedHomeScore = scoreValidation.predictedHomeScore;
    prediction.predictedAwayScore = scoreValidation.predictedAwayScore;
    if (!isAdmin || prediction.userId === req.user.id) {
      prediction.submittedAt = new Date();
    }

    await prediction.save();

    if (prediction.match?.status === 'finished') {
      const scoringRules = await getScoringRules();
      prediction.points = calculatePoints(prediction, prediction.match, scoringRules);
      await prediction.save();
      await saveLeaderboardSnapshot();
    }

    res.json(prediction);
  } catch (error) {
    sendError(res, req, 500, 'errors.predictionUpdateFailed');
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const prediction = await Prediction.findByPk(req.params.id, {
      include: [{ model: Match, as: 'match' }],
    });

    if (!prediction) {
      return sendError(res, req, 404, 'errors.predictionNotFound');
    }

    const isOwner = prediction.userId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return sendError(res, req, 403, 'errors.accessDenied');
    }

    if (prediction.match && !canEditPrediction(prediction.match, { allowAdminOverride: isAdmin, isAdmin })) {
      return sendError(res, req, 403, 'errors.predictionEditClosed');
    }

    await prediction.destroy();
    res.json({ message: translate(req, 'messages.predictionDeleted') });
  } catch (error) {
    sendError(res, req, 500, 'errors.predictionDeleteFailed');
  }
});

module.exports = router;
