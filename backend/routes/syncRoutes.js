const express = require('express');
const { sendError, translate } = require('../utils/apiResponse');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { syncFixtures } = require('../services/fixtureSyncService');
const { enrichMatchVenuesFromTheSportsDb, enrichCitiesFromWm2026Lookup } = require('../services/theSportsDbVenueService');
const { syncOfficialWm2026Schedule } = require('../services/wm2026OfficialSyncService');
const { testTheSportsDbConnection } = require('../services/playerImageProviderService');
const {
  syncPlayerImages,
  isStaleRunningLog,
  parseLogDetails,
} = require('../services/playerImageSyncService');
const { syncResults } = require('../services/resultSyncService');
const { syncLiveScores } = require('../services/liveScoreSyncService');
const { recalculateAllPoints } = require('../services/leaderboardService');
const footballProviderService = require('../services/footballProviderService');
const {
  getSyncLogs,
  getSyncStatusSummary,
  getSyncErrors,
  getLastSync,
  startSyncLog,
  failSyncLog,
} = require('../services/syncLogService');
const { getSetting } = require('../services/settingsService');

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

function handleSyncError(error, res, req) {
  const status = error.code === 'NO_API_KEY' ? 503 : 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const { translate } = require('../utils/apiResponse');
  res.status(status).json({
    error: isProduction
      ? translate(req, 'errors.syncFailed')
      : (error.message || translate(req, 'errors.syncFailed')),
    code: error.code,
  });
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
    handleSyncError(error, res, req);
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
    handleSyncError(error, res, req);
  }
});

router.post('/official-schedule', async (req, res) => {
  try {
    const result = await syncOfficialWm2026Schedule({ userId: req.user.id, req });
    res.json(result);
  } catch (error) {
    handleSyncError(error, res, req);
  }
});

router.post('/results', async (req, res) => {
  try {
    const result = await syncResults({ userId: req.user.id, req });
    res.json(result);
  } catch (error) {
    handleSyncError(error, res, req);
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
    handleSyncError(error, res, req);
  }
});

router.post('/enrich-venues', async (req, res) => {
  try {
    const theSportsDbResult = await enrichMatchVenuesFromTheSportsDb();
    res.json(theSportsDbResult);
  } catch (error) {
    handleSyncError(error, res, req);
  }
});

router.post('/enrich-venue-cities', async (req, res) => {
  try {
    const result = await enrichCitiesFromWm2026Lookup();
    res.json(result);
  } catch (error) {
    handleSyncError(error, res, req);
  }
});

router.post('/test-thesportsdb', async (req, res) => {
  try {
    const result = await testTheSportsDbConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/player-images', async (req, res) => {
  try {
    let resumeFromIndex = 0;
    const running = await getLastSync('player_images');
    if (running?.status === 'running') {
      if (!isStaleRunningLog(running)) {
        const resolved = (running.createdCount || 0) + (running.updatedCount || 0);
        return res.json({
          started: false,
          running: true,
          logId: running.id,
          message: `Spielerbild-Sync läuft bereits (${resolved} Bilder, ${running.skippedCount || 0} übersprungen)…`,
        });
      }
      resumeFromIndex = parseLogDetails(running).processedCount || 0;
      await failSyncLog(running, new Error('Vorheriger Sync nach Timeout abgebrochen.'));
    }

    const forceRefresh = req.body?.forceRefresh === true;
    const log = await startSyncLog('player_images', 'thesportsdb+wikidata');

    const resumeHint = resumeFromIndex > 0
      ? ` Fortsetzung ab Spieler ${resumeFromIndex + 1}.`
      : '';

    res.json({
      started: true,
      running: true,
      logId: log.id,
      resumeFromIndex,
      message: `Spielerbild-Sync im Hintergrund gestartet (~20 Min. für alle Kader).${resumeHint} Fortschritt in den Sync-Logs.`,
    });

    syncPlayerImages({
      userId: req.user.id,
      req,
      forceRefresh,
      log,
      resumeFromIndex,
    }).catch((error) => {
      console.error('Background player image sync failed:', error);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
