const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../database');

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
    validate: { isIn: [['de', 'en', 'es', 'fr']] },
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
}, {
  hooks: {
    beforeCreate: async (user) => {
      user.password = await bcrypt.hash(user.password, 10);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
  },
});

User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toSafeJSON = function () {
  const {
    password,
    emailVerificationToken,
    emailVerificationExpires,
    passwordResetToken,
    passwordResetExpires,
    ...safe
  } = this.toJSON();
  return safe;
};

module.exports = User;
