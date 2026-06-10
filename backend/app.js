require('./config/loadEnv');
require('./instrument');
const { Sentry, isSentryEnabled } = require('./instrument');
const express = require('express');
const helmet = require('helmet');
const { getAppVersion } = require('./utils/appVersion');
const cors = require('cors');
const { getCorsOptions } = require('./config/corsConfig');
const path = require('path');
const fs = require('fs');
const { sequelize } = require('./models');

const requestLogger = require('./middleware/requestLogger');
const requestIdMiddleware = require('./middleware/requestIdMiddleware');
const { apiLimiter, leaderboardLimiter, displayLimiter, publicReadLimiter } = require('./middleware/rateLimiter');
const { seedDefaultSettings } = require('./services/settingsService');
const { isAiEnabled, isApiKeyConfigured, getAiConfig } = require('./services/llmService');
const { getExternalApiHealth } = require('./services/externalApiHealthService');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const teamRoutes = require('./routes/teamRoutes');
const matchRoutes = require('./routes/matchRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const scoringRuleRoutes = require('./routes/scoringRuleRoutes');
const adminRoutes = require('./routes/adminRoutes');
const syncRoutes = require('./routes/syncRoutes');
const { router: bonusRoutes, adminRouter: bonusAdminRoutes } = require('./routes/bonusRoutes');
const statisticsRoutes = require('./routes/statisticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const auditRoutes = require('./routes/auditRoutes');
const emailRoutes = require('./routes/emailRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const systemRoutes = require('./routes/systemRoutes');
const aiRoutes = require('./routes/aiRoutes');
const adminAiRoutes = require('./routes/adminAiRoutes');
const footballRoutes = require('./routes/footballRoutes');
const playerImageRoutes = require('./routes/playerImageRoutes');
const adminPlayerImageRoutes = require('./routes/adminPlayerImageRoutes');
const displayRoutes = require('./routes/displayRoutes');
const prizeRoutes = require('./routes/prizeRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const adminMiddleware = require('./middleware/adminMiddleware');
const { localeMiddleware } = require('./middleware/localeMiddleware');
const { translate } = require('./utils/apiResponse');
const { mountApiRoutes } = require('./utils/mountApiRoutes');
const { metricsMiddleware, metricsHandler } = require('./middleware/metricsMiddleware');

const app = express();

// Rate limits must use the real client IP from nginx (X-Forwarded-For), not the proxy container.
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

const { resolveDatabasePath } = require('./database/paths');
const dbDir = path.dirname(resolveDatabasePath());
if (!fs.existsSync(dbDir) && dbDir !== ':memory:') {
  fs.mkdirSync(dbDir, { recursive: true });
}

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const teamUploadsDir = path.join(uploadsDir, 'teams');
if (!fs.existsSync(teamUploadsDir)) fs.mkdirSync(teamUploadsDir, { recursive: true });
const userUploadsDir = path.join(uploadsDir, 'users');
if (!fs.existsSync(userUploadsDir)) fs.mkdirSync(userUploadsDir, { recursive: true });
const playerUploadsDir = path.join(uploadsDir, 'players');
if (!fs.existsSync(playerUploadsDir)) fs.mkdirSync(playerUploadsDir, { recursive: true });
const prizeUploadsDir = path.join(uploadsDir, 'prizes');
if (!fs.existsSync(prizeUploadsDir)) fs.mkdirSync(prizeUploadsDir, { recursive: true });

app.use('/uploads', express.static(uploadsDir, {
  etag: false,
  lastModified: true,
  maxAge: 0,
  setHeaders(res) {
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors(getCorsOptions()));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(requestIdMiddleware);
  app.use(metricsMiddleware);
  app.use(requestLogger);
}

app.use(['/api', '/api/v1'], localeMiddleware);

app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    const aiEnabled = isAiEnabled();
    const aiKeyConfigured = isApiKeyConfigured();
    const externalApis = await getExternalApiHealth();
    res.json({
      status: 'ok',
      version: getAppVersion(),
      ai: {
        enabled: aiEnabled,
        apiKeyConfigured: aiKeyConfigured,
        active: aiEnabled && aiKeyConfigured,
        reason: !aiEnabled ? 'disabled' : !aiKeyConfigured ? 'no_api_key' : 'ok',
      },
      externalApis: externalApis.apis,
      externalApisCheckedAt: externalApis.checkedAt,
    });
  } catch (error) {
    res.status(503).json({ status: 'error', reason: 'database_unavailable' });
  }
});

app.get('/api/health/detailed', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await sequelize.authenticate();
    const aiEnabled = isAiEnabled();
    const aiKeyConfigured = isApiKeyConfigured();
    res.json({
      status: 'ok',
      version: getAppVersion(),
      message: translate(req, 'messages.healthOk'),
      database: process.env.DB_DIALECT || 'sqlite',
      uptime: process.uptime(),
      ai: {
        enabled: aiEnabled,
        apiKeyConfigured: aiKeyConfigured,
        active: aiEnabled && aiKeyConfigured,
        model: getAiConfig().model,
      },
    });
  } catch (error) {
    res.status(503).json({ status: 'error', message: translate(req, 'errors.databaseUnavailable') });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.use('/api', apiLimiter);
  app.use('/api/v1', apiLimiter);
}

app.get('/api/metrics', authMiddleware, adminMiddleware, metricsHandler);
app.get('/api/v1/metrics', authMiddleware, adminMiddleware, metricsHandler);

const apiRouteBundle = {
  authRoutes,
  userRoutes,
  teamRoutes,
  matchRoutes,
  predictionRoutes,
  leaderboardRoutes,
  scoringRuleRoutes,
  adminRoutes,
  syncRoutes,
  bonusRoutes,
  bonusAdminRoutes,
  statisticsRoutes,
  notificationRoutes,
  auditRoutes,
  emailRoutes,
  settingsRoutes,
  systemRoutes,
  aiRoutes,
  footballRoutes,
  playerImageRoutes,
  adminPlayerImageRoutes,
  displayRoutes,
  prizeRoutes,
  adminAiRoutes,
  authMiddleware,
  adminMiddleware,
  settingsUpdateHandler: settingsRoutes.updateSettings,
  publicReadLimiter,
  leaderboardLimiter,
  displayLimiter,
};

mountApiRoutes(app, '/api', apiRouteBundle);
mountApiRoutes(app, '/api/v1', apiRouteBundle);

app.use((err, req, res, next) => {
  console.error(err.stack);
  if (isSentryEnabled()) {
    Sentry.captureException(err, {
      extra: { path: req.path, method: req.method },
    });
  }
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    error: isProduction
      ? translate(req, 'errors.internalServer')
      : (err.message || translate(req, 'errors.internalServer')),
  });
});

async function initDatabase(options = {}) {
  const { force = false, allowForce = false } = options;
  const {
    resolveDatabasePath,
    isProductionDatabasePath,
    isIsolatedTestDatabasePath,
  } = require('./database/paths');
  const dbPath = resolveDatabasePath();

  if (force && isProductionDatabasePath(dbPath) && !allowForce) {
    throw new Error(
      'Datenbank-Reset auf Produktions-DB blockiert. Nutze: npm run db:reset -- --confirm',
    );
  }

  if (force && process.env.NODE_ENV === 'test' && !isIsolatedTestDatabasePath(dbPath)) {
    throw new Error(
      'Tests dürfen die Produktions-Datenbank nicht zurücksetzen. Prüfe tests/helpers/testEnv.js.',
    );
  }

  const { runMigrations } = require('./database/migrate');
  // Safe sync: erstellt fehlende Tabellen, löscht/ändert keine bestehenden Daten.
  // Auch in Production nötig, wenn neue Models (z. B. RefreshToken) hinzukommen.
  // Neue Spalten werden zusätzlich über database/migrate.js ergänzt.
  await sequelize.sync({
    force: force && (allowForce || process.env.NODE_ENV === 'test'),
  });
  await runMigrations(sequelize);

  if (sequelize.getDialect() === 'sqlite') {
    const busyTimeout = parseInt(process.env.SQLITE_BUSY_TIMEOUT || '5000', 10);
    await sequelize.query('PRAGMA journal_mode = WAL;');
    await sequelize.query(`PRAGMA busy_timeout = ${busyTimeout};`);
    await sequelize.query('PRAGMA foreign_keys = ON;');
  }

  await seedDefaultSettings();

  const { fixLegacyApiMatchNumbers } = require('./services/matchNumberService');
  await fixLegacyApiMatchNumbers();

  if (!force) {
    const { Team } = require('./models');
    const { ensureProductionTeams } = require('./database/teamsSeed');
    await ensureProductionTeams(Team);

    const { ensureDefaultBonusQuestions } = require('./database/bonusQuestionsSeed');
    await ensureDefaultBonusQuestions();
  }
}

module.exports = { app, initDatabase, sequelize };
