const fs = require('fs');
const path = require('path');
const { applyRetention } = require('./backupRetentionService');
const {
  sequelize,
  User,
  Team,
  Match,
  Prediction,
  BonusPrediction,
  BonusQuestion,
  ScoringRule,
  Setting,
} = require('../models');

const BACKUP_VERSION = '1.1';
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

const USER_TOKEN_FIELDS = [
  'emailVerificationToken',
  'emailVerificationExpires',
  'passwordResetToken',
  'passwordResetExpires',
];

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function sanitizeUser(user) {
  const data = user.toJSON ? user.toJSON() : { ...user };
  delete data.password;
  USER_TOKEN_FIELDS.forEach((field) => delete data[field]);
  if (user.team?.name) data.teamName = user.team.name;
  return data;
}

function buildFilename() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `spieler-backup-${stamp}.json`;
}

function isPlayerBackupEnabled() {
  const val = process.env.PLAYER_DATA_BACKUP_ENABLED;
  if (val === undefined || val === '') return true;
  return !['0', 'false', 'no', 'off'].includes(String(val).toLowerCase());
}

function getPlayerBackupRetention() {
  const raw = parseInt(process.env.PLAYER_DATA_BACKUP_RETENTION || '168', 10);
  return Number.isFinite(raw) && raw >= 1 ? raw : 168;
}

async function collectPlayerData() {
  const [
    users,
    teams,
    matches,
    predictions,
    bonusPredictions,
    bonusQuestions,
    scoringRules,
    settings,
  ] = await Promise.all([
    User.findAll({
      include: [{ model: Team, as: 'team', attributes: ['name'] }],
      order: [['id', 'ASC']],
    }),
    Team.findAll({ order: [['id', 'ASC']] }),
    Match.findAll({ order: [['id', 'ASC']] }),
    Prediction.findAll({ order: [['id', 'ASC']] }),
    BonusPrediction.findAll({ order: [['id', 'ASC']] }),
    BonusQuestion.findAll({ order: [['id', 'ASC']] }),
    ScoringRule.findAll({ order: [['id', 'ASC']] }),
    Setting.findAll({ order: [['key', 'ASC']] }),
  ]);

  const userEmailById = Object.fromEntries(users.map((u) => [u.id, u.email]));

  const payload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      teams: teams.map((t) => t.toJSON()),
      users: users.map(sanitizeUser),
      matches: matches.map((m) => m.toJSON()),
      scoringRules: scoringRules.map((r) => r.toJSON()),
      settings: settings.map((s) => s.toJSON()),
      bonusQuestions: bonusQuestions.map((q) => q.toJSON()),
      predictions: predictions.map((p) => {
        const row = p.toJSON();
        row.userEmail = userEmailById[p.userId] || null;
        return row;
      }),
      bonusPredictions: bonusPredictions.map((bp) => {
        const row = bp.toJSON();
        row.userEmail = userEmailById[bp.userId] || null;
        return row;
      }),
    },
    meta: {
      userCount: users.length,
      teamCount: teams.length,
      matchCount: matches.length,
      predictionCount: predictions.length,
      bonusPredictionCount: bonusPredictions.length,
      bonusQuestionCount: bonusQuestions.length,
      settingCount: settings.length,
    },
  };

  return payload;
}

async function getBackupOverview() {
  const [
    userCount,
    teamCount,
    matchCount,
    predictionCount,
    bonusPredictionCount,
    bonusQuestionCount,
    settingCount,
  ] = await Promise.all([
    User.count(),
    Team.count(),
    Match.count(),
    Prediction.count(),
    BonusPrediction.count(),
    BonusQuestion.count(),
    Setting.count(),
  ]);

  return {
    current: {
      userCount,
      teamCount,
      matchCount,
      predictionCount,
      bonusPredictionCount,
      bonusQuestionCount,
      settingCount,
    },
    backups: listBackups(),
  };
}

function listBackups() {
  ensureBackupDir();
  return fs.readdirSync(BACKUP_DIR)
    .filter((name) => name.endsWith('.json'))
    .map((filename) => {
      const filePath = path.join(BACKUP_DIR, filename);
      const stat = fs.statSync(filePath);
      let meta = {};
      let exportedAt = null;
      let source = 'manual';
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        meta = content.meta || {};
        exportedAt = content.exportedAt || null;
        source = content.source || 'manual';
      } catch {
        meta = {};
      }
      const createdAt = exportedAt || stat.mtime.toISOString();
      return {
        filename,
        size: stat.size,
        createdAt,
        exportedAt: createdAt,
        source,
        meta,
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function createBackupFile(options = {}) {
  const source = options.source || 'manual';
  const payload = await collectPlayerData();
  payload.source = source;
  ensureBackupDir();
  const filename = buildFilename();
  const filePath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  return { filename, payload };
}

async function runScheduledPlayerBackup() {
  if (!isPlayerBackupEnabled()) {
    return { skipped: true, reason: 'disabled' };
  }

  const { filename, payload } = await createBackupFile({ source: 'auto' });
  const retention = applyRetention(BACKUP_DIR, {
    extension: '.json',
    prefix: 'spieler-backup-',
    keepCount: getPlayerBackupRetention(),
  });

  return {
    filename,
    exportedAt: payload.exportedAt,
    source: payload.source,
    meta: payload.meta,
    retention,
  };
}

function readBackupFile(filename) {
  if (!filename || filename.includes('..') || path.basename(filename) !== filename) {
    throw new Error('INVALID_BACKUP_FILE');
  }
  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) throw new Error('BACKUP_NOT_FOUND');
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function deleteBackupFile(filename) {
  if (!filename || filename.includes('..') || path.basename(filename) !== filename) {
    throw new Error('INVALID_BACKUP_FILE');
  }
  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) throw new Error('BACKUP_NOT_FOUND');
  fs.unlinkSync(filePath);
}

function validateBackupPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('INVALID_BACKUP');
  if (!payload.data || !Array.isArray(payload.data.users)) throw new Error('INVALID_BACKUP');
  return payload;
}

async function restorePlayerData(payload) {
  const backup = validateBackupPayload(payload);
  const {
    teams = [],
    users = [],
    matches = [],
    scoringRules = [],
    settings = [],
    bonusQuestions = [],
    predictions = [],
    bonusPredictions = [],
  } = backup.data;

  const summary = {
    teamsCreated: 0,
    teamsUpdated: 0,
    matchesCreated: 0,
    matchesUpdated: 0,
    settingsRestored: 0,
    scoringRulesRestored: 0,
    bonusQuestionsRestored: 0,
    usersCreated: 0,
    usersUpdated: 0,
    predictionsRestored: 0,
    preservedPredictions: 0,
    bonusPredictionsRestored: 0,
    preservedBonusPredictions: 0,
    skippedPredictions: 0,
    skippedBonusPredictions: 0,
  };

  await sequelize.transaction(async (transaction) => {
    const teamNameToId = {};
    const matchIdMap = {};
    const bonusQuestionIdMap = {};

    for (const teamData of teams) {
      const [team, created] = await Team.findOrCreate({
        where: { name: teamData.name },
        defaults: {
          description: teamData.description || null,
          imageUrl: teamData.imageUrl || null,
        },
        transaction,
      });

      if (!created) {
        await team.update({
          description: teamData.description || null,
          imageUrl: teamData.imageUrl || null,
        }, { transaction, hooks: false });
        summary.teamsUpdated += 1;
      } else {
        summary.teamsCreated += 1;
      }

      teamNameToId[team.name] = team.id;
    }

    for (const matchData of matches) {
      const {
        id: oldId,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        ...fields
      } = matchData;

      const [match, created] = await Match.findOrCreate({
        where: { matchNumber: matchData.matchNumber },
        defaults: fields,
        transaction,
      });

      if (!created) {
        await match.update(fields, { transaction, hooks: false });
        summary.matchesUpdated += 1;
      } else {
        summary.matchesCreated += 1;
      }

      if (oldId != null) matchIdMap[oldId] = match.id;
    }

    for (const settingData of settings) {
      const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = settingData;
      const [setting] = await Setting.findOrCreate({
        where: { key: fields.key },
        defaults: fields,
        transaction,
      });
      await setting.update(fields, { transaction, hooks: false });
      summary.settingsRestored += 1;
    }

    for (const ruleData of scoringRules) {
      const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = ruleData;
      const existing = await ScoringRule.findOne({ transaction });
      if (existing) {
        await existing.update(fields, { transaction, hooks: false });
      } else {
        await ScoringRule.create(fields, { transaction, hooks: false });
      }
      summary.scoringRulesRestored += 1;
    }

    for (const questionData of bonusQuestions) {
      const {
        id: oldId,
        createdAt: _c,
        updatedAt: _u,
        ...fields
      } = questionData;

      let question;
      const existing = oldId != null
        ? await BonusQuestion.findByPk(oldId, { transaction })
        : null;

      if (existing) {
        await existing.update(fields, { transaction, hooks: false });
        question = existing;
      } else {
        question = await BonusQuestion.create(fields, { transaction, hooks: false });
      }

      if (oldId != null) bonusQuestionIdMap[oldId] = question.id;
      summary.bonusQuestionsRestored += 1;
    }

    const emailToUserId = {};
    const oldUserIdToEmail = Object.fromEntries(
      users.filter((u) => u.id && u.email).map((u) => [u.id, u.email])
    );

    for (const userData of users) {
      const {
        id: _id,
        team,
        teamName,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        ...fields
      } = userData;

      USER_TOKEN_FIELDS.forEach((field) => delete fields[field]);

      const resolvedTeamName = teamName || team?.name;
      if (resolvedTeamName && teamNameToId[resolvedTeamName]) {
        fields.teamId = teamNameToId[resolvedTeamName];
      } else if (!resolvedTeamName) {
        fields.teamId = null;
      }

      const existing = await User.findOne({
        where: { email: fields.email },
        transaction,
      });

      if (existing) {
        await existing.update(fields, { transaction, hooks: false });
        emailToUserId[fields.email] = existing.id;
        summary.usersUpdated += 1;
      } else {
        const createdUser = await User.create(fields, { transaction, hooks: false });
        emailToUserId[fields.email] = createdUser.id;
        summary.usersCreated += 1;
      }
    }

    const resolveUserId = (row) => {
      if (row.userEmail && emailToUserId[row.userEmail]) {
        return emailToUserId[row.userEmail];
      }
      if (row.userId && oldUserIdToEmail[row.userId]) {
        const email = oldUserIdToEmail[row.userId];
        return emailToUserId[email] || null;
      }
      return null;
    };

    const resolveMatchId = (matchId) => matchIdMap[matchId] || matchId;

    const matchIds = new Set(
      (await Match.findAll({ attributes: ['id'], transaction })).map((m) => m.id)
    );

    for (const predictionData of predictions) {
      const userId = resolveUserId(predictionData);
      const matchId = resolveMatchId(predictionData.matchId);
      if (!userId || !matchIds.has(matchId)) {
        summary.skippedPredictions += 1;
        continue;
      }

      const [prediction, created] = await Prediction.findOrCreate({
        where: { userId, matchId },
        defaults: {
          predictedHomeScore: predictionData.predictedHomeScore,
          predictedAwayScore: predictionData.predictedAwayScore,
          points: predictionData.points ?? null,
          submittedAt: predictionData.submittedAt || new Date(),
        },
        transaction,
      });

      if (!created) {
        summary.preservedPredictions += 1;
        continue;
      }

      summary.predictionsRestored += 1;
    }

    for (const bonusData of bonusPredictions) {
      const userId = resolveUserId(bonusData);
      const bonusQuestionId = bonusQuestionIdMap[bonusData.bonusQuestionId]
        || bonusData.bonusQuestionId;
      if (!userId) {
        summary.skippedBonusPredictions += 1;
        continue;
      }

      const [bonusPrediction, created] = await BonusPrediction.findOrCreate({
        where: { userId, bonusQuestionId },
        defaults: {
          answerJson: bonusData.answerJson,
          points: bonusData.points ?? null,
          submittedAt: bonusData.submittedAt || new Date(),
        },
        transaction,
      });

      if (!created) {
        summary.preservedBonusPredictions += 1;
        continue;
      }

      summary.bonusPredictionsRestored += 1;
    }
  });

  try {
    const { invalidateLeaderboardCache } = require('./leaderboardService');
    invalidateLeaderboardCache();
  } catch {
    // ignore
  }

  return summary;
}

module.exports = {
  BACKUP_DIR,
  collectPlayerData,
  getBackupOverview,
  listBackups,
  createBackupFile,
  runScheduledPlayerBackup,
  readBackupFile,
  deleteBackupFile,
  restorePlayerData,
  buildFilename,
  isPlayerBackupEnabled,
  getPlayerBackupRetention,
};
