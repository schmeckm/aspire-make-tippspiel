const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const BonusQuestion = sequelize.define('BonusQuestion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  questionText: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  questionType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'single_choice',
  },
  optionsJson: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  points: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
  },
  lockTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'open',
  },
  correctAnswerJson: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

module.exports = BonusQuestion;
