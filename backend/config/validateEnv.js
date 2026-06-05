const WEAK_JWT_SECRETS = new Set([
  '',
  'wm2026-docker-secret-change-me',
  'change-me',
  'secret',
  'test-jwt-secret-for-integration-tests',
]);

function validateEnv() {
  const errors = [];
  const warnings = [];
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  const jwtSecret = process.env.JWT_SECRET || '';
  if (!jwtSecret && !isTest) {
    errors.push('JWT_SECRET is required.');
  } else if (WEAK_JWT_SECRETS.has(jwtSecret) && isProduction) {
    errors.push('JWT_SECRET must be changed from the default value in production.');
  } else if (WEAK_JWT_SECRETS.has(jwtSecret) && !isTest) {
    warnings.push('JWT_SECRET uses a weak/default value.');
  }

  if (process.env.DB_DIALECT === 'postgres') {
    for (const key of ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']) {
      if (!process.env[key]) errors.push(`${key} is required when DB_DIALECT=postgres.`);
    }
  }

  const syncEnabled = process.env.FOOTBALL_API_SYNC_ENABLED !== 'false';
  if (syncEnabled && !process.env.FOOTBALL_API_KEY && isProduction) {
    warnings.push('FOOTBALL_API_KEY is not set while API sync is enabled.');
  }

  for (const msg of warnings) console.warn(`[Env] ${msg}`);
  if (errors.length > 0) {
    for (const msg of errors) console.error(`[Env] ${msg}`);
    if (isProduction) {
      throw new Error(`Environment validation failed: ${errors.join(' ')}`);
    }
  }
}

module.exports = { validateEnv, WEAK_JWT_SECRETS };
