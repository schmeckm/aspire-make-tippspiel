const { isEmailConfigured } = require('./emailService');
const { getSetting, setSetting } = require('./settingsService');

function readEnvFlag(name) {
  const value = String(process.env[name] || '').trim().toLowerCase();
  if (value === 'true' || value === '1' || value === 'yes') return true;
  if (value === 'false' || value === '0' || value === 'no') return false;
  return null;
}

async function isEmailRemindersEnabled() {
  if (!isEmailConfigured()) return false;

  const envOverride = readEnvFlag('EMAIL_REMINDERS_ENABLED');
  if (envOverride === false) return false;
  if (envOverride === true) return true;

  return getSetting('emailRemindersEnabled', true);
}

async function ensureAutomaticEmailReminders() {
  if (!isEmailConfigured()) {
    console.log('[Email] SMTP nicht konfiguriert – automatische Erinnerungen warten auf SMTP.');
    return { enabled: false, reason: 'smtp_missing' };
  }

  const envOverride = readEnvFlag('EMAIL_REMINDERS_ENABLED');
  if (envOverride === false) {
    return { enabled: false, reason: 'env_disabled' };
  }

  const alreadyEnabled = await getSetting('emailRemindersEnabled', true);
  if (alreadyEnabled) {
    return { enabled: true, reason: 'already_enabled' };
  }

  const autoEnable = envOverride === true
    || process.env.NODE_ENV === 'production'
    || readEnvFlag('EMAIL_REMINDERS_AUTO_ENABLE') === true;

  if (!autoEnable) {
    return { enabled: false, reason: 'awaiting_admin_toggle' };
  }

  await setSetting('emailRemindersEnabled', true);
  console.log('[Email] SMTP bereit – E-Mail-Erinnerungen automatisch aktiviert.');
  return { enabled: true, reason: 'auto_enabled' };
}

async function isMorningDigestEnabled() {
  if (!isEmailConfigured()) return false;

  const envOverride = readEnvFlag('MORNING_DIGEST_ENABLED');
  if (envOverride === false) return false;
  if (envOverride === true) return true;

  return getSetting('morningDigestEnabled', true);
}

function affectsReminderSchedule(updates = {}) {
  const keys = [
    'emailRemindersEnabled',
    'reminderTime',
    'reminderFrequency',
    'morningDigestEnabled',
    'morningDigestTime',
  ];
  return keys.some((key) => Object.prototype.hasOwnProperty.call(updates, key));
}

module.exports = {
  isEmailRemindersEnabled,
  isMorningDigestEnabled,
  ensureAutomaticEmailReminders,
  affectsReminderSchedule,
};
