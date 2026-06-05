require('../config/loadEnv');
const { sequelize } = require('../models');
const { backupDatabase } = require('./backup');
const { seedDemoData } = require('./demoData');

const confirmed = process.argv.includes('--confirm');

async function reset() {
  if (!confirmed) {
    console.error('\nABBRUCH: Datenbank-Reset erfordert explizite Bestätigung.');
    console.error('Dies löscht ALLE Teams, Benutzer, Spiele und Tipps.');
    console.error('Vorher wird automatisch eine Sicherungskopie erstellt.');
    console.error('\nBefehl: npm run db:reset -- --confirm\n');
    process.exit(1);
  }

  try {
    const backupPath = backupDatabase('pre-reset');
    if (backupPath) {
      console.log(`Sicherungskopie erstellt: ${backupPath}`);
    }

    const { initDatabase } = require('../app');
    await initDatabase({ force: true, allowForce: true });
    console.log('Datenbank zurückgesetzt.');

    await seedDemoData();
    console.log('\n=== Demo-Daten geladen ===');
    console.log('Admin: admin@example.com / admin123');
    console.log('User: max.mueller@example.com / user123');
  } catch (error) {
    console.error('Reset fehlgeschlagen:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

reset();
