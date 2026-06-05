const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

let loaded = false;

function loadEnv() {
  if (loaded) return;
  loaded = true;

  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    // Docker/Shell-Variablen haben Vorrang (override: false).
    dotenv.config({ path: envPath, override: false });
  }
}

loadEnv();

module.exports = { loadEnv };
