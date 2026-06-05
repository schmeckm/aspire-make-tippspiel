const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  templateMissingPredictions,
  buildMissingPredictionsNotification,
} = require('../../services/reminderEmailService');

describe('reminderEmailService', () => {
  const userDe = { firstName: 'Max', email: 'max@example.com', language: 'de' };
  const userEn = { firstName: 'Jane', email: 'jane@example.com', language: 'en' };
  const matches = [{
    homeTeam: 'Germany',
    awayTeam: 'France',
    kickoffTime: new Date('2026-06-15T18:00:00Z'),
  }];

  it('uses German copy for de users', () => {
    const tpl = templateMissingPredictions(userDe, 3, matches);
    assert.match(tpl.subject, /fehlende Tipps/i);
    assert.match(tpl.html, /Hallo Max!/);
    assert.match(tpl.html, /Jetzt tippen/);
    assert.match(tpl.text, /3/);
  });

  it('uses English copy for en users', () => {
    const tpl = templateMissingPredictions(userEn, 5, matches);
    assert.match(tpl.subject, /missing predictions/i);
    assert.match(tpl.html, /Hello Jane!/);
    assert.match(tpl.html, /Submit predictions now/);
  });

  it('builds localized in-app notification', () => {
    const de = buildMissingPredictionsNotification(userDe, 2);
    const en = buildMissingPredictionsNotification(userEn, 2);
    assert.match(de.title, /Fehlende Tipps/i);
    assert.match(en.title, /Missing predictions/i);
    assert.match(de.message, /2/);
    assert.match(en.message, /2/);
  });
});
