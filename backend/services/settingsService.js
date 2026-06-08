const { Setting } = require('../models');

const DEFAULT_SETTINGS = {
  appTitle: 'WM 2026 Tippspiel',
  registrationEnabled: true,
  showPredictionsBeforeKickoff: true,
  showPredictionsAfterKickoff: false,
  apiSyncEnabled: true,
  resultSyncEnabled: true,
  footballApiProvider: null,
  emailRemindersEnabled: true,
  leaderboardPublic: false,
  bonusQuestionsEnabled: true,
  liveScoresEnabled: true,
  defaultTimezone: 'Europe/Berlin',
  reminderTime: '09:00',
  tournamentStartDate: '2026-06-11',
  tournamentEndDate: '2026-07-19',
  openRegistration: true,
  adminSyncErrorEmails: true,
  reminderFrequency: 'daily',
  morningDigestEnabled: true,
  morningDigestTime: '07:30',
  lastDigestSentDate: null,
  reminderEmailSubject: '',
  reminderEmailBody: '',
  reminderNotificationText: '',
  requireTeamOnRegistration: true,
  requireEmailVerification: true,
  includeAdminsInLeaderboard: false,
  displayModeEnabled: true,
  prizesEnabled: false,
  prizes: [
    { rank: 1, title: '1. Platz', description: '', value: '', imageUrl: '' },
    { rank: 2, title: '2. Platz', description: '', value: '', imageUrl: '' },
    { rank: 3, title: '3. Platz', description: '', value: '', imageUrl: '' },
  ],
};

const PUBLIC_SETTING_KEYS = new Set([
  'appTitle',
  'registrationEnabled',
  'openRegistration',
  'bonusQuestionsEnabled',
  'requireTeamOnRegistration',
  'requireEmailVerification',
  'tournamentStartDate',
  'tournamentEndDate',
  'defaultTimezone',
  'prizesEnabled',
  'prizes',
  'leaderboardPublic',
  'showPredictionsBeforeKickoff',
  'showPredictionsAfterKickoff',
]);

function sanitizePrizeImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!/^\/uploads\/prizes\/prize-[123]\.(jpg|jpeg|png|webp|gif)$/i.test(trimmed)) return '';
  return trimmed.slice(0, 255);
}

function normalizePrizes(prizes) {
  if (!Array.isArray(prizes)) return DEFAULT_SETTINGS.prizes;
  return [1, 2, 3].map((rank) => {
    const entry = prizes.find((p) => Number(p.rank) === rank) || {};
    return {
      rank,
      title: String(entry.title || '').trim().slice(0, 100),
      description: String(entry.description || '').trim().slice(0, 500),
      value: String(entry.value || '').trim().slice(0, 100),
      imageUrl: sanitizePrizeImageUrl(entry.imageUrl),
    };
  });
}

async function getSetting(key, defaultValue = null) {
  const setting = await Setting.findOne({ where: { key } });
  if (!setting) return defaultValue ?? DEFAULT_SETTINGS[key] ?? null;

  if (setting.valueJson) {
    try {
      return JSON.parse(setting.valueJson);
    } catch {
      return setting.valueJson;
    }
  }
  if (setting.value === 'true') return true;
  if (setting.value === 'false') return false;
  return setting.value ?? defaultValue;
}

async function setSetting(key, value) {
  const isObject = typeof value === 'object' && value !== null;
  const useJsonStorage = isObject || (typeof value === 'string' && value.length > 255);
  const jsonValue = useJsonStorage ? JSON.stringify(value) : null;
  const stringValue = useJsonStorage
    ? null
    : (typeof value === 'boolean' ? String(value) : (typeof value === 'string' ? value : String(value)));

  const [setting] = await Setting.findOrCreate({
    where: { key },
    defaults: { value: stringValue, valueJson: jsonValue },
  });

  await setting.update({
    value: stringValue,
    valueJson: jsonValue,
  });

  if (key === 'includeAdminsInLeaderboard') {
    try {
      const { invalidateLeaderboardCache } = require('./leaderboardService');
      invalidateLeaderboardCache();
    } catch {
      // ignore during startup
    }
  }

  return value;
}

async function getAllSettings() {
  const result = { ...DEFAULT_SETTINGS };
  const settings = await Setting.findAll();
  for (const s of settings) {
    if (s.valueJson) {
      try {
        result[s.key] = JSON.parse(s.valueJson);
      } catch {
        result[s.key] = s.valueJson;
      }
    } else if (s.value === 'true') {
      result[s.key] = true;
    } else if (s.value === 'false') {
      result[s.key] = false;
    } else {
      result[s.key] = s.value;
    }
  }
  return result;
}

async function getPublicSettings() {
  const all = await getAllSettings();
  const result = {};
  for (const key of PUBLIC_SETTING_KEYS) {
    if (all[key] !== undefined) result[key] = all[key];
  }
  return result;
}

async function updateSettings(updates) {
  const allowedKeys = Object.keys(DEFAULT_SETTINGS);
  const filtered = {};
  const rejected = [];

  const booleanKeys = new Set([
    'registrationEnabled', 'showPredictionsBeforeKickoff', 'showPredictionsAfterKickoff',
    'apiSyncEnabled', 'resultSyncEnabled', 'emailRemindersEnabled', 'leaderboardPublic',
    'bonusQuestionsEnabled', 'liveScoresEnabled', 'openRegistration', 'adminSyncErrorEmails',
    'requireTeamOnRegistration', 'requireEmailVerification', 'includeAdminsInLeaderboard',
    'displayModeEnabled', 'prizesEnabled', 'morningDigestEnabled',
  ]);

  for (const [key, value] of Object.entries(updates || {})) {
    if (!allowedKeys.includes(key)) {
      rejected.push(key);
      continue;
    }
    if (booleanKeys.has(key) && typeof value !== 'boolean') {
      rejected.push(key);
      continue;
    }
    filtered[key] = key === 'prizes' ? normalizePrizes(value) : value;
  }

  for (const [key, value] of Object.entries(filtered)) {
    await setSetting(key, value);
  }

  const result = await getAllSettings();
  if (rejected.length > 0) {
    result._rejectedKeys = rejected;
  }
  return result;
}

async function seedDefaultSettings() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    const existing = await Setting.findOne({ where: { key } });
    if (!existing) {
      await setSetting(key, value);
    }
  }
}

module.exports = {
  DEFAULT_SETTINGS,
  PUBLIC_SETTING_KEYS,
  getSetting,
  setSetting,
  getAllSettings,
  getPublicSettings,
  updateSettings,
  seedDefaultSettings,
  normalizePrizes,
  sanitizePrizeImageUrl,
};
