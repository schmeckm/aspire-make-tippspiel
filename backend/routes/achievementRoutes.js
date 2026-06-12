const express = require('express');
const { sendError } = require('../utils/apiResponse');
const authMiddleware = require('../middleware/authMiddleware');
const { getUserStreakSummary } = require('../services/streakService');

const router = express.Router();

router.use(authMiddleware);

router.get('/me', async (req, res) => {
  try {
    const summary = await getUserStreakSummary(req.user.id);
    return res.json(summary);
  } catch (error) {
    console.error('Achievements error:', error);
    return sendError(res, req, 500, 'errors.internalServer');
  }
});

module.exports = router;

