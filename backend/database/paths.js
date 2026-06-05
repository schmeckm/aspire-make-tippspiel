const path = require('path');
const os = require('os');

const BACKEND_ROOT = path.resolve(__dirname, '..');
const DEFAULT_PRODUCTION_DB = path.join(__dirname, 'wm2026.sqlite');

function resolveDatabasePath() {
  const configured = process.env.DB_PATH;
  if (!configured) {
    return DEFAULT_PRODUCTION_DB;
  }
  if (path.isAbsolute(configured)) {
    return configured;
  }
  return path.resolve(BACKEND_ROOT, configured);
}

function isProductionDatabasePath(dbPath = resolveDatabasePath()) {
  const normalized = path.normalize(dbPath);
  const production = path.normalize(DEFAULT_PRODUCTION_DB);
  if (normalized === production) return true;
  return normalized.endsWith(`${path.sep}database${path.sep}wm2026.sqlite`);
}

function isIsolatedTestDatabasePath(dbPath = resolveDatabasePath()) {
  const normalized = path.normalize(dbPath);
  const tmp = path.normalize(os.tmpdir());
  return normalized.includes(tmp) || normalized.includes('wm2026-test-');
}

module.exports = {
  BACKEND_ROOT,
  resolveDatabasePath,
  isProductionDatabasePath,
  isIsolatedTestDatabasePath,
};
