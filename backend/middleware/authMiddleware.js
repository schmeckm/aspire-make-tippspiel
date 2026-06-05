const jwt = require('jsonwebtoken');
const { User, Team } = require('../models');
const { sendError } = require('../utils/apiResponse');
const { applyUserLocale } = require('./localeMiddleware');
const { isTokenBlacklisted } = require('../services/tokenBlacklistService');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, req, 401, 'errors.notAuthenticated');
    }

    const token = authHeader.split(' ')[1];
    if (isTokenBlacklisted(token)) {
      return sendError(res, req, 401, 'errors.sessionExpired');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.userId, {
      include: [{ model: Team, as: 'team' }],
    });

    if (!user) {
      return sendError(res, req, 401, 'errors.userNotFound');
    }

    req.user = user;
    applyUserLocale(req);
    next();
  } catch (error) {
    return sendError(res, req, 401, 'errors.invalidToken');
  }
};

module.exports = authMiddleware;
