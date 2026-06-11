const footballTeamService = require('./footballTeamService');
const { logAudit } = require('./auditService');
const {
  startSyncLog,
  finishSyncLog,
  failSyncLog,
  updateSyncProgress,
  emptySummary,
  getLastSync,
} = require('./syncLogService');
const {
  findRecord,
  resolveImage,
} = require('./playerImageService');
const { isEnabled } = require('./playerImageProviderService');
const { getCacheTtlMs, isExternalProviderPaused } = require('./playerImageProviderService');
const { getSetting, setSetting } = require('./settingsService');

const PROGRESS_UPDATE_EVERY = 1;
const STALE_IDLE_MS = parseInt(process.env.PLAYER_IMAGE_STALE_IDLE_MS || String(10 * 60 * 1000), 10);
const STALE_RUNNING_MS = parseInt(process.env.PLAYER_IMAGE_STALE_MAX_MS || String(30 * 60 * 1000), 10);
const PLAYER_RESOLVE_TIMEOUT_MS = parseInt(process.env.PLAYER_IMAGE_RESOLVE_TIMEOUT_MS || '120000', 10);
const WAVE_DEFAULT_BATCH_SIZE = parseInt(process.env.PLAYER_IMAGE_WAVE_BATCH_SIZE || '30', 10);
const WAVE_DEFAULT_TIME_BUDGET_MS = parseInt(process.env.PLAYER_IMAGE_WAVE_TIME_BUDGET_MS || String(60 * 1000), 10);
const WAVE_CURSOR_SETTING_KEY = process.env.PLAYER_IMAGE_WAVE_CURSOR_SETTING_KEY || 'playerImageWaveCursor';

function parseLogDetails(log) {
  if (!log?.detailsJson) return {};
  try {
    return typeof log.detailsJson === 'string'
      ? JSON.parse(log.detailsJson)
      : (log.detailsJson || {});
  } catch {
    return {};
  }
}

function touchProgress(summary) {
  summary.lastProgressAt = new Date().toISOString();
  return summary;
}

async function resolveImageWithTimeout(params) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('Spielerbild-Lookup nach Timeout übersprungen.')),
      PLAYER_RESOLVE_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([resolveImage(params), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function syncPlayerImages({
  userId = null,
  req = null,
  forceRefresh = false,
  log: existingLog = null,
  resumeFromIndex = 0,
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
  const startIndex = Math.max(0, Number(resumeFromIndex) || 0);
  summary.resumeFromIndex = startIndex;

  try {
    const players = await footballTeamService.getAllSquadPlayers();
    summary.totalPlayers = players.length;
    summary.processedCount = startIndex;
    if (startIndex > 0) {
      summary.resumed = true;
    }
    touchProgress(summary);
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

    let processed = startIndex;
    for (let index = startIndex; index < players.length; index += 1) {
      const player = players[index];
      try {
        const existing = await findRecord(player.playerName, player.teamName);
        const hadImage = !!existing?.imageUrl;

        const result = await resolveImageWithTimeout({
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

      processed = index + 1;
      summary.processedCount = processed;
      touchProgress(summary);
      if (processed % PROGRESS_UPDATE_EVERY === 0) {
        await updateSyncProgress(log, summary);
      }
    }

    summary.processedCount = processed;
    touchProgress(summary);
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

function isRecordFresh(record) {
  if (!record?.lastCheckedAt) return false;
  const ageMs = Date.now() - new Date(record.lastCheckedAt).getTime();
  return ageMs >= 0 && ageMs < getCacheTtlMs();
}

async function syncPlayerImagesWave({
  userId = null,
  req = null,
  batchSize = WAVE_DEFAULT_BATCH_SIZE,
  timeBudgetMs = WAVE_DEFAULT_TIME_BUDGET_MS,
  forceRefresh = false,
} = {}) {
  if (!isEnabled()) {
    return { skipped: true, message: 'Spielerbilder sind deaktiviert (PLAYER_IMAGE_ENABLED=false).' };
  }

  const running = await getLastSync('player_images');
  if (running?.status === 'running' && !isStaleRunningLog(running)) {
    return { skipped: true, running: true, logId: running.id, message: 'Spielerbild-Sync läuft bereits.' };
  }

  if (!footballTeamService.isFootballApiAvailable()) {
    return {
      skipped: true,
      message: 'football-data.org API nicht konfiguriert – WM-Kader können nicht geladen werden.',
    };
  }

  if (isExternalProviderPaused()) {
    return { skipped: true, message: 'Externe Player-Image-Provider sind im Cooldown; Wave-Sync pausiert.' };
  }

  const size = Math.max(1, Math.min(200, Number(batchSize) || WAVE_DEFAULT_BATCH_SIZE));
  const startedAt = Date.now();

  const log = await startSyncLog('player_images', 'thesportsdb+wikidata');
  const summary = emptySummary();
  summary.wave = true;
  summary.batchSize = size;
  summary.timeBudgetMs = timeBudgetMs;

  try {
    const players = await footballTeamService.getAllSquadPlayers();
    summary.totalPlayers = players.length;
    if (!players.length) {
      await finishSyncLog(log, summary);
      return { logId: log.id, ...summary, message: 'Keine Spieler in den WM-Kadern gefunden.' };
    }

    let cursor = parseInt(await getSetting(WAVE_CURSOR_SETTING_KEY, 0), 10);
    if (!Number.isFinite(cursor) || cursor < 0) cursor = 0;
    cursor = cursor % players.length;
    summary.cursorStart = cursor;
    await updateSyncProgress(log, summary);

    let processed = 0;
    for (let i = 0; i < players.length && processed < size; i += 1) {
      if (Date.now() - startedAt >= timeBudgetMs) break;
      if (isExternalProviderPaused()) break;

      const index = (cursor + i) % players.length;
      const player = players[index];

      try {
        const existing = await findRecord(player.playerName, player.teamName);
        const hadImage = !!existing?.imageUrl;

        if (!forceRefresh) {
          if (existing?.isManuallyApproved && existing.imageUrl) {
            summary.skippedCount += 1;
            processed += 1;
            continue;
          }
          if (existing?.imageUrl && isRecordFresh(existing)) {
            summary.skippedCount += 1;
            processed += 1;
            continue;
          }
          if (!existing?.imageUrl && isRecordFresh(existing)) {
            // Negative cache: don't re-query providers too often for players with no image.
            summary.skippedCount += 1;
            processed += 1;
            continue;
          }
        }

        const result = await resolveImageWithTimeout({
          playerName: player.playerName,
          teamName: player.teamName,
          countryCode: player.countryCode,
          forceRefresh,
        });

        if (!result?.imageUrl) {
          summary.skippedCount += 1;
        } else {
          summary.loadedCount = (summary.loadedCount || 0) + 1;
          if (!hadImage) {
            summary.createdCount += 1;
          } else if (existing?.imageUrl && existing.imageUrl !== result.imageUrl) {
            summary.updatedCount += 1;
          }
        }
      } catch (err) {
        summary.errorCount += 1;
        summary.errors = summary.errors || [];
        summary.errors.push({
          player: player.playerName,
          team: player.teamName,
          message: err.message,
        });
      }

      processed += 1;
      summary.processedCount = processed;
      touchProgress(summary);
      await updateSyncProgress(log, summary);
    }

    const nextCursor = (summary.cursorStart + processed) % players.length;
    summary.cursorEnd = nextCursor;
    await setSetting(WAVE_CURSOR_SETTING_KEY, nextCursor);

    await finishSyncLog(log, summary);

    if (userId) {
      await logAudit({
        userId,
        action: 'SYNC_PLAYER_IMAGES_WAVE',
        entityType: 'SyncLog',
        entityId: log.id,
        newValue: summary,
        req,
      });
    }

    return {
      logId: log.id,
      ...summary,
      message: `Spielerbilder Wave-Sync: ${processed}/${players.length} geprüft; ${summary.loadedCount || 0} mit Bild (${summary.createdCount} neu, ${summary.updatedCount} aktualisiert), ${summary.skippedCount} übersprungen, ${summary.errorCount} Fehler.`,
    };
  } catch (error) {
    await failSyncLog(log, error, summary);
    throw error;
  }
}

function isStaleRunningLog(log) {
  if (!log || log.status !== 'running') return false;
  const details = parseLogDetails(log);
  if (details.lastProgressAt) {
    const idleMs = Date.now() - new Date(details.lastProgressAt).getTime();
    return idleMs >= STALE_IDLE_MS;
  }
  const age = Date.now() - new Date(log.startedAt).getTime();
  return age >= STALE_RUNNING_MS;
}

module.exports = {
  syncPlayerImages,
  syncPlayerImagesWave,
  isStaleRunningLog,
  parseLogDetails,
  STALE_IDLE_MS,
  STALE_RUNNING_MS,
  PLAYER_RESOLVE_TIMEOUT_MS,
};
