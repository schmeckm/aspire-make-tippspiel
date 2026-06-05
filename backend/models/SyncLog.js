const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const SyncLog = sequelize.define('SyncLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  syncType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  provider: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  finishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  createdCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  updatedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  skippedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  errorCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  detailsJson: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  rateLimitJson: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

module.exports = SyncLog;
