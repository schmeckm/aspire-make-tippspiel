const express = require('express');
const { sendError, translate } = require('../utils/apiResponse');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { syncFixtures } = require('../services/fixtureSyncService');
const { syncResults } = require('../services/resultSyncService');
const { syncLiveScores } = require('../services/liveScoreSyncService');
const { recalculateAllPoints } = require('../services/leaderboardService');
const footballProviderService = require('../services/footballProviderService');
const { getSyncLogs, getSyncStatusSummary, getSyncErrors } = require('../services/syncLogService');
const { getSetting } = require('../services/settingsService');

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

function handleSyncError(error, res) {
  const status = error.code === 'NO_API_KEY' ? 503 : 500;
  res.status(status).json({ error: error.message, code: error.code });
}

router.get('/status', async (req, res) => {
  try {
    const status = await getSyncStatusSummary();
    res.json(status);
  } catch (error) {
    sendError(res, req, 500, 'errors.syncStatusLoadFailed');
  }
});

router.get('/providers', (req, res) => {
  res.json({ providers: footballProviderService.getSupportedProviders() });
});

router.get('/logs', async (req, res) => {
  try {
    const logs = await getSyncLogs({
      limit: parseInt(req.query.limit || '50', 10),
      syncType: req.query.syncType || null,
      status: req.query.status || null,
    });
    res.json(logs);
  } catch (error) {
    sendError(res, req, 500, 'errors.syncLogsLoadFailed');
  }
});

router.get('/errors', async (req, res) => {
  try {
    const errors = await getSyncErrors({ limit: parseInt(req.query.limit || '20', 10) });
    res.json(errors);
  } catch (error) {
    sendError(res, req, 500, 'errors.syncErrorsLoadFailed');
  }
});

router.post('/test-connection', async (req, res) => {
  try {
    const result = await footballProviderService.testConnection();
    res.json(result);
  } catch (error) {
    handleSyncError(error, res);
  }
});

router.put('/provider', async (req, res) => {
  const config = await footballProviderService.getProviderConfig();
  res.json({
    message: 'football-data.org v4 ist der feste Primary-Provider.',
    config,
  });
});

router.post('/fixtures', async (req, res) => {
  try {
    const result = await syncFixtures({ userId: req.user.id, req });
    res.json(result);
  } catch (error) {
    handleSyncError(error, res);
  }
});

router.post('/results', async (req, res) => {
  try {
    const result = await syncResults({ userId: req.user.id, req });
    res.json(result);
  } catch (error) {
    handleSyncError(error, res);
  }
});

router.post('/live-scores', async (req, res) => {
  try {
    const liveEnabled = await getSetting('liveScoresEnabled', true);
    if (!liveEnabled) {
      return res.json({ skipped: true, message: 'Live-Score-Sync ist deaktiviert.' });
    }
    const result = await syncLiveScores({ userId: req.user.id, req });
    res.json(result);
  } catch (error) {
    handleSyncError(error, res);
  }
});

router.post('/recalculate-points', async (req, res) => {
  try {
    const result = await recalculateAllPoints();
    res.json({ message: 'Punkte neu berechnet.', ...result });
  } catch (error) {
    sendError(res, req, 500, 'errors.recalculateFailed');
  }
});

module.exports = router;
