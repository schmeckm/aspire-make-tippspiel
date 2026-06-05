const { AuditLog } = require('../models');

async function logAudit({
  userId,
  action,
  entityType = null,
  entityId = null,
  oldValue = null,
  newValue = null,
  req = null,
}) {
  try {
    await AuditLog.create({
      userId: userId || null,
      action,
      entityType,
      entityId,
      oldValueJson: oldValue ? JSON.stringify(oldValue) : null,
      newValueJson: newValue ? JSON.stringify(newValue) : null,
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || null,
      userAgent: req?.headers?.['user-agent'] || null,
    });
  } catch (error) {
    console.error('Audit log error:', error.message);
  }
}

async function getAuditLogs({ userId, action, entityType, fromDate, toDate, limit = 100, offset = 0 } = {}) {
  const { Op } = require('sequelize');
  const where = {};

  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt[Op.gte] = new Date(fromDate);
    if (toDate) where.createdAt[Op.lte] = new Date(toDate);
  }

  const { User } = require('../models');

  return AuditLog.findAndCountAll({
    where,
    include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });
}

module.exports = { logAudit, getAuditLogs };
