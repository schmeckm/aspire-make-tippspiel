require('./config/loadEnv');
require('./instrument');
const { Sentry, isSentryEnabled } = require('./instrument');
const { validateEnv } = require('./config/validateEnv');
const http = require('http');
const { app, initDatabase } = require('./app');
const socketService = require('./services/socketService');
const { startScheduler, stopScheduler } = require('./services/schedulerService');
const { getSocketCorsOrigin } = require('./config/corsConfig');

validateEnv();

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  if (isSentryEnabled()) {
    Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)));
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  if (isSentryEnabled()) {
    Sentry.captureException(error);
    Sentry.flush(2000).finally(() => process.exit(1));
    return;
  }
  process.exit(1);
});

const { getAppVersion } = require('./utils/appVersion');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

async function start() {
  try {
    await initDatabase();
    console.log('Datenbank verbunden und synchronisiert.');

    if (process.env.REDIS_URL) {
      const { ensureRedis } = require('./services/redisClient');
      await ensureRedis();
    }

    const { ensureBootstrapAdmin } = require('./services/bootstrapAdminService');
    await ensureBootstrapAdmin();

    try {
      const { seedOfficialWm2026MatchesIfNeeded } = require('./services/wm2026ScheduleSeedService');
      const seedResult = await seedOfficialWm2026MatchesIfNeeded();
      if (!seedResult.skipped && (seedResult.createdCount || seedResult.updatedCount || seedResult.removedCount)) {
        console.log(`[Schedule] ${seedResult.message}`);
      }
    } catch (seedError) {
      console.warn('[Schedule] Automatischer WM-2026-Spielplan-Import fehlgeschlagen:', seedError.message);
    }

    await socketService.init(server, { corsOrigin: getSocketCorsOrigin() });

    const { ensureAutomaticEmailReminders } = require('./services/emailReminderSettingsService');
    const reminderBootstrap = await ensureAutomaticEmailReminders();
    if (reminderBootstrap.enabled) {
      console.log(`[Email] Automatische Erinnerungen aktiv (${reminderBootstrap.reason}).`);
    }

    await startScheduler();

    server.listen(PORT, () => {
      console.log(`WM 2026 Tippspiel v${getAppVersion()} – Server läuft auf http://localhost:${PORT}`);
      const { isAiEnabled, isApiKeyConfigured, getAiConfig } = require('./services/llmService');
      if (!isAiEnabled()) {
        console.warn('[AI] Inaktiv – AI_FEATURES_ENABLED=false');
      } else if (!isApiKeyConfigured()) {
        console.warn('[AI] Inaktiv – OPENAI_API_KEY fehlt (Portainer/.env setzen, dann Container neu starten)');
      } else {
        console.log(`[AI] Aktiv – Modell ${getAiConfig().model}`);
      }
    });

    const shutdown = () => {
      stopScheduler();
      server.close(() => process.exit(0));
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Serverstart fehlgeschlagen:', error);
    if (isSentryEnabled()) {
      Sentry.captureException(error);
      await Sentry.flush(2000);
    }
    process.exit(1);
  }
}

start();
