const express = require('express');
const { sendError, translate } = require('../utils/apiResponse');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { User, Team, Match, Prediction, SyncLog } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { importMatchesFromCsv } = require('../services/csvImportService');
const { getLeaderboard, recalculateAllPoints } = require('../services/leaderboardService');
const { getSyncStatusSummary } = require('../services/syncLogService');
const { getAdminOverview } = require('../services/statisticsService');
const emailService = require('../services/emailService');
const { getSetting } = require('../services/settingsService');
const { logAudit } = require('../services/auditService');
const notificationService = require('../services/notificationService');
const {
  collectPlayerData,
  getBackupOverview,
  createBackupFile,
  readBackupFile,
  deleteBackupFile,
  restorePlayerData,
  buildFilename,
} = require('../services/backupService');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) cb(null, true);
    else cb(new Error('Nur CSV-Dateien sind erlaubt.'));
  },
});

const backupUpload = multer({
  dest: uploadDir,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/json'
      || file.originalname.endsWith('.json')
    ) cb(null, true);
    else cb(new Error('Nur JSON-Dateien sind erlaubt.'));
  },
});

router.use(authMiddleware, adminMiddleware);

router.get('/dashboard', async (req, res) => {
  try {
    const overview = await getAdminOverview();
    const syncStatus = await getSyncStatusSummary();
    const emailStatus = await emailService.getEmailStatus();
    const leaderboard = await getLeaderboard();
    const top10 = leaderboard.slice(0, 10);

    const { Op } = require('sequelize');
    const upcomingLocked = await Match.findAll({
      where: {
        kickoffTime: { [Op.between]: [new Date(), new Date(Date.now() + 24 * 60 * 60 * 1000)] },
        status: 'scheduled',
      },
      order: [['kickoffTime', 'ASC']],
      limit: 5,
    });

    const lastSyncError = await SyncLog.findOne({
      where: { status: 'failed' },
      order: [['startedAt', 'DESC']],
    });

    const rankChanges = leaderboard.filter((e) => e.rankMovement !== 0).slice(0, 5);

    res.json({
      ...overview,
      totalTeams: await Team.count(),
      totalMatches: await Match.count(),
      finishedMatches: await Match.count({ where: { status: 'finished' } }),
      openMatches: await Match.count({ where: { status: 'scheduled' } }),
      top10,
      syncStatus,
      emailStatus,
      emailRemindersEnabled: await getSetting('emailRemindersEnabled', false),
      upcomingLocked,
      lastSyncError,
      rankChanges,
    });
  } catch (error) {
    console.error(error);
    sendError(res, req, 500, 'errors.dashboardLoadFailed');
  }
});

router.post('/recalculate-points', async (req, res) => {
  try {
    const result = await recalculateAllPoints();
    res.json({ message: 'Punkte neu berechnet.', ...result });
  } catch (error) {
    sendError(res, req, 500, 'errors.recalculateFailed');
  }
});

router.get('/predictions', async (req, res) => {
  try {
    const predictions = await Prediction.findAll({
      include: [
        { model: User, as: 'user', include: [{ model: Team, as: 'team' }] },
        { model: Match, as: 'match' },
      ],
      order: [['submittedAt', 'DESC']],
    });
    res.json(predictions);
  } catch (error) {
    sendError(res, req, 500, 'errors.predictionsLoadFailed');
  }
});

router.get('/predictions/match/:matchId', async (req, res) => {
  try {
    const predictions = await Prediction.findAll({
      where: { matchId: req.params.matchId },
      include: [
        { model: User, as: 'user', include: [{ model: Team, as: 'team' }] },
        { model: Match, as: 'match' },
      ],
    });
    res.json(predictions);
  } catch (error) {
    sendError(res, req, 500, 'errors.predictionsLoadFailed');
  }
});

router.get('/predictions/user/:userId', async (req, res) => {
  try {
    const predictions = await Prediction.findAll({
      where: { userId: req.params.userId },
      include: [{ model: Match, as: 'match' }],
      order: [[{ model: Match, as: 'match' }, 'kickoffTime', 'ASC']],
    });
    res.json(predictions);
  } catch (error) {
    sendError(res, req, 500, 'errors.predictionsLoadFailed');
  }
});

router.post('/notifications/send', async (req, res) => {
  try {
    const { userId, title, message, type, link } = req.body;
    if (userId) {
      await notificationService.createNotification({ userId, title, message, type, link });
    } else {
      const users = await User.findAll({ where: { role: 'user' } });
      await notificationService.createBulkNotifications(
        users.map((u) => ({ userId: u.id, title, message, type: type || 'info', link }))
      );
    }
    res.json({ message: 'Benachrichtigung(en) gesendet.' });
  } catch (error) {
    sendError(res, req, 500, 'errors.sendFailed');
  }
});

router.get('/backup', async (req, res) => {
  try {
    const overview = await getBackupOverview();
    res.json(overview);
  } catch (error) {
    console.error(error);
    sendError(res, req, 500, 'errors.backupLoadFailed');
  }
});

router.get('/backup/export', async (req, res) => {
  try {
    const payload = await collectPlayerData();
    const filename = buildFilename();
    await logAudit({
      userId: req.user.id,
      action: 'PLAYER_DATA_EXPORT',
      newValue: payload.meta,
      req,
    });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    console.error(error);
    sendError(res, req, 500, 'errors.backupExportFailed');
  }
});

router.post('/backup', async (req, res) => {
  try {
    const { filename, payload } = await createBackupFile();
    await logAudit({
      userId: req.user.id,
      action: 'PLAYER_DATA_BACKUP',
      newValue: { filename, ...payload.meta },
      req,
    });
    res.json({
      message: 'Backup gespeichert.',
      filename,
      meta: payload.meta,
      exportedAt: payload.exportedAt,
    });
  } catch (error) {
    console.error(error);
    sendError(res, req, 500, 'errors.backupCreateFailed');
  }
});

router.get('/backup/:filename', async (req, res) => {
  try {
    const payload = readBackupFile(req.params.filename);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    if (error.message === 'BACKUP_NOT_FOUND' || error.message === 'INVALID_BACKUP_FILE') {
      return sendError(res, req, 404, 'errors.backupNotFound');
    }
    console.error(error);
    sendError(res, req, 500, 'errors.backupDownloadFailed');
  }
});

router.delete('/backup/:filename', async (req, res) => {
  try {
    deleteBackupFile(req.params.filename);
    await logAudit({
      userId: req.user.id,
      action: 'PLAYER_DATA_BACKUP_DELETE',
      newValue: { filename: req.params.filename },
      req,
    });
    res.json({ message: 'Backup gelöscht.' });
  } catch (error) {
    if (error.message === 'BACKUP_NOT_FOUND' || error.message === 'INVALID_BACKUP_FILE') {
      return sendError(res, req, 404, 'errors.backupNotFound');
    }
    console.error(error);
    sendError(res, req, 500, 'errors.backupDeleteFailed');
  }
});

router.post('/backup/restore', backupUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return sendError(res, req, 400, 'errors.noBackupFile');

    const raw = fs.readFileSync(req.file.path, 'utf-8');
    fs.unlinkSync(req.file.path);

    const payload = JSON.parse(raw);
    const summary = await restorePlayerData(payload);
    await logAudit({
      userId: req.user.id,
      action: 'PLAYER_DATA_RESTORE',
      newValue: summary,
      req,
    });
    res.json({ message: 'Daten wiederhergestellt.', summary });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    if (error.message === 'INVALID_BACKUP') {
      return sendError(res, req, 400, 'errors.invalidBackupFile');
    }
    console.error(error);
    sendError(res, req, 500, 'errors.backupRestoreFailed');
  }
});

router.post('/matches/import-csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return sendError(res, req, 400, 'errors.noCsvFile');

    const csvContent = fs.readFileSync(req.file.path, 'utf-8');
    fs.unlinkSync(req.file.path);

    const summary = await importMatchesFromCsv(csvContent);
    await logAudit({ userId: req.user.id, action: 'CSV_IMPORT', newValue: summary, req });
    res.json({ message: 'CSV-Import abgeschlossen.', summary });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    sendError(res, req, 500, 'errors.csvImportFailed');
  }
});

module.exports = router;
