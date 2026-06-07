const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { computeSummary, mapAggregatesToSummary } = require('../../services/headToHeadService');
const { findHistoricalHeadToHead } = require('../../data/wcHistoricalHeadToHead');

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
      breakdownAvailable: true,
    });
  });
});

describe('headToHeadService.mapAggregatesToSummary', () => {
  test('maps aggregate wins relative to reference home team', () => {
    const summary = mapAggregatesToSummary(
      {
        numberOfMatches: 3,
        totalGoals: 5,
        homeTeam: { name: 'Mexico', wins: 2, draws: 0, losses: 1 },
        awayTeam: { name: 'South Africa', wins: 1, draws: 0, losses: 2 },
      },
      'Mexico',
      'South Africa',
      'Mexico',
      'South Africa',
    );
    assert.deepEqual(summary, {
      totalMatches: 3,
      totalGoals: 5,
      teamAWins: 2,
      teamBWins: 1,
      draws: 0,
      breakdownAvailable: true,
    });
  });

  test('marks breakdown unavailable when free tier zeroes win stats', () => {
    const summary = mapAggregatesToSummary(
      {
        numberOfMatches: 1,
        totalGoals: 1,
        homeTeam: { id: 773, name: 'France', wins: 0, draws: 0, losses: 0 },
        awayTeam: { id: 804, name: 'Senegal', wins: 0, draws: 0, losses: 0 },
      },
      'France',
      'Senegal',
      'France',
      'Senegal',
    );
    assert.deepEqual(summary, {
      totalMatches: 1,
      totalGoals: 1,
      teamAWins: 0,
      teamBWins: 0,
      draws: 0,
      breakdownAvailable: false,
    });
  });

  test('infers wins from opponent losses when wins are missing', () => {
    const summary = mapAggregatesToSummary(
      {
        numberOfMatches: 1,
        totalGoals: 1,
        homeTeam: { name: 'France', wins: 0, draws: 0, losses: 1 },
        awayTeam: { name: 'Senegal', wins: 0, draws: 0, losses: 0 },
      },
      'France',
      'Senegal',
      'France',
      'Senegal',
    );
    assert.deepEqual(summary, {
      totalMatches: 1,
      totalGoals: 1,
      teamAWins: 0,
      teamBWins: 1,
      draws: 0,
      breakdownAvailable: true,
    });
  });
});

describe('wcHistoricalHeadToHead.findHistoricalHeadToHead', () => {
  test('returns Germany vs Argentina World Cup meetings', () => {
    const result = findHistoricalHeadToHead('Germany', 'Argentina');
    assert.ok(result);
    assert.equal(result.meetings.length, 6);
    assert.ok(result.meetings.some((m) => m.stage === 'FINAL' && m.seasonYear === 2014));
  });

  test('matches team names regardless of order', () => {
    const result = findHistoricalHeadToHead('Argentina', 'Germany');
    assert.ok(result);
    assert.equal(result.meetings.length, 6);
  });

  test('returns null for unknown pairings', () => {
    assert.equal(findHistoricalHeadToHead('Germany', 'Mexico'), null);
  });
});
