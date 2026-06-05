require('../config/loadEnv');
const { sequelize, Team } = require('../models');
const { seedDemoData } = require('./demoData');

async function seed() {
  try {
    const teamCount = await Team.count().catch(() => 0);
    if (teamCount > 0) {
      console.error('\nABBRUCH: Die Datenbank enthält bereits Daten.');
      console.error('Demo-Seed überschreibt keine bestehenden Daten.');
      console.error('Zum bewussten Zurücksetzen: npm run db:reset -- --confirm\n');
      process.exit(1);
    }

    const { initDatabase } = require('../app');
    await initDatabase();
    await seedDemoData();

    console.log('\n=== Demo-Daten geladen (leere Datenbank) ===');
    console.log('Admin: admin@example.com / admin123');
    console.log('User: max.mueller@example.com / user123');
  } catch (error) {
    console.error('Seed fehlgeschlagen:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
