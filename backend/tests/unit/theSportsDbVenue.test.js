const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { teamsMatch, findMatchingEvent } = require('../../services/theSportsDbVenueService');

describe('theSportsDbVenueService', () => {
  it('matches team name aliases', () => {
    assert.equal(teamsMatch('Czechia', 'Czech Republic'), true);
    assert.equal(teamsMatch('South Korea', 'Korea Republic'), true);
    assert.equal(teamsMatch('Germany', 'France'), false);
  });

  it('finds event by date and teams', () => {
    const events = [{
      dateEvent: '2026-06-12',
      strHomeTeam: 'South Korea',
      strAwayTeam: 'Czech Republic',
      strVenue: 'Estadio Akron',
      strCountry: 'Mexico',
    }];
    const match = {
      homeTeam: 'South Korea',
      awayTeam: 'Czechia',
      kickoffTime: new Date('2026-06-12T02:00:00Z'),
    };
    const found = findMatchingEvent(events, match);
    assert.equal(found?.strVenue, 'Estadio Akron');
    assert.equal(found?.strCountry, 'Mexico');
  });
});
