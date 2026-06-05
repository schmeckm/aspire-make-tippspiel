const sequelize = require('../database');
const User = require('./User');
const Team = require('./Team');
const Match = require('./Match');
const Prediction = require('./Prediction');
const ScoringRule = require('./ScoringRule');
const Setting = require('./Setting');
const BonusQuestion = require('./BonusQuestion');
const BonusPrediction = require('./BonusPrediction');
const Notification = require('./Notification');
const AuditLog = require('./AuditLog');
const SyncLog = require('./SyncLog');
const LeaderboardSnapshot = require('./LeaderboardSnapshot');
const AICommentary = require('./AICommentary');
const AIInteractionLog = require('./AIInteractionLog');
const PlayerImage = require('./PlayerImage');

Team.hasMany(User, { foreignKey: 'teamId', as: 'users', onDelete: 'SET NULL' });
User.belongsTo(Team, { foreignKey: 'teamId', as: 'team', onDelete: 'SET NULL' });

User.hasMany(Prediction, { foreignKey: 'userId', as: 'predictions', onDelete: 'CASCADE' });
Prediction.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

Match.hasMany(Prediction, { foreignKey: 'matchId', as: 'predictions', onDelete: 'CASCADE' });
Prediction.belongsTo(Match, { foreignKey: 'matchId', as: 'match', onDelete: 'CASCADE' });

User.hasMany(BonusPrediction, { foreignKey: 'userId', as: 'bonusPredictions', onDelete: 'CASCADE' });
BonusPrediction.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

BonusQuestion.hasMany(BonusPrediction, { foreignKey: 'bonusQuestionId', as: 'predictions', onDelete: 'CASCADE' });
BonusPrediction.belongsTo(BonusQuestion, { foreignKey: 'bonusQuestionId', as: 'bonusQuestion', onDelete: 'CASCADE' });

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs', onDelete: 'SET NULL' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'SET NULL' });

User.hasMany(LeaderboardSnapshot, { foreignKey: 'userId', as: 'snapshots', onDelete: 'CASCADE' });
LeaderboardSnapshot.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

User.hasMany(AICommentary, { foreignKey: 'userId', as: 'aiCommentaries', onDelete: 'SET NULL' });
AICommentary.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'SET NULL' });
Match.hasMany(AICommentary, { foreignKey: 'matchId', as: 'aiCommentaries', onDelete: 'CASCADE' });
AICommentary.belongsTo(Match, { foreignKey: 'matchId', as: 'match', onDelete: 'CASCADE' });

User.hasMany(AIInteractionLog, { foreignKey: 'userId', as: 'aiInteractions', onDelete: 'SET NULL' });
AIInteractionLog.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'SET NULL' });

module.exports = {
  sequelize,
  User,
  Team,
  Match,
  Prediction,
  ScoringRule,
  Setting,
  BonusQuestion,
  BonusPrediction,
  Notification,
  AuditLog,
  SyncLog,
  LeaderboardSnapshot,
  AICommentary,
  AIInteractionLog,
  PlayerImage,
};
