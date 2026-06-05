const crypto = require('crypto');

const blacklist = new Map();
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function blacklistToken(token, expiresAtMs) {
  if (!token) return;
  const exp = expiresAtMs || Date.now() + 7 * 24 * 60 * 60 * 1000;
  blacklist.set(tokenHash(token), exp);
}

function isTokenBlacklisted(token) {
  if (!token) return false;
  cleanupExpired();
  const hash = tokenHash(token);
  const exp = blacklist.get(hash);
  if (!exp) return false;
  if (Date.now() >= exp) {
    blacklist.delete(hash);
    return false;
  }
  return true;
}

function cleanupExpired() {
  const now = Date.now();
  for (const [hash, exp] of blacklist.entries()) {
    if (now >= exp) blacklist.delete(hash);
  }
}

setInterval(cleanupExpired, CLEANUP_INTERVAL_MS).unref?.();

function resetBlacklistForTests() {
  blacklist.clear();
}

module.exports = {
  blacklistToken,
  isTokenBlacklisted,
  resetBlacklistForTests,
};
