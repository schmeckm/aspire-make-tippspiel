const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeProgressOption,
  normalizeProgressOptions,
  CANONICAL_PROGRESS_OPTIONS,
} = require('../../utils/bonusProgressOptions');

describe('bonusProgressOptions', () => {
  it('normalizes legacy German labels to canonical keys', () => {
    assert.equal(normalizeProgressOption('Gruppenphase'), 'groupStage');
    assert.equal(normalizeProgressOption('Weltmeister'), 'champion');
  });

  it('keeps canonical keys unchanged', () => {
    for (const key of CANONICAL_PROGRESS_OPTIONS) {
      assert.equal(normalizeProgressOption(key), key);
    }
  });

  it('normalizes option arrays', () => {
    const result = normalizeProgressOptions(['Gruppenphase', 'Finale']);
    assert.deepEqual(result, ['groupStage', 'final']);
  });
});
