const { t } = require('../services/i18nService');

function getLocale(req) {
  return req.locale || 'de';
}

function sendError(res, req, status, key, params) {
  return res.status(status).json({
    error: t(key, getLocale(req), params),
    code: key,
  });
}

function sendSuccess(res, req, key, params, extra = {}) {
  return res.json({ message: t(key, getLocale(req), params), ...extra });
}

function translate(req, key, params) {
  return t(key, getLocale(req), params);
}

module.exports = { sendError, sendSuccess, translate, getLocale };
