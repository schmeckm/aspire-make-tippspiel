const cron = require('node-cron');
const { Match } = require('../models');
const { syncFixtures } = require('./fixtureSyncService');
const { syncResults } = require('./resultSyncService');
const { syncLiveScores } = require('./liveScoreSyncService');
const { sendMissingPredictionReminders, sendBonusQuestionReminders, sendSyncErrorToAdmin, sendUpcomingMatchesSummary, sendLeaderboardUpdates } = require('./reminderService');
const { getSetting } = require('./settingsService');
const footballProviderService = require('./footballProviderService');

let jobs = [];

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

async function safeRun(fn, label) {
  try {
    console.log(`[Scheduler] Starte: ${label}`);
    const result = await fn();
    console.log(`[Scheduler] Fertig: ${label}`, result?.message || '');
    return result;
  } catch (error) {
    console.error(`[Scheduler] Fehler bei ${label}:`, error.message);
    try {
      await sendSyncErrorToAdmin(`${label}: ${error.message}`);
    } catch {
      // ignore email errors
    }
  }
}

async function safeSyncRun(fn, label) {
  if (!(await isSyncAllowed())) return null;
  return safeRun(fn, label);
}

function startScheduler() {
  stopScheduler();

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
      await safeSyncRun(() => syncResults(), 'Ergebnis-Sync (15min)');
    }
  }));

  // Every 5 minutes while matches are live (football-data.org rate limit friendly)
  jobs.push(cron.schedule('*/5 * * * *', async () => {
    if (await hasLiveMatches()) {
      await safeSyncRun(() => syncLiveScores(), 'Live-Score-Sync (5min)');
    }
  }));

  // Daily reminder emails
  jobs.push(cron.schedule('0 9 * * *', async () => {
    const enabled = await getSetting('emailRemindersEnabled', false);
    if (enabled) {
      await safeRun(() => sendMissingPredictionReminders(), 'Fehlende-Tipp-Erinnerungen');
      await safeRun(() => sendBonusQuestionReminders(), 'Bonusfrage-Erinnerungen');
    }
  }));

  // Weekly upcoming matches summary (Monday 08:00)
  jobs.push(cron.schedule('0 8 * * 1', async () => {
    const enabled = await getSetting('emailRemindersEnabled', false);
    if (enabled && isTournamentActive()) {
      await safeRun(() => sendUpcomingMatchesSummary(), 'Spielübersicht-E-Mail');
    }
  }));

  // Weekly leaderboard updates (Sunday 18:00)
  jobs.push(cron.schedule('0 18 * * 0', async () => {
    const enabled = await getSetting('emailRemindersEnabled', false);
    if (enabled && isTournamentActive()) {
      await safeRun(() => sendLeaderboardUpdates(), 'Hitlisten-Update-E-Mail');
    }
  }));

  // Leaderboard snapshot every hour during tournament
  const { saveLeaderboardSnapshot } = require('./leaderboardService');
  jobs.push(cron.schedule('0 * * * *', async () => {
    if (isTournamentActive()) {
      await safeRun(() => saveLeaderboardSnapshot(), 'Hitliste-Snapshot');
    }
  }));

  // Lock matches at kickoff every minute
  const { lockPastKickoffMatches } = require('./matchLockSchedulerService');
  jobs.push(cron.schedule('* * * * *', () => {
    safeRun(() => lockPastKickoffMatches(), 'Kickoff-Sperre');
  }));

  // Weekly postgres backup (Sunday 02:00)
  const { createPostgresBackup, isPostgresConfigured } = require('./postgresBackupService');
  jobs.push(cron.schedule('0 2 * * 0', async () => {
    if (isPostgresConfigured()) {
      await safeRun(() => createPostgresBackup(), 'Postgres-Backup');
    }
  }));

  console.log(`[Scheduler] ${jobs.length} Cron-Jobs gestartet.`);
}

function stopScheduler() {
  for (const job of jobs) job.stop();
  jobs = [];
}

module.exports = { startScheduler, stopScheduler };
