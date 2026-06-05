const { resolveLocale, parseAcceptLanguage } = require('../services/i18nService');

function localeMiddleware(req, res, next) {
  const headerLanguage = req.headers['x-language']
    || parseAcceptLanguage(req.headers['accept-language']);
  const queryLanguage = req.query?.lang;
  const bodyLanguage = req.body?.language;

  req.locale = resolveLocale({
    userLanguage: req.user?.language,
    headerLanguage,
    bodyLanguage,
    queryLanguage,
  });

  next();
}

function applyUserLocale(req) {
  if (req.user?.language) {
    req.locale = req.user.language;
  }
}

module.exports = { localeMiddleware, applyUserLocale };
