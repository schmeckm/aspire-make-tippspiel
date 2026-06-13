const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Match = sequelize.define('Match', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  matchNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
  stage: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  groupName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  homeTeam: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  awayTeam: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  kickoffTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  timezone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  stadium: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  homeScore: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  awayScore: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'scheduled',
  },
  isManuallyLocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  externalApiId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  dataSource: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  apiProvider: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  apiLastStatus: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isApiManaged: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  lastSyncedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  syncError: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  rawJson: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  highlightsUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  indexes: [
    { fields: ['status', 'kickoffTime'] },
  ],
});

module.exports = Match;
