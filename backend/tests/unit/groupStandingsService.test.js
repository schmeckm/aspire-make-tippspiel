const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildGroupStandingsFromMatches,
  buildKnockoutPath,
  rankThirdPlaceTeams,
} = require('../../services/groupStandingsService');

describe('groupStandingsService', () => {
  test('builds sorted tables per group from finished matches', () => {
    const groups = buildGroupStandingsFromMatches([
      { groupName: 'E', homeTeam: 'Germany', awayTeam: 'Curaçao', status: 'finished', homeScore: 2, awayScore: 0 },
      { groupName: 'E', homeTeam: 'Ivory Coast', awayTeam: 'Ecuador', status: 'finished', homeScore: 1, awayScore: 1 },
      { groupName: 'E', homeTeam: 'Germany', awayTeam: 'Ivory Coast', status: 'scheduled', homeScore: null, awayScore: null },
      { groupName: 'A', homeTeam: 'Mexico', awayTeam: 'South Africa', status: 'finished', homeScore: 1, awayScore: 0 },
      { groupName: 'A', homeTeam: 'South Korea', awayTeam: 'TBD', status: 'scheduled', homeScore: null, awayScore: null },
    ]);

    assert.equal(groups.length, 2);
    assert.equal(groups[0].group, 'A');
    assert.equal(groups[1].group, 'E');

    const groupE = groups[1].table;
    assert.equal(groupE[0].team.name, 'Germany');
    assert.equal(groupE[0].points, 3);
    assert.equal(groupE[1].team.name, 'Ecuador');
    assert.equal(groupE[1].points, 1);
    assert.equal(groupE[2].team.name, 'Ivory Coast');
    assert.equal(groupE[2].points, 1);
    assert.equal(groupE[3].team.name, 'Curaçao');
    assert.equal(groupE[3].points, 0);
  });

  test('includes upcoming group matches per block', () => {
    const groups = buildGroupStandingsFromMatches([
      {
        id: 1,
        matchNumber: 10,
        groupName: 'E',
        homeTeam: 'Germany',
        awayTeam: 'Curaçao',
        status: 'scheduled',
        kickoffTime: '2026-06-14T17:00:00Z',
        stage: 'Group Stage',
      },
      {
        id: 2,
        matchNumber: 12,
        groupName: 'E',
        homeTeam: 'Ivory Coast',
        awayTeam: 'Ecuador',
        status: 'scheduled',
        kickoffTime: '2026-06-14T23:00:00Z',
        stage: 'Group Stage',
      },
    ]);

    assert.equal(groups[0].nextMatches.length, 2);
    assert.equal(groups[0].nextMatches[0].matchNumber, 10);
  });

  test('ranks third-place teams across groups', () => {
    const groups = buildGroupStandingsFromMatches([
      { groupName: 'A', homeTeam: 'Mexico', awayTeam: 'South Africa', status: 'finished', homeScore: 1, awayScore: 0 },
      { groupName: 'A', homeTeam: 'South Korea', awayTeam: 'Mexico', status: 'finished', homeScore: 0, awayScore: 2 },
      { groupName: 'A', homeTeam: 'South Africa', awayTeam: 'South Korea', status: 'finished', homeScore: 1, awayScore: 1 },
      { groupName: 'B', homeTeam: 'Canada', awayTeam: 'Qatar', status: 'finished', homeScore: 2, awayScore: 2 },
      { groupName: 'B', homeTeam: 'Switzerland', awayTeam: 'Canada', status: 'finished', homeScore: 1, awayScore: 0 },
      { groupName: 'B', homeTeam: 'Qatar', awayTeam: 'Switzerland', status: 'finished', homeScore: 0, awayScore: 1 },
    ]);

    const ranking = rankThirdPlaceTeams(groups);
    assert.equal(ranking.length, 2);
    assert.equal(ranking[0].thirdPlaceRank, 1);
    assert.equal(ranking[0].thirdPlaceQualified, true);
  });

  test('projects knockout path from current standings', () => {
    const groups = buildGroupStandingsFromMatches([
      { groupName: 'E', homeTeam: 'Germany', awayTeam: 'Curaçao', status: 'finished', homeScore: 2, awayScore: 0 },
      { groupName: 'E', homeTeam: 'Ivory Coast', awayTeam: 'Ecuador', status: 'finished', homeScore: 1, awayScore: 1 },
      { groupName: 'I', homeTeam: 'France', awayTeam: 'Senegal', status: 'finished', homeScore: 2, awayScore: 0 },
      { groupName: 'I', homeTeam: 'Norway', awayTeam: 'France', status: 'finished', homeScore: 0, awayScore: 1 },
    ]);

    const path = buildKnockoutPath(groups, []);
    const match74 = path.find((entry) => entry.matchNumber === 74);
    const match78 = path.find((entry) => entry.matchNumber === 78);

    assert.equal(match74.homeTeam, 'Germany');
    assert.equal(match78.homeTeam, 'Ecuador');
    assert.equal(match78.awayTeam, 'Norway');
  });
});
