require('../config/loadEnv');
const { Team, sequelize } = require('../models');
const { ensureProductionTeams } = require('./teamsSeed');

async function main() {
  try {
    const { created, existing, total } = await ensureProductionTeams(Team);
    console.log(`Teams geprüft: ${total}`);
    if (created.length) console.log('Neu erstellt:', created.join(', '));
    if (existing.length) console.log('Bereits vorhanden:', existing.join(', '));

    const all = await Team.findAll({ order: [['name', 'ASC']] });
    console.log(`\nAlle Teams in DB (${all.length}):`);
    all.forEach((t) => console.log(`- ${t.name}`));
  } catch (error) {
    console.error('Team-Seed fehlgeschlagen:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
