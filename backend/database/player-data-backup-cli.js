require('../config/loadEnv');
const { sequelize } = require('../models');
const {
  runScheduledPlayerBackup,
  isPlayerBackupEnabled,
} = require('../services/backupService');

async function main() {
  if (!isPlayerBackupEnabled()) {
    console.log('Player data backup disabled (PLAYER_DATA_BACKUP_ENABLED=false).');
    process.exit(0);
  }

  const result = await runScheduledPlayerBackup();
  if (result.skipped) {
    console.log(`Player data backup skipped: ${result.reason}`);
    process.exit(0);
  }

  console.log(
    `Player data backup created: ${result.filename} `
    + `(${result.meta?.predictionCount || 0} predictions, retention kept ${result.retention?.kept || 0})`,
  );
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {
      // ignore
    }
  });
