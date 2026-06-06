require('./config/loadEnv');
const express = require('express');
const { getAppVersion } = require('./utils/appVersion');
const cors = require('cors');
const { getCorsOptions } = require('./config/corsConfig');
const path = require('path');
const fs = require('fs');
const { sequelize } = require('./models');

const requestLogger = require('./middleware/requestLogger');
const { apiLimiter } = require('./middleware/rateLimiter');
const { seedDefaultSettings } = require('./services/settingsService');
const { isAiEnabled, isApiKeyConfigured, getAiConfig } = require('./services/llmService');

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
const authMiddleware = require('./middleware/authMiddleware');
const adminMiddleware = require('./middleware/adminMiddleware');
const { localeMiddleware } = require('./middleware/localeMiddleware');
const { translate } = require('./utils/apiResponse');

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

app.use('/uploads', express.static(uploadsDir, {
  etag: false,
  lastModified: true,
  maxAge: 0,
  setHeaders(res) {
    res.setHeader('Cache-Control', 'no-cache');
  },
}));

app.use(cors(getCorsOptions()));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(requestLogger);
}

app.use('/api', localeMiddleware);

app.get('/api/health', async (req, res) => {
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
}

app.use('/api/auth', authRoutes);

app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/scoring-rules', scoringRuleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/sync', syncRoutes);
app.use('/api/bonus-questions', bonusRoutes);
app.use('/api/admin/bonus-questions', bonusAdminRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/audit-log', auditRoutes);
app.use('/api/admin/email', emailRoutes);
app.use('/api/settings', settingsRoutes);
app.put('/api/admin/settings', authMiddleware, adminMiddleware, settingsRoutes.updateSettings);
app.use('/api/admin/system', systemRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/football', footballRoutes);
app.use('/api/player-images', playerImageRoutes);
app.use('/api/admin/player-images', adminPlayerImageRoutes);
app.use('/api/display', displayRoutes);
app.use('/api/admin/ai', adminAiRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || translate(req, 'errors.internalServer'),
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
  // Neue Spalten werden über database/migrate.js ergänzt.
  await sequelize.sync({ force: force && (allowForce || process.env.NODE_ENV === 'test') });
  await runMigrations(sequelize);
  await seedDefaultSettings();

  const { fixLegacyApiMatchNumbers } = require('./services/matchNumberService');
  await fixLegacyApiMatchNumbers();

  if (!force) {
    const { Team } = require('./models');
    const { ensureProductionTeams } = require('./database/teamsSeed');
    await ensureProductionTeams(Team);
  }
}

module.exports = { app, initDatabase, sequelize };
