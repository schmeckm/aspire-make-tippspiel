const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { computeSummary } = require('../../services/headToHeadService');

describe('headToHeadService.computeSummary', () => {
  test('counts wins from team A home and away perspective', () => {
    const meetings = [
      {
        homeTeam: 'Germany',
        awayTeam: 'France',
        homeScore: 2,
        awayScore: 1,
        winner: 'home',
      },
      {
        homeTeam: 'France',
        awayTeam: 'Germany',
        homeScore: 0,
        awayScore: 0,
        winner: 'draw',
      },
      {
        homeTeam: 'France',
        awayTeam: 'Germany',
        homeScore: 1,
        awayScore: 0,
        winner: 'home',
      },
    ];

    const summary = computeSummary(meetings, 'Germany', 'France');
    assert.deepEqual(summary, {
      totalMatches: 3,
      totalGoals: 4,
      teamAWins: 1,
      teamBWins: 1,
      draws: 1,
    });
  });
});
