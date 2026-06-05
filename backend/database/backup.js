const fs = require('fs');
const { resolveDatabasePath } = require('./paths');

function getDatabasePath() {
  return resolveDatabasePath();
}

function backupDatabase(prefix = 'backup') {
  const resolved = getDatabasePath();
  if (!fs.existsSync(resolved)) {
    return null;
  }

  const backupDir = path.join(__dirname, '..', 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `${prefix}-${stamp}.sqlite`);
  fs.copyFileSync(resolved, backupPath);
  return backupPath;
}

module.exports = { backupDatabase, getDatabasePath };
