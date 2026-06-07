const { SyncLog } = require('../models');

function computeStatus(summary) {
  if (summary.errorCount > 0) {
    const hasChanges = (summary.createdCount || 0) + (summary.updatedCount || 0) > 0;
    return hasChanges ? 'partial' : 'failed';
  }
  return 'success';
}

function emptySummary() {
  return { createdCount: 0, updatedCount: 0, skippedCount: 0, errorCount: 0, errors: [] };
}

async function startSyncLog(syncType, provider) {
  return SyncLog.create({
    syncType,
    status: 'running',
    provider,
    startedAt: new Date(),
  });
}

async function finishSyncLog(log, summary, rateLimitJson = null) {
  const rateLimitPayload = rateLimitJson || summary.rateLimits || null;
  await log.update({
    status: computeStatus(summary),
    finishedAt: new Date(),
    createdCount: summary.createdCount || 0,
    updatedCount: summary.updatedCount || 0,
    skippedCount: summary.skippedCount || 0,
    errorCount: summary.errorCount || 0,
    errorMessage: summary.errors?.length
      ? summary.errors.slice(0, 5).map((e) => e.message || e).join('; ')
      : null,
    detailsJson: JSON.stringify(summary),
    rateLimitJson: rateLimitPayload ? JSON.stringify(rateLimitPayload) : null,
  });
  return log;
}

async function updateSyncProgress(log, summary) {
  if (!log) return log;
  await log.update({
    createdCount: summary.createdCount || 0,
    updatedCount: summary.updatedCount || 0,
    skippedCount: summary.skippedCount || 0,
    errorCount: summary.errorCount || 0,
    detailsJson: JSON.stringify(summary),
  });
  return log;
}

async function failSyncLog(log, error, summary = null) {
  const base = summary || emptySummary();
  base.errorCount = (base.errorCount || 0) + 1;
  base.errors = base.errors || [];
  base.errors.push({ message: error.message });

  await log.update({
    status: 'failed',
    finishedAt: new Date(),
    errorCount: base.errorCount,
    errorMessage: error.message,
    detailsJson: JSON.stringify(base),
  });
  return log;
}

async function failStaleRunningPlayerImageLogs() {
  const { isStaleRunningLog } = require('./playerImageSyncService');
  const runningLogs = await SyncLog.findAll({
    where: { syncType: 'player_images', status: 'running' },
  });

  for (const log of runningLogs) {
    if (isStaleRunningLog(log)) {
      await failSyncLog(log, new Error('Sync nach Timeout abgebrochen (Server-Neustart oder Hänger).'));
    }
  }
}

async function getSyncLogs({ limit = 20, syncType = null, status = null } = {}) {
  const { Op } = require('sequelize');
  await failStaleRunningPlayerImageLogs();
  const where = {};
  if (syncType) where.syncType = syncType;
  if (status) where.status = status;
  return SyncLog.findAll({ where, order: [['startedAt', 'DESC']], limit });
}

async function getLastSuccessfulSync(syncType) {
  return SyncLog.findOne({
    where: { syncType, status: 'success' },
    order: [['finishedAt', 'DESC']],
  });
}

async function getLastSync(syncType) {
  const { Op } = require('sequelize');
  const where = Array.isArray(syncType)
    ? { syncType: { [Op.in]: syncType } }
    : { syncType };
  return SyncLog.findOne({ where, order: [['startedAt', 'DESC']] });
}

async function getSyncErrors({ limit = 20 } = {}) {
  const { Op } = require('sequelize');
  return SyncLog.findAll({
    where: { status: { [Op.in]: ['failed', 'partial'] } },
    order: [['startedAt', 'DESC']],
    limit,
  });
}

async function getSyncStatusSummary() {
  const { Op } = require('sequelize');
  const footballProviderService = require('./footballProviderService');
  const { getRateLimitState } = require('./footballDataRateLimitService');
  const config = await footballProviderService.getProviderConfig();

  const [lastFixtureSync, lastResultSync, lastLiveSync, lastSuccessfulFixture, lastSuccessfulResult, successCount, failedCount, recentErrors] = await Promise.all([
    getLastSync('fixtures'),
    getLastSync(['results', 'live_scores']),
    getLastSync('live_scores'),
    getLastSuccessfulSync('fixtures'),
    getLastSuccessfulSync('results'),
    SyncLog.count({ where: { status: 'success' } }),
    SyncLog.count({ where: { status: { [Op.in]: ['failed', 'partial'] } } }),
    getSyncErrors({ limit: 5 }),
  ]);

  return {
    apiConfigured: footballProviderService.isApiConfigured(config),
    operationMode: footballProviderService.getOperationMode(config),
    statusMessage: footballProviderService.getStatusMessage(config),
    provider: config.provider,
    providerLabel: config.providerLabel,
    supportedProviders: footballProviderService.getSupportedProviders(),
    syncEnabled: config.syncEnabled,
    resultSyncEnabled: config.resultSyncEnabled,
    competitionId: config.competitionCode,
    competitionNumericId: config.competitionNumericId,
    season: config.season,
    timezone: config.timezone,
    lastFixtureSync,
    lastResultSync,
    lastLiveSync,
    lastSuccessfulFixture,
    lastSuccessfulResult,
    successCount,
    failedCount,
    recentErrors,
    rateLimitState: getRateLimitState(),
  };
}

module.exports = {
  emptySummary,
  startSyncLog,
  finishSyncLog,
  updateSyncProgress,
  failSyncLog,
  failStaleRunningPlayerImageLogs,
  getSyncLogs,
  getLastSuccessfulSync,
  getLastSync,
  getSyncErrors,
  getSyncStatusSummary,
  computeStatus,
};
