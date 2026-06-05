const express = require('express');
const { sendError, translate } = require('../utils/apiResponse');
const { BonusQuestion, BonusPrediction } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { logAudit } = require('../services/auditService');
const { recalculateBonusPoints } = require('../services/leaderboardService');
const { listTeams, listPlayers } = require('../services/footballTeamService');

const router = express.Router();

function parseQuestion(q) {
  const data = q.toJSON();
  if (data.optionsJson) {
    try {
      data.options = JSON.parse(data.optionsJson);
      if (data.questionType === 'favorite_team_progress') {
        const { normalizeProgressOptions } = require('../utils/bonusProgressOptions');
        data.options = normalizeProgressOptions(data.options);
      }
    } catch { data.options = []; }
  }
  if (data.correctAnswerJson) {
    try { data.correctAnswer = JSON.parse(data.correctAnswerJson); } catch { data.correctAnswer = null; }
  }
  return data;
}

async function enrichQuestion(q, user = null) {
  const data = parseQuestion(q);
  if (data.questionType === 'national_team') {
    try {
      data.teamOptions = await listTeams();
    } catch {
      data.teamOptions = [];
    }
  }
  if (data.questionType === 'national_team_player') {
    try {
      data.playerOptions = await listPlayers();
    } catch {
      data.playerOptions = [];
    }
  }
  if (data.questionType === 'favorite_team_progress' && user) {
    data.favoriteTeam = user.favoriteNationalTeamId ? {
      id: user.favoriteNationalTeamId,
      name: user.favoriteNationalTeamName,
    } : null;
    data.requiresFavoriteTeam = true;
  }
  return data;
}

async function mapQuestions(questions, user) {
  const userId = user?.id;
  const userPredictions = userId
    ? await BonusPrediction.findAll({ where: { userId } })
    : [];
  const predMap = new Map(userPredictions.map((p) => [p.bonusQuestionId, p]));

  const baseCanAnswer = (q) => q.status === 'open' && (!q.lockTime || new Date() < new Date(q.lockTime));

  return Promise.all(questions.map(async (q) => {
    const enriched = await enrichQuestion(q, user);
    const hasFavoriteTeam = !!user?.favoriteNationalTeamId;
    const canAnswer = baseCanAnswer(q)
      && (q.questionType !== 'favorite_team_progress' || hasFavoriteTeam);

    return {
      ...enriched,
      userPrediction: predMap.get(q.id) || null,
      canAnswer,
    };
  }));
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const questions = await BonusQuestion.findAll({ order: [['lockTime', 'ASC']] });
    res.json(await mapQuestions(questions, req.user));
  } catch (error) {
    sendError(res, req, 500, 'errors.bonusQuestionsLoadFailed');
  }
});

router.post('/predictions', authMiddleware, async (req, res) => {
  try {
    const { bonusQuestionId, answer } = req.body;
    const question = await BonusQuestion.findByPk(bonusQuestionId);
    if (!question) return sendError(res, req, 404, 'errors.bonusQuestionNotFound');
    if (question.status !== 'open') return sendError(res, req, 403, 'errors.bonusQuestionLocked');
    if (question.lockTime && new Date() >= new Date(question.lockTime)) {
      return sendError(res, req, 403, 'errors.bonusDeadlinePassed');
    }

    const existing = await BonusPrediction.findOne({ where: { userId: req.user.id, bonusQuestionId } });
    if (existing) return sendError(res, req, 409, 'errors.bonusAnswerExists');

    const prediction = await BonusPrediction.create({
      userId: req.user.id,
      bonusQuestionId,
      answerJson: JSON.stringify(answer),
      submittedAt: new Date(),
    });

    await logAudit({ userId: req.user.id, action: 'BONUS_PREDICTION_CREATE', entityType: 'BonusPrediction', entityId: prediction.id, newValue: { answer }, req });
    res.status(201).json(prediction);
  } catch (error) {
    sendError(res, req, 500, 'errors.bonusAnswerSaveFailed');
  }
});

router.put('/predictions/:id', authMiddleware, async (req, res) => {
  try {
    const prediction = await BonusPrediction.findByPk(req.params.id, {
      include: [{ model: BonusQuestion, as: 'bonusQuestion' }],
    });
    if (!prediction) return sendError(res, req, 404, 'errors.bonusAnswerNotFound');
    if (prediction.userId !== req.user.id) return sendError(res, req, 403, 'errors.accessDenied');
    if (prediction.bonusQuestion.status !== 'open') return sendError(res, req, 403, 'errors.bonusQuestionLocked');
    if (prediction.bonusQuestion.lockTime && new Date() >= new Date(prediction.bonusQuestion.lockTime)) {
      return sendError(res, req, 403, 'errors.bonusDeadlinePassed');
    }

    await prediction.update({
      answerJson: JSON.stringify(req.body.answer),
      submittedAt: new Date(),
    });

    await logAudit({ userId: req.user.id, action: 'BONUS_PREDICTION_UPDATE', entityType: 'BonusPrediction', entityId: prediction.id, req });
    res.json(prediction);
  } catch (error) {
    sendError(res, req, 500, 'errors.bonusAnswerUpdateFailed');
  }
});

const adminRouter = express.Router();
adminRouter.use(authMiddleware, adminMiddleware);

adminRouter.get('/', async (req, res) => {
  try {
    const questions = await BonusQuestion.findAll({ order: [['createdAt', 'DESC']] });
    res.json(await Promise.all(questions.map(enrichQuestion)));
  } catch (error) {
    sendError(res, req, 500, 'errors.bonusQuestionsLoadFailed');
  }
});

adminRouter.post('/', async (req, res) => {
  try {
    const { questionText, questionType, options, points, lockTime } = req.body;
    const question = await BonusQuestion.create({
      questionText,
      questionType: questionType || 'single_choice',
      optionsJson: options ? JSON.stringify(options) : null,
      points: points || 10,
      lockTime: lockTime || null,
      status: 'open',
    });
    await logAudit({ userId: req.user.id, action: 'BONUS_QUESTION_CREATE', entityType: 'BonusQuestion', entityId: question.id, req });
    res.status(201).json(parseQuestion(question));
  } catch (error) {
    sendError(res, req, 500, 'errors.bonusQuestionCreateFailed');
  }
});

adminRouter.get('/:id', async (req, res) => {
  try {
    const question = await BonusQuestion.findByPk(req.params.id);
    if (!question) return sendError(res, req, 404, 'errors.notFound');
    res.json(await enrichQuestion(question));
  } catch (error) {
    sendError(res, req, 500, 'errors.loadFailed');
  }
});

adminRouter.put('/:id', async (req, res) => {
  try {
    const question = await BonusQuestion.findByPk(req.params.id);
    if (!question) return sendError(res, req, 404, 'errors.notFound');

    const { questionText, questionType, options, points, lockTime, status } = req.body;
    if (questionText) question.questionText = questionText;
    if (questionType) question.questionType = questionType;
    if (options) question.optionsJson = JSON.stringify(options);
    if (points !== undefined) question.points = points;
    if (lockTime !== undefined) question.lockTime = lockTime;
    if (status) question.status = status;

    await question.save();
    await logAudit({ userId: req.user.id, action: 'BONUS_QUESTION_UPDATE', entityType: 'BonusQuestion', entityId: question.id, req });
    res.json(parseQuestion(question));
  } catch (error) {
    sendError(res, req, 500, 'errors.updateFailed');
  }
});

adminRouter.delete('/:id', async (req, res) => {
  try {
    const question = await BonusQuestion.findByPk(req.params.id);
    if (!question) return sendError(res, req, 404, 'errors.notFound');
    await BonusPrediction.destroy({ where: { bonusQuestionId: question.id } });
    await question.destroy();
    await logAudit({ userId: req.user.id, action: 'BONUS_QUESTION_DELETE', entityType: 'BonusQuestion', entityId: parseInt(req.params.id, 10), req });
    res.json({ message: 'Bonusfrage gelöscht.' });
  } catch (error) {
    sendError(res, req, 500, 'errors.deleteFailed');
  }
});

adminRouter.post('/:id/resolve', async (req, res) => {
  try {
    const question = await BonusQuestion.findByPk(req.params.id);
    if (!question) return sendError(res, req, 404, 'errors.notFound');

    await question.update({
      correctAnswerJson: JSON.stringify(req.body.correctAnswer),
      status: 'resolved',
    });

    const updated = await recalculateBonusPoints();
    await logAudit({ userId: req.user.id, action: 'BONUS_QUESTION_RESOLVE', entityType: 'BonusQuestion', entityId: question.id, newValue: { correctAnswer: req.body.correctAnswer }, req });
    res.json({ message: 'Bonusfrage aufgelöst.', pointsRecalculated: updated, question: parseQuestion(question) });
  } catch (error) {
    sendError(res, req, 500, 'errors.resolveFailed');
  }
});

module.exports = { router, adminRouter };
