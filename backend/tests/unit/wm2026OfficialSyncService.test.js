const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isTestVenue } = require('../../services/wm2026OfficialSyncService');

describe('wm2026OfficialSyncService', () => {
  it('detects test venue placeholders', () => {
    assert.equal(isTestVenue({ stadium: 'Test Stadium', city: 'Test City' }), true);
    assert.equal(isTestVenue({ stadium: 'MetLife Stadium', city: 'East Rutherford' }), false);
  });
});
