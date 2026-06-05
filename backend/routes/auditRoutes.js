const express = require('express');
const { sendError, translate } = require('../utils/apiResponse');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { getAuditLogs } = require('../services/auditService');

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get('/', async (req, res) => {
  try {
    const result = await getAuditLogs({
      userId: req.query.userId,
      action: req.query.action,
      entityType: req.query.entityType,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
      limit: parseInt(req.query.limit || '100', 10),
      offset: parseInt(req.query.offset || '0', 10),
    });
    res.json(result);
  } catch (error) {
    sendError(res, req, 500, 'errors.auditLogLoadFailed');
  }
});

module.exports = router;
