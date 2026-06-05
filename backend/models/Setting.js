const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Setting = sequelize.define('Setting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  value: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  valueJson: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

module.exports = Setting;
