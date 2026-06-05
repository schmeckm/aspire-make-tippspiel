const { sendError } = require('../utils/apiResponse');

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return sendError(res, req, 403, 'errors.accessDeniedAdmin');
  }
  next();
}

module.exports = adminMiddleware;
