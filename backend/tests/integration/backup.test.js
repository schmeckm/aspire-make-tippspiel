const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupTestDb, adminToken } = require('../helpers/testApp');
const { BACKUP_DIR } = require('../../services/backupService');

describe('Admin player data backup', () => {
  let api;
  let token;

  before(async () => {
    api = await setupTestDb();
    token = await adminToken(api);
  });

  it('returns backup overview for admins', async () => {
    const res = await api
      .get('/api/admin/backup')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.current);
    assert.ok(Array.isArray(res.body.backups));
    assert.ok(res.body.current.userCount >= 1);
  });

  it('exports player data as JSON download', async () => {
    const res = await api
      .get('/api/admin/backup/export')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.match(res.headers['content-disposition'], /spieler-backup-/);
    const payload = JSON.parse(res.text);
    assert.equal(payload.version, '1.1');
    assert.ok(Array.isArray(payload.data.users));
    assert.ok(payload.meta.userCount >= 1);
  });

  it('creates, downloads and deletes a server backup', async () => {
    const createRes = await api
      .post('/api/admin/backup')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(createRes.status, 200);
    assert.ok(createRes.body.filename);
    assert.ok(createRes.body.exportedAt);

    const filename = createRes.body.filename;
    const filePath = path.join(BACKUP_DIR, filename);
    assert.ok(fs.existsSync(filePath));
    const saved = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    assert.equal(saved.source, 'manual');
    assert.ok(saved.exportedAt);

    const downloadRes = await api
      .get(`/api/admin/backup/${filename}`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(downloadRes.status, 200);
    const payload = JSON.parse(downloadRes.text);
    assert.ok(payload.data.users.length >= 1);

    const deleteRes = await api
      .delete(`/api/admin/backup/${filename}`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(deleteRes.status, 200);
    assert.equal(fs.existsSync(filePath), false);
  });

  it('restores player data from a saved server backup', async () => {
    const createRes = await api
      .post('/api/admin/backup')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(createRes.status, 200);
    const filename = createRes.body.filename;

    const restoreRes = await api
      .post(`/api/admin/backup/restore/${encodeURIComponent(filename)}`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(restoreRes.status, 200);
    assert.ok(restoreRes.body.summary);
    assert.ok(restoreRes.body.summary.usersUpdated >= 0);

    await api
      .delete(`/api/admin/backup/${filename}`)
      .set('Authorization', `Bearer ${token}`);
  });
});
