const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Tenant = sequelize.define('Tenant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  slug: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING(160),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'active',
    validate: { isIn: [['active', 'pending_payment', 'paid_pending_setup', 'suspended']] },
  },
  brandingJson: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  indexes: [{ unique: true, fields: ['slug'] }],
});

module.exports = Tenant;

