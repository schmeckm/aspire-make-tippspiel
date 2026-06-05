const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const AICommentary = sequelize.define('AICommentary', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  matchId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  inputContextJson: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  promptVersion: {
    type: DataTypes.STRING,
    defaultValue: '1.0',
  },
  model: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  tokenUsageJson: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isCached: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

module.exports = AICommentary;
