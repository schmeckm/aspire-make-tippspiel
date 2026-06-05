const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Prediction = sequelize.define('Prediction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  matchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  predictedHomeScore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 0 },
  },
  predictedAwayScore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 0 },
  },
  points: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  indexes: [
    { unique: true, fields: ['userId', 'matchId'] },
  ],
});

module.exports = Prediction;
