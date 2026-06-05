const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const ScoringRule = sequelize.define('ScoringRule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  exactResultPoints: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
  },
  goalDifferencePoints: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
  },
  tendencyPoints: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2,
  },
  wrongPredictionPoints: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
});

module.exports = ScoringRule;
