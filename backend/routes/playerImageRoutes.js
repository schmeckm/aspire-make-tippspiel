const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { sendError } = require('../utils/apiResponse');
const { resolveImage, batchResolveImages } = require('../services/playerImageService');
const { isEnabled } = require('../services/playerImageProviderService');

const router = express.Router();

router.use(authMiddleware);

router.get('/lookup', async (req, res) => {
  try {
    if (!isEnabled()) {
      return res.json({ imageUrl: null, source: null });
    }

    const { playerName, teamName, countryCode, refresh } = req.query;
    if (!playerName?.trim()) {
      return sendError(res, req, 400, 'errors.playerImageNameRequired');
    }

    const result = await resolveImage({
      playerName,
      teamName,
      countryCode,
      forceRefresh: refresh === 'true' || refresh === '1',
    });

    res.json(result || { imageUrl: null, source: null });
  } catch (error) {
    console.error('Player image lookup error:', error.message);
    sendError(res, req, 500, 'errors.playerImageLookupFailed');
  }
});

router.post('/batch', async (req, res) => {
  try {
    if (!isEnabled()) {
      return res.json({});
    }

    const players = Array.isArray(req.body?.players) ? req.body.players : [];
    if (!players.length) {
      return res.json({});
    }

    const results = await batchResolveImages(players.slice(0, 100));
    res.json(results);
  } catch (error) {
    console.error('Player image batch error:', error.message);
    sendError(res, req, 500, 'errors.playerImageLookupFailed');
  }
});

module.exports = router;
