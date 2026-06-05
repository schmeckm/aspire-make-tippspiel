require('./testEnv');

const supertest = require('supertest');
const { app, initDatabase } = require('../../app');
const { seedTestData } = require('./seedTestData');

async function setupTestDb() {
  await initDatabase({ force: true });
  await seedTestData();
  return supertest(app);
}

async function loginAs(api, email, password) {
  return api.post('/api/auth/login').send({ email, password });
}

async function adminToken(api) {
  const res = await loginAs(api, 'admin@example.com', 'admin123');
  if (!res.body.token) {
    throw new Error(`Admin login failed: ${JSON.stringify(res.body)}`);
  }
  return res.body.token;
}

module.exports = {
  setupTestDb,
  loginAs,
  adminToken,
};
