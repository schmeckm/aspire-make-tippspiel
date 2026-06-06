const { version: packageVersion } = require('../package.json');

function getAppVersion() {
  return process.env.APP_VERSION || packageVersion;
}

module.exports = { getAppVersion };
