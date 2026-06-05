const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const LeaderboardSnapshot = sequelize.define('LeaderboardSnapshot', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  rank: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  totalPoints: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  matchPoints: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  bonusPoints: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  snapshotTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
});

module.exports = LeaderboardSnapshot;
