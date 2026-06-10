const cron = require('node-cron');
const { Match } = require('../models');
const { syncFixtures } = require('./fixtureSyncService');
const { syncResults } = require('./resultSyncService');
const { syncLiveScores } = require('./liveScoreSyncService');
const { sendMissingPredictionReminders, sendBonusQuestionReminders, sendSyncErrorToAdmin, sendUpcomingMatchesSummary, sendLeaderboardUpdates } = require('./reminderService');
const { sendMorningDigests } = require('./morningDigestService');
const { getSetting } = require('./settingsService');
const { isEmailRemindersEnabled, isMorningDigestEnabled } = require('./emailReminderSettingsService');
const { buildReminderCron } = require('../utils/reminderCron');
const footballProviderService = require('./footballProviderService');
const { runWithCronMonitor, captureException } = require('./sentryCronService');

let jobs = [];

const CRON_TZ = process.env.SENTRY_CRON_TIMEZONE || process.env.FOOTBALL_API_TIMEZONE || 'Europe/Zurich';

const CRON_MONITORS = {
  resultSync: {
    slug: 'wm2026-result-sync',
    config: {
      schedule: { type: 'interval', value: 15, unit: 'minute' },
      timezone: CRON_TZ,
      checkinMargin: 5,
      maxRuntime: 12,
    },
  },
  liveScoreSync: {
    slug: 'wm2026-live-score-sync',
    config: {
      schedule: { type: 'interval', value: 5, unit: 'minute' },
      timezone: CRON_TZ,
      checkinMargin: 3,
      maxRuntime: 4,
    },
  },
  leaderboardSnapshot: {
    slug: 'wm2026-leaderboard-snapshot',
    config: {
      schedule: { type: 'interval', value: 1, unit: 'hour' },
      timezone: CRON_TZ,
      checkinMargin: 10,
      maxRuntime: 5,
    },
  },
  kickoffLock: {
    slug: 'wm2026-kickoff-lock',
    config: {
      schedule: { type: 'interval', value: 1, unit: 'minute' },
      timezone: CRON_TZ,
      checkinMargin: 2,
      maxRuntime: 1,
    },
  },
  postgresBackup: {
    slug: 'wm2026-postgres-backup',
    config: {
      schedule: { type: 'crontab', value: '0 3 * * *' },
      timezone: CRON_TZ,
      checkinMargin: 30,
      maxRuntime: 20,
    },
  },
};

function isTournamentActive() {
  const now = new Date();
  const start = new Date(process.env.TOURNAMENT_START || '2026-06-11');
  const end = new Date(process.env.TOURNAMENT_END || '2026-07-20');
  return now >= start && now <= end;
}

async function hasLiveMatches() {
  const { Op } = require('sequelize');
  return Match.count({ where: { status: { [Op.in]: ['live', 'halftime'] } } }) > 0;
}

async function isSyncAllowed() {
  const config = await footballProviderService.getProviderConfig();
  if (!config.syncEnabled) return false;
  if (!footballProviderService.isApiConfigured(config)) return false;
  const apiSyncEnabled = await getSetting('apiSyncEnabled', true);
  return apiSyncEnabled;
}

async function safeRun(fn, label, monitor = null) {
  const execute = async () => {
    try {
      console.log(`[Scheduler] Starte: ${label}`);
      const result = await fn();
      console.log(`[Scheduler] Fertig: ${label}`, result?.message || result?.path || result?.filename || '');
      return result;
    } catch (error) {
      console.error(`[Scheduler] Fehler bei ${label}:`, error.message);
      captureException(error, { schedulerLabel: label, monitorSlug: monitor?.slug });
      try {
        await sendSyncErrorToAdmin(`${label}: ${error.message}`);
      } catch {
        // ignore email errors
      }
    }
    return null;
  };

  if (monitor) {
    return runWithCronMonitor(monitor.slug, execute, monitor.config);
  }
  return execute();
}

async function safeSyncRun(fn, label, monitor = null) {
  if (!(await isSyncAllowed())) return null;
  return safeRun(fn, label, monitor);
}

const REMINDER_TZ = process.env.REMINDER_TIMEZONE || process.env.DEFAULT_TIMEZONE || CRON_TZ;

async function startScheduler() {
  stopScheduler();

  const reminderTime = await getSetting('reminderTime', '09:00');
  const reminderFrequency = await getSetting('reminderFrequency', 'daily');
  const reminderCron = buildReminderCron(reminderTime, reminderFrequency);
  const morningDigestTime = await getSetting('morningDigestTime', '07:30');
  const morningDigestCron = buildReminderCron(morningDigestTime, 'daily');

  // Daily fixture sync at 06:00 (before tournament)
  jobs.push(cron.schedule('0 6 * * *', () => {
    safeSyncRun(() => syncFixtures(), 'Täglicher Spielplan-Sync');
  }));

  // Every 6 hours during tournament
  jobs.push(cron.schedule('0 */6 * * *', async () => {
    if (isTournamentActive()) {
      await safeSyncRun(() => syncFixtures(), 'Spielplan-Sync (Turnier)');
    }
  }));

  // Every 15 minutes on active match days
  jobs.push(cron.schedule('*/15 * * * *', async () => {
    if (isTournamentActive()) {
      await safeSyncRun(() => syncResults(), 'Ergebnis-Sync (15min)', CRON_MONITORS.resultSync);
    }
  }));

  // Every 5 minutes while matches are live (football-data.org rate limit friendly)
  jobs.push(cron.schedule('*/5 * * * *', async () => {
    if (await hasLiveMatches()) {
      await safeSyncRun(() => syncLiveScores(), 'Live-Score-Sync (5min)', CRON_MONITORS.liveScoreSync);
    }
  }));

  // Tip + bonus reminder emails (time/frequency from admin settings)
  jobs.push(cron.schedule(reminderCron, async () => {
    if (await isEmailRemindersEnabled()) {
      await safeRun(() => sendMissingPredictionReminders(), 'Fehlende-Tipp-Erinnerungen');
      await safeRun(() => sendBonusQuestionReminders(), 'Bonusfrage-Erinnerungen');
    }
  }, { timezone: REMINDER_TZ }));

  // Daily morning digest (time from admin settings)
  jobs.push(cron.schedule(morningDigestCron, async () => {
    if (await isMorningDigestEnabled()) {
      await safeRun(() => sendMorningDigests(), 'Morning-Digest');
    }
  }, { timezone: REMINDER_TZ }));

  // Weekly upcoming matches summary (Monday 08:00)
  jobs.push(cron.schedule('0 8 * * 1', async () => {
    if ((await isEmailRemindersEnabled()) && isTournamentActive()) {
      await safeRun(() => sendUpcomingMatchesSummary(), 'Spielübersicht-E-Mail');
    }
  }));

  // Weekly leaderboard updates (Sunday 18:00)
  jobs.push(cron.schedule('0 18 * * 0', async () => {
    if ((await isEmailRemindersEnabled()) && isTournamentActive()) {
      await safeRun(() => sendLeaderboardUpdates(), 'Hitlisten-Update-E-Mail');
    }
  }));

  // Leaderboard snapshot every hour during tournament
  const { saveLeaderboardSnapshot } = require('./leaderboardService');
  jobs.push(cron.schedule('0 * * * *', async () => {
    if (isTournamentActive()) {
      await safeRun(
        () => saveLeaderboardSnapshot(),
        'Hitliste-Snapshot',
        CRON_MONITORS.leaderboardSnapshot,
      );
    }
  }));

  // Lock matches at kickoff – every 15s during tournament, otherwise every minute
  const { lockPastKickoffMatches } = require('./matchLockSchedulerService');
  jobs.push(cron.schedule('*/15 * * * * *', async () => {
    if (isTournamentActive()) {
      await safeRun(
        () => lockPastKickoffMatches(),
        'Kickoff-Sperre (15s)',
        CRON_MONITORS.kickoffLock,
      );
    }
  }));
  jobs.push(cron.schedule('* * * * *', async () => {
    if (!isTournamentActive()) {
      await safeRun(() => lockPastKickoffMatches(), 'Kickoff-Sperre');
    }
  }));

  // Daily database backup at 03:00
  const { createPostgresBackup, isPostgresConfigured } = require('./postgresBackupService');
  const { backupDatabase } = require('../database/backup');
  const { createUploadsBackup } = require('./uploadsBackupService');
  jobs.push(cron.schedule('0 3 * * *', async () => {
    if (isPostgresConfigured()) {
      await safeRun(
        () => createPostgresBackup(),
        'Postgres-Backup (täglich)',
        CRON_MONITORS.postgresBackup,
      );
    } else {
      await safeRun(async () => backupDatabase('scheduled'), 'SQLite-Backup (täglich)');
    }
  }));

  // Weekly postgres backup (Sunday 02:00) – additional full dump
  jobs.push(cron.schedule('0 2 * * 0', async () => {
    if (isPostgresConfigured()) {
      await safeRun(() => createPostgresBackup(), 'Postgres-Backup (wöchentlich)');
    }
  }));

  // Daily uploads backup at 03:30
  jobs.push(cron.schedule('30 3 * * *', async () => {
    await safeRun(() => createUploadsBackup(), 'Uploads-Backup');
  }));

  // Hourly player data backup (users, teams, predictions)
  const { runScheduledPlayerBackup, isPlayerBackupEnabled } = require('./backupService');
  const playerBackupCron = process.env.PLAYER_DATA_BACKUP_CRON || '0 * * * *';
  if (isPlayerBackupEnabled()) {
    jobs.push(cron.schedule(playerBackupCron, async () => {
      await safeRun(() => runScheduledPlayerBackup(), 'Spielerdaten-Backup (stündlich)');
    }, { timezone: CRON_TZ }));
  }

  // Cleanup expired revoked tokens daily at 04:00
  const { cleanupExpiredTokens } = require('./tokenBlacklistService');
  jobs.push(cron.schedule('0 4 * * *', async () => {
    await safeRun(() => cleanupExpiredTokens(), 'Token-Blacklist-Bereinigung');
  }));

  console.log(`[Scheduler] ${jobs.length} Cron-Jobs gestartet (Erinnerungen: ${reminderCron}, Digest: ${morningDigestCron}, TZ ${REMINDER_TZ}).`);
}

async function restartScheduler() {
  await startScheduler();
}

function stopScheduler() {
  for (const job of jobs) job.stop();
  jobs = [];
}

module.exports = { startScheduler, stopScheduler, restartScheduler, isTournamentActive };
