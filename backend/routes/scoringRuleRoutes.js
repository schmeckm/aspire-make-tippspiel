const express = require('express');
const { sendError, translate } = require('../utils/apiResponse');
const { ScoringRule } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    let rules = await ScoringRule.findOne();
    if (!rules) {
      rules = await ScoringRule.create({
        exactResultPoints: 5,
        goalDifferencePoints: 3,
        tendencyPoints: 2,
        wrongPredictionPoints: 0,
      });
    }
    res.json(rules);
  } catch (error) {
    sendError(res, req, 500, 'errors.scoringRulesLoadFailed');
  }
});

router.put('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    let rules = await ScoringRule.findOne();
    if (!rules) {
      rules = await ScoringRule.create(req.body);
    } else {
      const fields = ['exactResultPoints', 'goalDifferencePoints', 'tendencyPoints', 'wrongPredictionPoints'];
      fields.forEach((field) => {
        if (req.body[field] !== undefined) {
          rules[field] = parseInt(req.body[field], 10);
        }
      });
      await rules.save();
    }
    res.json(rules);
  } catch (error) {
    sendError(res, req, 500, 'errors.scoringRulesUpdateFailed');
  }
});

module.exports = router;
