const express = require('express');
const { sendError, translate } = require('../utils/apiResponse');
const { Op } = require('sequelize');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { sequelize, User, Match, Prediction, SyncLog } = require('../models');
const { getSyncStatusSummary } = require('../services/syncLogService');
const emailService = require('../services/emailService');
const { getSetting } = require('../services/settingsService');
const footballProviderService = require('../services/footballProviderService');
const socketService = require('../services/socketService');

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get('/', async (req, res) => {
  try {
    let dbStatus = 'ok';
    try {
      await sequelize.authenticate();
    } catch {
      dbStatus = 'error';
    }

    const syncStatus = await getSyncStatusSummary();
    const emailStatus = await emailService.getEmailStatus();
    const apiConfig = await footballProviderService.getProviderConfig();

    const lastError = await SyncLog.findOne({
      where: { status: { [Op.in]: ['failed', 'partial'] } },
      order: [['startedAt', 'DESC']],
    });

    res.json({
      version: '2.5.0',
      database: { status: dbStatus, dialect: process.env.DB_DIALECT || 'sqlite' },
      api: {
        provider: apiConfig.provider,
        providerLabel: apiConfig.providerLabel,
        configured: footballProviderService.isApiConfigured(apiConfig),
        operationMode: footballProviderService.getOperationMode(apiConfig),
        statusMessage: footballProviderService.getStatusMessage(apiConfig),
        syncEnabled: await getSetting('apiSyncEnabled', apiConfig.syncEnabled),
        resultSyncEnabled: await getSetting('resultSyncEnabled', apiConfig.resultSyncEnabled),
        competitionId: apiConfig.competitionId,
        season: apiConfig.season,
        timezone: apiConfig.timezone,
        lastFixtureSync: syncStatus.lastFixtureSync,
        lastResultSync: syncStatus.lastResultSync,
        lastLiveSync: syncStatus.lastLiveSync,
        lastSuccessfulFixture: syncStatus.lastSuccessfulFixture,
        lastSuccessfulResult: syncStatus.lastSuccessfulResult,
        successCount: syncStatus.successCount,
        failedCount: syncStatus.failedCount,
        supportedProviders: syncStatus.supportedProviders,
      },
      email: emailStatus,
      websocket: { active: !!socketService.getIO() },
      liveScores: await getSetting('liveScoresEnabled', true),
      stats: {
        users: await User.count(),
        matches: await Match.count(),
        predictions: await Prediction.count(),
        liveMatches: await Match.count({ where: { status: { [Op.in]: ['live', 'halftime'] } } }),
      },
      lastError,
      uptime: process.uptime(),
    });
  } catch (error) {
    sendError(res, req, 500, 'errors.systemStatusLoadFailed');
  }
});

module.exports = router;
