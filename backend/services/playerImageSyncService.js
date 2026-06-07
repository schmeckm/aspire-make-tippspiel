const footballTeamService = require('./footballTeamService');
const { logAudit } = require('./auditService');
const {
  startSyncLog,
  finishSyncLog,
  failSyncLog,
  updateSyncProgress,
  emptySummary,
} = require('./syncLogService');
const {
  findRecord,
  resolveImage,
} = require('./playerImageService');
const { isEnabled } = require('./playerImageProviderService');

const PROGRESS_UPDATE_EVERY = 5;
const STALE_RUNNING_MS = 30 * 60 * 1000;

async function syncPlayerImages({
  userId = null,
  req = null,
  forceRefresh = false,
  log: existingLog = null,
} = {}) {
  if (!isEnabled()) {
    return { skipped: true, message: 'Spielerbilder sind deaktiviert (PLAYER_IMAGE_ENABLED=false).' };
  }

  if (!footballTeamService.isFootballApiAvailable()) {
    return {
      skipped: true,
      message: 'football-data.org API nicht konfiguriert – WM-Kader können nicht geladen werden.',
    };
  }

  const log = existingLog || await startSyncLog('player_images', 'thesportsdb+wikidata');
  const summary = emptySummary();

  try {
    const players = await footballTeamService.getAllSquadPlayers();
    summary.totalPlayers = players.length;
    summary.processedCount = 0;
    await updateSyncProgress(log, summary);

    if (!players.length) {
      summary.skippedCount = 0;
      await finishSyncLog(log, summary);
      return {
        logId: log.id,
        ...summary,
        message: 'Keine Spieler in den WM-Kadern gefunden.',
      };
    }

    let processed = 0;
    for (const player of players) {
      try {
        const existing = await findRecord(player.playerName, player.teamName);
        const hadImage = !!existing?.imageUrl;

        const result = await resolveImage({
          playerName: player.playerName,
          teamName: player.teamName,
          countryCode: player.countryCode,
          forceRefresh,
        });

        if (!result?.imageUrl) {
          summary.skippedCount++;
        } else {
          summary.loadedCount = (summary.loadedCount || 0) + 1;
          if (!hadImage) {
            summary.createdCount++;
          } else if (existing.imageUrl !== result.imageUrl) {
            summary.updatedCount++;
          }
        }
      } catch (err) {
        summary.errorCount++;
        summary.errors = summary.errors || [];
        summary.errors.push({
          player: player.playerName,
          team: player.teamName,
          message: err.message,
        });
      }

      processed++;
      if (processed % PROGRESS_UPDATE_EVERY === 0) {
        summary.processedCount = processed;
        await updateSyncProgress(log, summary);
      }
    }

    summary.processedCount = processed;
    await updateSyncProgress(log, summary);
    await finishSyncLog(log, summary);

    if (userId) {
      await logAudit({
        userId,
        action: 'SYNC_PLAYER_IMAGES',
        entityType: 'SyncLog',
        entityId: log.id,
        newValue: summary,
        req,
      });
    }

    return {
      logId: log.id,
      ...summary,
      message: `Spielerbilder synchronisiert: ${summary.loadedCount || 0} mit Bild (${summary.createdCount} neu, ${summary.updatedCount} aktualisiert), ${summary.skippedCount} ohne Bild, ${summary.errorCount} Fehler.`,
    };
  } catch (error) {
    await failSyncLog(log, error, summary);
    throw error;
  }
}

function isStaleRunningLog(log) {
  if (!log || log.status !== 'running') return false;
  const age = Date.now() - new Date(log.startedAt).getTime();
  return age >= STALE_RUNNING_MS;
}

module.exports = {
  syncPlayerImages,
  isStaleRunningLog,
  STALE_RUNNING_MS,
};
