const { Match, Prediction, User } = require('../models');
const footballProviderService = require('./footballProviderService');
const { calculatePoints } = require('./pointsCalculationService');
const { getScoringRules, saveLeaderboardSnapshot, getLeaderboard } = require('./leaderboardService');
const { getSetting } = require('./settingsService');
const { logAudit } = require('./auditService');
const socketService = require('./socketService');
const notificationService = require('./notificationService');
const { startSyncLog, finishSyncLog, failSyncLog, emptySummary } = require('./syncLogService');
const { canUpdateMatch, buildResultUpdateData, isResultRelevant } = require('./matchSyncUtils');
const { shouldSkipSyncDueToRateLimit, markLiveSyncCompleted } = require('./footballDataRateLimitService');

async function recalculateMatchPoints(match) {
  const scoringRules = await getScoringRules();
  const predictions = await Prediction.findAll({ where: { matchId: match.id } });

  for (const prediction of predictions) {
    const points = calculatePoints(prediction, match, scoringRules);
    await prediction.update({ points });
  }
}

async function notifyAffectedUsers(matchIds) {
  const predictions = await Prediction.findAll({
    where: { matchId: matchIds },
    include: [{ model: User, as: 'user' }],
  });

  const notifiedUsers = new Set();
  for (const pred of predictions) {
    if (notifiedUsers.has(pred.userId)) continue;
    notifiedUsers.add(pred.userId);
    await notificationService.createNotification({
      userId: pred.userId,
      title: 'Ergebnis aktualisiert',
      message: 'Ein Spielergebnis wurde aktualisiert. Ihre Punkte wurden neu berechnet.',
      type: 'info',
      link: '/my-predictions',
    });
  }
}

async function applyResultUpdates({ syncType = 'results', userId = null, req = null, liveOnly = false } = {}) {
  const config = await footballProviderService.getProviderConfig();

  const resultSyncEnabled = await getSetting('resultSyncEnabled', config.resultSyncEnabled);
  if (!resultSyncEnabled) {
    return { skipped: true, message: 'Ergebnis-Synchronisierung ist deaktiviert.' };
  }

  footballProviderService.assertApiConfigured(config);

  const rateCheck = shouldSkipSyncDueToRateLimit(syncType);
  if (rateCheck.skip) {
    return {
      skipped: true,
      message: `${syncType === 'live_scores' ? 'Live-Score' : 'Ergebnis'}-Sync wegen Rate-Limit/Intervall pausiert.`,
      rateLimitReason: rateCheck.reason,
    };
  }

  const log = await startSyncLog(syncType, config.provider);
  const summary = { ...emptySummary(), updatedMatches: [] };

  try {
    const fetchType = liveOnly ? 'live_scores' : 'results';
    const { fixtures, rateLimits, rateLimitsHistory } = await footballProviderService.fetchForSync(config, fetchType);
    summary.rateLimits = rateLimits;
    summary.rateLimitsHistory = rateLimitsHistory;

    for (const fixture of fixtures) {
      try {
        if (!fixture.externalApiId) continue;

        if (liveOnly && !isResultRelevant(fixture)) {
          summary.skippedCount++;
          continue;
        }

        if (!liveOnly && fixture.status === 'scheduled') {
          summary.skippedCount++;
          continue;
        }

        const match = await Match.findOne({ where: { externalApiId: fixture.externalApiId } });
        if (!match) {
          summary.skippedCount++;
          continue;
        }

        const check = canUpdateMatch(match, { mode: 'result' });
        if (!check.allowed) {
          summary.skippedCount++;
          continue;
        }

        const prevStatus = match.status;
        const { updateData, changed } = buildResultUpdateData(fixture, match);

        if (!changed) {
          summary.skippedCount++;
          continue;
        }

        await match.update(updateData);
        await match.reload();

        if (match.status === 'finished') {
          await recalculateMatchPoints(match);
        }

        socketService.emitToMatches('match:update', match);
        summary.updatedMatches.push({ id: match.id, matchNumber: match.matchNumber, status: match.status, prevStatus });
        summary.updatedCount++;
      } catch (err) {
        summary.errorCount++;
        summary.errors.push({ externalApiId: fixture.externalApiId, message: err.message });
        await Match.update({ syncError: err.message }, { where: { externalApiId: fixture.externalApiId } }).catch(() => {});
      }
    }

    if (summary.updatedCount > 0) {
      const finishedUpdates = summary.updatedMatches.filter((m) => m.status === 'finished');
      if (finishedUpdates.length > 0) {
        await saveLeaderboardSnapshot();
        const leaderboard = await getLeaderboard();
        socketService.emitToLeaderboard('leaderboard:update', leaderboard);
        await notifyAffectedUsers(finishedUpdates.map((m) => m.id));
      }
    }

    if (liveOnly) {
      markLiveSyncCompleted();
    }

    await finishSyncLog(log, summary, rateLimits);

    if (userId) {
      await logAudit({
        userId,
        action: syncType === 'live_scores' ? 'SYNC_LIVE_SCORES' : 'SYNC_RESULTS',
        entityType: 'SyncLog',
        entityId: log.id,
        newValue: summary,
        req,
      });
    }

    return {
      logId: log.id,
      ...summary,
      message: syncType === 'live_scores'
        ? 'Live-Score-Synchronisierung abgeschlossen.'
        : 'Ergebnis-Synchronisierung abgeschlossen.',
    };
  } catch (error) {
    await failSyncLog(log, error, summary);
    throw error;
  }
}

async function syncResults(options = {}) {
  return applyResultUpdates({ ...options, syncType: 'results', liveOnly: false });
}

module.exports = { syncResults, recalculateMatchPoints, applyResultUpdates };
