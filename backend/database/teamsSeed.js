const PRODUCTION_TEAMS = [
  'Aspire MAKE',
  'Team Bernina',
  'Team Rigi',
  'Team Pilatus',
  'Team Gempen',
  'Team DIA',
  'Team FHLR',
  'Team Accenture',
  'Team TROIKA MAKE',
  'Team TROIKA Warehouse',
];

async function ensureProductionTeams(Team) {
  const created = [];
  const existing = [];

  for (const name of PRODUCTION_TEAMS) {
    const [team, isNew] = await Team.findOrCreate({
      where: { name },
      defaults: { description: name },
    });
    if (isNew) created.push(team.name);
    else existing.push(team.name);
  }

  return { created, existing, total: PRODUCTION_TEAMS.length };
}

module.exports = { PRODUCTION_TEAMS, ensureProductionTeams };
