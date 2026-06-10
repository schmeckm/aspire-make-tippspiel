const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../database');
const { withImageCacheBuster } = require('../services/userImageService');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  authProvider: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'local',
    validate: { isIn: [['local', 'google', 'microsoft']] },
  },
  providerId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  role: {
    type: DataTypes.ENUM('admin', 'user'),
    defaultValue: 'user',
  },
  teamId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  language: {
    type: DataTypes.STRING(5),
    allowNull: false,
    defaultValue: 'de',
    validate: { isIn: [['de', 'en', 'es', 'fr', 'pt']] },
  },
  favoriteNationalTeamId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  favoriteNationalTeamName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  topScorerPlayerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  topScorerPlayerName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  emailVerificationToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  emailVerificationExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  passwordResetToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  avatarColor: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'default',
  },
  avatarEmoji: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  totpEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  totpSecret: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password') && user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
  },
});

User.prototype.comparePassword = async function (candidatePassword) {
  if (!this.password || this.authProvider !== 'local') return false;
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toSafeJSON = function () {
  const {
    password,
    emailVerificationToken,
    emailVerificationExpires,
    passwordResetToken,
    passwordResetExpires,
    totpSecret,
    ...safe
  } = this.toJSON();
  safe.totpEnabled = !!safe.totpEnabled;
  safe.imageUrl = withImageCacheBuster(safe.imageUrl, safe.updatedAt);
  return safe;
};

module.exports = User;
