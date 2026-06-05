const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const BACKUP_DIR = path.join(__dirname, '..', 'backups', 'postgres');

function isPostgresConfigured() {
  return (process.env.DB_DIALECT || 'sqlite') === 'postgres';
}

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function buildFilename() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `postgres-${stamp}.sql`;
}

async function createPostgresBackup() {
  if (!isPostgresConfigured()) {
    return { skipped: true, reason: 'not_postgres' };
  }

  ensureBackupDir();
  const filename = buildFilename();
  const filePath = path.join(BACKUP_DIR, filename);

  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const user = process.env.DB_USER || 'postgres';
  const dbName = process.env.DB_NAME || 'wm2026';

  await execFileAsync('pg_dump', [
    '-h', host,
    '-p', String(port),
    '-U', user,
    '-d', dbName,
    '-f', filePath,
    '--no-owner',
    '--no-acl',
  ], {
    env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || '' },
  });

  const stat = fs.statSync(filePath);
  return {
    filename,
    path: filePath,
    size: stat.size,
    createdAt: stat.mtime.toISOString(),
  };
}

function listPostgresBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter((name) => name.endsWith('.sql'))
    .map((filename) => {
      const filePath = path.join(BACKUP_DIR, filename);
      const stat = fs.statSync(filePath);
      return {
        filename,
        size: stat.size,
        createdAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

module.exports = {
  BACKUP_DIR,
  isPostgresConfigured,
  createPostgresBackup,
  listPostgresBackups,
};
