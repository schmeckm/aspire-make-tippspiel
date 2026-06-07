const { User, Team, Match, ScoringRule } = require('../../models');

async function seedTestData() {
  const team = await Team.create({ name: 'IT', description: 'IT-Abteilung' });
  await Team.create({ name: 'Finance', description: 'Finanzabteilung' });

  await User.create({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    teamId: team.id,
    emailVerified: true,
  });

  await User.create({
    firstName: 'Verified',
    lastName: 'User',
    email: 'verified@example.com',
    password: 'user123',
    role: 'user',
    teamId: team.id,
    emailVerified: true,
  });

  await ScoringRule.create({
    exactResultPoints: 5,
    goalDifferencePoints: 3,
    tendencyPoints: 2,
    wrongPredictionPoints: 0,
  });

  await Match.create({
    matchNumber: 1,
    stage: 'Group Stage',
    groupName: 'A',
    homeTeam: 'Deutschland',
    awayTeam: 'Frankreich',
    kickoffTime: '2026-06-11T21:00:00.000Z',
    stadium: 'MetLife Stadium',
    city: 'East Rutherford',
  });

  return { team };
}

module.exports = { seedTestData };
