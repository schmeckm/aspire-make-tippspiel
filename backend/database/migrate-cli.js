require('../config/loadEnv');
const { sequelize } = require('../models');

async function migrate() {
  try {
    const { initDatabase } = require('../app');
    await initDatabase();
    console.log('Migrationen abgeschlossen. Bestehende Daten wurden beibehalten.');
  } catch (error) {
    console.error('Migration fehlgeschlagen:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrate();
