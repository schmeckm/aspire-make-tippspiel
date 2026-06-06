const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { resolveVenueFromWm2026Schedule, teamsMatch } = require('../../data/wm2026ScheduleLookup');

describe('wm2026ScheduleLookup', () => {
  it('matches German Wikipedia team names to venues', () => {
    const venue = resolveVenueFromWm2026Schedule('Iran', 'New Zealand');
    assert.equal(venue.city, 'Inglewood');
    assert.equal(venue.stadium, 'SoFi Stadium');
  });

  it('resolves opening match venue', () => {
    const venue = resolveVenueFromWm2026Schedule('Mexico', 'South Africa');
    assert.equal(venue.stadium, 'Estadio Azteca');
    assert.equal(venue.city, 'Mexico City');
  });

  it('matches alias groups across languages', () => {
    assert.equal(teamsMatch('Südkorea', 'South Korea'), true);
    assert.equal(teamsMatch('Tschechien', 'Czechia'), true);
  });
});
