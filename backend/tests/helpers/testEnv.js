const path = require('path');
const os = require('os');

const testDbPath = path.join(os.tmpdir(), `wm2026-test-${process.pid}.sqlite`);

process.env.NODE_ENV = 'test';
process.env.DB_PATH = testDbPath;
process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
process.env.JWT_EXPIRES_IN = '1h';
process.env.SMTP_HOST = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASSWORD = '';
process.env.SMTP_FROM = '';
process.env.APP_URL = 'http://localhost:5173';
process.env.OPEN_REGISTRATION = 'true';
process.env.AI_FEATURES_ENABLED = 'false';
process.env.OPENAI_API_KEY = '';
process.env.DB_SYNC_ALTER = 'false';

module.exports = { testDbPath };
