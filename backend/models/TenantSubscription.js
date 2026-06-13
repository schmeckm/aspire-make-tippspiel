const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const TenantSubscription = sequelize.define('TenantSubscription', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  provider: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'stripe',
  },
  status: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'inactive',
  },
  plan: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  stripeCustomerId: {
    type: DataTypes.STRING(128),
    allowNull: true,
  },
  stripeSubscriptionId: {
    type: DataTypes.STRING(128),
    allowNull: true,
    unique: true,
  },
  stripeCheckoutSessionId: {
    type: DataTypes.STRING(128),
    allowNull: true,
  },
  currentPeriodEnd: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  rawJson: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  indexes: [
    { fields: ['tenantId'] },
    { unique: true, fields: ['stripeSubscriptionId'] },
  ],
});

module.exports = TenantSubscription;

