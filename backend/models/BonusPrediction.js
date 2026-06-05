const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const BonusPrediction = sequelize.define('BonusPrediction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  bonusQuestionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  answerJson: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  points: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  indexes: [
    { unique: true, fields: ['userId', 'bonusQuestionId'] },
  ],
});

module.exports = BonusPrediction;
