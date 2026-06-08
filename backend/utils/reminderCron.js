function parseReminderTime(reminderTime) {
  const match = String(reminderTime || '09:00').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return { hour: 9, minute: 0 };
  }
  const hour = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const minute = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  return { hour, minute };
}

function buildReminderCron(reminderTime, reminderFrequency = 'daily') {
  const { hour, minute } = parseReminderTime(reminderTime);
  if (reminderFrequency === 'weekly') {
    return `${minute} ${hour} * * 1`;
  }
  return `${minute} ${hour} * * *`;
}

module.exports = {
  parseReminderTime,
  buildReminderCron,
};
