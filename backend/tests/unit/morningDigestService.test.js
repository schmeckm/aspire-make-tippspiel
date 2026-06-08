const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  templateMorningDigest,
  buildUserDigestData,
  getDigestTimezone,
} = require('../../services/morningDigestService');

describe('morningDigestService', () => {
  const userDe = {
    id: 1,
    firstName: 'Max',
    email: 'max@example.com',
    language: 'de',
    teamId: 2,
    team: { name: 'Team A' },
  };

  const shared = {
    lastNightMatches: [{
      id: 10,
      homeTeam: 'Brasilien',
      awayTeam: 'Marokko',
      homeScore: 2,
      awayScore: 1,
      kickoffTime: new Date('2026-06-15T22:00:00Z'),
    }],
    todayMatches: [{
      homeTeam: 'Deutschland',
      awayTeam: 'USA',
      kickoffTime: new Date('2026-06-16T18:00:00Z'),
    }],
    topUsers: [{ rank: 1, firstName: 'Anna', lastName: 'Müller', totalPoints: 50 }],
    topTeams: [{ rank: 1, teamName: 'Team X', averagePoints: 40 }],
    leaderboard: [{ userId: 1, rank: 3, totalPoints: 42, firstName: 'Max', lastName: 'M' }],
    teamRanking: [{ teamId: 2, rank: 2, teamName: 'Team A', averagePoints: 35 }],
    yesterdayRanks: { 1: { rank: 5, totalPoints: 36 } },
    pointsEarned: new Map([[1, 6]]),
    ruleHighlights: [{
      key: 'matchOfNight',
      params: {
        homeTeam: 'Brasilien',
        awayTeam: 'Marokko',
        homeScore: 2,
        awayScore: 1,
        totalPoints: 24,
      },
    }],
    aiHighlights: {
      de: { content: 'Spannende Nacht im Tippspiel!', disclaimer: 'KI-Hinweis' },
    },
  };

  it('returns a configured digest timezone', () => {
    assert.ok(typeof getDigestTimezone() === 'string');
  });

  it('builds user digest data with rank delta and points earned', () => {
    const data = buildUserDigestData(userDe, shared);
    assert.equal(data.userEntry.rank, 3);
    assert.equal(data.rankDelta, 2);
    assert.equal(data.pointsEarned, 6);
    assert.equal(data.teamEntry.teamName, 'Team A');
  });

  it('builds branded morning digest in user language with all sections', () => {
    const userData = { ...buildUserDigestData(userDe, shared), missingCount: 2 };
    const tpl = templateMorningDigest(userDe, shared, userData);
    assert.match(tpl.subject, /Guten Morgen|WM-Update/i);
    assert.match(tpl.html, /Guten Morgen, Max!/);
    assert.match(tpl.html, /Brasilien 2:1 Marokko/);
    assert.match(tpl.html, /Top-Spieler/);
    assert.match(tpl.html, /Highlights/);
    assert.match(tpl.html, /KI-Rückblick/);
    assert.match(tpl.html, /Deutschland vs USA/);
    assert.match(tpl.html, /2 offene Tipps/);
    assert.match(tpl.text, /Max/);
  });

  it('builds english digest when user has no language', () => {
    const userEn = { firstName: 'Alex', email: 'alex@example.com', team: { name: 'Team B' } };
    const userData = {
      userEntry: { rank: 1, totalPoints: 10 },
      teamEntry: null,
      rankDelta: 0,
      pointsEarned: 0,
      pointsDelta: 0,
      missingCount: 0,
    };
    const tpl = templateMorningDigest(userEn, { ...shared, aiHighlights: {} }, userData);
    assert.match(tpl.subject, /Good morning/i);
    assert.match(tpl.html, /Good morning, Alex!/);
  });
});
