const crypto = require('crypto');

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function expiresInHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function getAppUrl() {
  return process.env.APP_URL || 'http://localhost:5173';
}

module.exports = {
  generateToken,
  expiresInHours,
  getAppUrl,
};
