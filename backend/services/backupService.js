const fs = require('fs');
const path = require('path');
const {
  sequelize,
  User,
  Team,
  Match,
  Prediction,
  BonusPrediction,
} = require('../models');

const BACKUP_VERSION = '1.0';
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
  USER_TOKEN_FIELDS.forEach((field) => delete data[field]);
  if (user.team?.name) data.teamName = user.team.name;
  return data;
}

function buildFilename() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `spieler-backup-${stamp}.json`;
}

async function collectPlayerData() {
  const [users, teams, predictions, bonusPredictions] = await Promise.all([
    User.findAll({
      include: [{ model: Team, as: 'team', attributes: ['name'] }],
      order: [['id', 'ASC']],
    }),
    Team.findAll({ order: [['id', 'ASC']] }),
    Prediction.findAll({ order: [['id', 'ASC']] }),
    BonusPrediction.findAll({ order: [['id', 'ASC']] }),
  ]);

  const userEmailById = Object.fromEntries(users.map((u) => [u.id, u.email]));

  const payload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      teams: teams.map((t) => t.toJSON()),
      users: users.map(sanitizeUser),
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
      predictionCount: predictions.length,
      bonusPredictionCount: bonusPredictions.length,
    },
  };

  return payload;
}

async function getBackupOverview() {
  const [userCount, teamCount, predictionCount, bonusPredictionCount] = await Promise.all([
    User.count(),
    Team.count(),
    Prediction.count(),
    BonusPrediction.count(),
  ]);

  return {
    current: {
      userCount,
      teamCount,
      predictionCount,
      bonusPredictionCount,
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
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        meta = content.meta || {};
      } catch {
        meta = {};
      }
      return {
        filename,
        size: stat.size,
        createdAt: stat.mtime.toISOString(),
        meta,
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function createBackupFile() {
  const payload = await collectPlayerData();
  ensureBackupDir();
  const filename = buildFilename();
  const filePath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  return { filename, payload };
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
  const { teams = [], users = [], predictions = [], bonusPredictions = [] } = backup.data;

  const summary = {
    teamsCreated: 0,
    teamsUpdated: 0,
    usersCreated: 0,
    usersUpdated: 0,
    predictionsRestored: 0,
    bonusPredictionsRestored: 0,
    skippedPredictions: 0,
    skippedBonusPredictions: 0,
  };

  await sequelize.transaction(async (transaction) => {
    const teamNameToId = {};

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

    const matchIds = new Set(
      (await Match.findAll({ attributes: ['id'], transaction })).map((m) => m.id)
    );

    for (const predictionData of predictions) {
      const userId = resolveUserId(predictionData);
      if (!userId || !matchIds.has(predictionData.matchId)) {
        summary.skippedPredictions += 1;
        continue;
      }

      const [prediction, created] = await Prediction.findOrCreate({
        where: { userId, matchId: predictionData.matchId },
        defaults: {
          predictedHomeScore: predictionData.predictedHomeScore,
          predictedAwayScore: predictionData.predictedAwayScore,
          points: predictionData.points ?? null,
          submittedAt: predictionData.submittedAt || new Date(),
        },
        transaction,
      });

      if (!created) {
        await prediction.update({
          predictedHomeScore: predictionData.predictedHomeScore,
          predictedAwayScore: predictionData.predictedAwayScore,
          points: predictionData.points ?? null,
          submittedAt: predictionData.submittedAt || prediction.submittedAt,
        }, { transaction });
      }

      summary.predictionsRestored += 1;
    }

    for (const bonusData of bonusPredictions) {
      const userId = resolveUserId(bonusData);
      if (!userId) {
        summary.skippedBonusPredictions += 1;
        continue;
      }

      const [bonusPrediction, created] = await BonusPrediction.findOrCreate({
        where: { userId, bonusQuestionId: bonusData.bonusQuestionId },
        defaults: {
          answerJson: bonusData.answerJson,
          points: bonusData.points ?? null,
          submittedAt: bonusData.submittedAt || new Date(),
        },
        transaction,
      });

      if (!created) {
        await bonusPrediction.update({
          answerJson: bonusData.answerJson,
          points: bonusData.points ?? null,
          submittedAt: bonusData.submittedAt || bonusPrediction.submittedAt,
        }, { transaction });
      }

      summary.bonusPredictionsRestored += 1;
    }
  });

  return summary;
}

module.exports = {
  BACKUP_DIR,
  collectPlayerData,
  getBackupOverview,
  listBackups,
  createBackupFile,
  readBackupFile,
  deleteBackupFile,
  restorePlayerData,
  buildFilename,
};
