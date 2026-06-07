const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveStadiumImageUrl,
  attachStadiumImage,
} = require('../../services/matchPresentationService');

describe('matchPresentationService', () => {
  it('resolves image from stadium name', () => {
    const url = resolveStadiumImageUrl({ stadium: 'MetLife Stadium' });
    assert.match(url, /MetLife_Stadium/);
  });

  it('falls back to WM 2026 schedule when stadium name is unknown', () => {
    const url = resolveStadiumImageUrl({
      homeTeam: 'Mexico',
      awayTeam: 'South Africa',
      stadium: 'Test Stadium',
    });
    assert.match(url, /Azteca_Stadium/);
  });

  it('returns null when neither stadium nor schedule match', () => {
    const url = resolveStadiumImageUrl({
      homeTeam: 'Deutschland',
      awayTeam: 'Frankreich',
      stadium: 'Test Stadium',
    });
    assert.equal(url, null);
  });

  it('attaches stadiumImageUrl to match payload', () => {
    const result = attachStadiumImage({
      id: 1,
      homeTeam: 'South Korea',
      awayTeam: 'Czechia',
      stadium: 'Unknown Arena',
    });
    assert.match(result.stadiumImageUrl, /Estadio_Akron/);
  });
});
