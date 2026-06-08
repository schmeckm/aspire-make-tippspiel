require('../helpers/testEnv');
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { sequelize, User, Team } = require('../../models');
const { getTeamRanking } = require('../../services/leaderboardService');
const { seedTestData } = require('../helpers/seedTestData');

describe('leaderboardService.getTeamRanking', () => {
  before(async () => {
    await sequelize.sync({ force: true });
    await seedTestData();
  });

  it('counts all assigned team members, including admins excluded from the leaderboard', async () => {
    const team = await Team.findOne({ where: { name: 'IT' } });
    await User.create({
      firstName: 'Markus',
      lastName: 'Schmeckenbecher',
      email: 'team-ranking-admin@test.local',
      password: 'admin123',
      role: 'admin',
      teamId: team.id,
      emailVerified: true,
    });

    const assignedCount = await User.count({ where: { teamId: team.id } });
    const ranking = await getTeamRanking({ skipCache: true });
    const entry = ranking.find((row) => row.teamId === team.id);

    assert.ok(entry);
    assert.equal(entry.userCount, assignedCount);
    assert.ok(entry.userCount >= 2, 'admins assigned to a team should count as members');
  });
});
