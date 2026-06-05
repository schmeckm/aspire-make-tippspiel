require('../config/loadEnv');
const { createPostgresBackup, isPostgresConfigured } = require('../services/postgresBackupService');

async function main() {
  if (!isPostgresConfigured()) {
    console.error('Postgres backup requires DB_DIALECT=postgres');
    process.exit(1);
  }
  const result = await createPostgresBackup();
  console.log(`Backup created: ${result.filename} (${result.size} bytes)`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
