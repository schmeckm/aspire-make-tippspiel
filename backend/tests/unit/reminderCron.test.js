const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildReminderCron, parseReminderTime } = require('../../utils/reminderCron');

describe('reminderCron', () => {
  it('parses reminder time', () => {
    assert.deepEqual(parseReminderTime('08:30'), { hour: 8, minute: 30 });
    assert.deepEqual(parseReminderTime('invalid'), { hour: 9, minute: 0 });
  });

  it('builds daily and weekly cron expressions', () => {
    assert.equal(buildReminderCron('09:00', 'daily'), '0 9 * * *');
    assert.equal(buildReminderCron('08:30', 'daily'), '30 8 * * *');
    assert.equal(buildReminderCron('09:00', 'weekly'), '0 9 * * 1');
  });
});
