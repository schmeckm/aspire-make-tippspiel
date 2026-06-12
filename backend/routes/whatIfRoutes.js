const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { sendError } = require('../utils/apiResponse');
const { simulateMatchWhatIf } = require('../services/whatIfService');

const router = express.Router();

router.use(authMiddleware);

router.post('/match/:id', async (req, res) => {
  try {
    const predictedHomeScore = req.body?.predictedHomeScore;
    const predictedAwayScore = req.body?.predictedAwayScore;
    const result = await simulateMatchWhatIf({
      userId: req.user.id,
      matchId: req.params.id,
      predictedHomeScore,
      predictedAwayScore,
    });
    return res.json(result);
  } catch (error) {
    const status = error.status || 500;
    const key = error.errorKey || 'errors.internalServer';
    console.error('What-if error:', error.message || error);
    return sendError(res, req, status, key);
  }
});

module.exports = router;

