const { DataTypes } = require('sequelize');

async function ensureColumn(queryInterface, tableInfo, tableName, columnName, columnSpec) {
  if (!tableInfo[columnName]) {
    await queryInterface.addColumn(tableName, columnName, columnSpec);
    console.log(`Migration: Spalte ${tableName}.${columnName} hinzugefügt.`);
    tableInfo[columnName] = columnSpec;
  }
}

const USER_COLUMNS = [
  { name: 'emailVerified', spec: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true } },
  { name: 'emailVerificationToken', spec: { type: DataTypes.STRING, allowNull: true } },
  { name: 'emailVerificationExpires', spec: { type: DataTypes.DATE, allowNull: true } },
  { name: 'passwordResetToken', spec: { type: DataTypes.STRING, allowNull: true } },
  { name: 'passwordResetExpires', spec: { type: DataTypes.DATE, allowNull: true } },
  { name: 'imageUrl', spec: { type: DataTypes.STRING, allowNull: true } },
  { name: 'avatarColor', spec: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'default' } },
  { name: 'avatarEmoji', spec: { type: DataTypes.STRING(16), allowNull: true } },
  { name: 'authProvider', spec: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'local' } },
  { name: 'providerId', spec: { type: DataTypes.STRING, allowNull: true } },
  { name: 'totpEnabled', spec: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false } },
  { name: 'totpSecret', spec: { type: DataTypes.STRING, allowNull: true } },
  { name: 'language', spec: { type: DataTypes.STRING(5), allowNull: false, defaultValue: 'de' } },
  { name: 'favoriteNationalTeamId', spec: { type: DataTypes.INTEGER, allowNull: true } },
  { name: 'favoriteNationalTeamName', spec: { type: DataTypes.STRING, allowNull: true } },
  { name: 'topScorerPlayerId', spec: { type: DataTypes.INTEGER, allowNull: true } },
  { name: 'topScorerPlayerName', spec: { type: DataTypes.STRING, allowNull: true } },
];

async function runMigrations(sequelize) {
  const queryInterface = sequelize.getQueryInterface();
  const q = (identifier) => queryInterface.queryGenerator.quoteIdentifier(identifier);
  const dialect = sequelize.getDialect();
  const trueVal = dialect === 'postgres' ? 'true' : '1';
  const falseVal = dialect === 'postgres' ? 'false' : '0';
  let userTableInfo;

  try {
    userTableInfo = await queryInterface.describeTable('Users');
  } catch {
    return;
  }

  for (const col of USER_COLUMNS) {
    await ensureColumn(queryInterface, userTableInfo, 'Users', col.name, col.spec);
  }

  await sequelize.query(
    `UPDATE ${q('Users')} SET ${q('emailVerified')} = ${trueVal} WHERE ${q('emailVerified')} IS NULL OR (${q('emailVerified')} = ${falseVal} AND ${q('emailVerificationToken')} IS NULL)`,
  );

  let teamTableInfo;
  try {
    teamTableInfo = await queryInterface.describeTable('Teams');
  } catch {
    return;
  }

  await ensureColumn(queryInterface, teamTableInfo, 'Teams', 'imageUrl', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  let playerImageTableInfo;
  try {
    playerImageTableInfo = await queryInterface.describeTable('PlayerImages');
  } catch {
    return;
  }

  const countryCodeColumn = playerImageTableInfo.countryCode;
  if (countryCodeColumn && /\(3\)/.test(String(countryCodeColumn.type || ''))) {
    await queryInterface.changeColumn('PlayerImages', 'countryCode', {
      type: DataTypes.STRING(64),
      allowNull: true,
    });
    console.log('Migration: PlayerImages.countryCode auf VARCHAR(64) erweitert.');
  }

  await widenPlayerImageTextColumns(queryInterface, playerImageTableInfo);

  await fixPlayerImagesUniqueIndexes(sequelize, queryInterface, playerImageTableInfo);

  let aiCommentaryTableInfo;
  try {
    aiCommentaryTableInfo = await queryInterface.describeTable('AICommentaries');
  } catch {
    return;
  }

  await ensureColumn(queryInterface, aiCommentaryTableInfo, 'AICommentaries', 'language', {
    type: DataTypes.STRING(5),
    allowNull: false,
    defaultValue: 'de',
  });

  let bonusQuestionTableInfo;
  try {
    bonusQuestionTableInfo = await queryInterface.describeTable('BonusQuestions');
  } catch {
    return;
  }

  await ensureColumn(queryInterface, bonusQuestionTableInfo, 'BonusQuestions', 'resolutionKey', {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  });

  await ensureIndexes(queryInterface);
}

function isBoundedVarcharColumn(columnInfo) {
  const type = String(columnInfo?.type || '').toLowerCase();
  if (type.includes('text')) return false;
  return /varchar|character varying|string/i.test(type);
}

async function widenPlayerImageTextColumns(queryInterface, tableInfo) {
  const textColumns = [
    { name: 'imageUrl', spec: { type: DataTypes.TEXT, allowNull: true } },
    { name: 'sourceId', spec: { type: DataTypes.TEXT, allowNull: true } },
    { name: 'licenseInfo', spec: { type: DataTypes.TEXT, allowNull: true } },
    { name: 'attributionText', spec: { type: DataTypes.TEXT, allowNull: true } },
  ];

  for (const column of textColumns) {
    const current = tableInfo[column.name];
    if (!current || !isBoundedVarcharColumn(current)) continue;
    await queryInterface.changeColumn('PlayerImages', column.name, column.spec);
    console.log(`Migration: PlayerImages.${column.name} auf TEXT erweitert.`);
    tableInfo[column.name] = column.spec;
  }
}

async function fixPlayerImagesUniqueIndexes(sequelize, queryInterface, tableInfo) {
  const hasColumnUnique = tableInfo.playerName?.unique || tableInfo.teamName?.unique;
  if (!hasColumnUnique) return;

  const dialect = sequelize.getDialect();
  if (dialect === 'sqlite') {
    await sequelize.query(`
      CREATE TABLE PlayerImages_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playerName VARCHAR(255) NOT NULL,
        teamName VARCHAR(255),
        countryCode VARCHAR(64),
        imageUrl TEXT,
        source VARCHAR(64) NOT NULL DEFAULT 'placeholder',
        sourceId TEXT,
        licenseInfo TEXT,
        attributionText TEXT,
        lastCheckedAt DATETIME,
        isManuallyApproved TINYINT(1) NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
      )
    `);
    await sequelize.query(`
      INSERT INTO PlayerImages_new (
        id, playerName, teamName, countryCode, imageUrl, source, sourceId,
        licenseInfo, attributionText, lastCheckedAt, isManuallyApproved, createdAt, updatedAt
      )
      SELECT
        id, playerName, teamName, countryCode, imageUrl, source, sourceId,
        licenseInfo, attributionText, lastCheckedAt, isManuallyApproved, createdAt, updatedAt
      FROM PlayerImages
    `);
    await sequelize.query('DROP TABLE PlayerImages');
    await sequelize.query('ALTER TABLE PlayerImages_new RENAME TO PlayerImages');
  } else {
    await queryInterface.changeColumn('PlayerImages', 'playerName', {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
    });
    await queryInterface.changeColumn('PlayerImages', 'teamName', {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
    });
  }

  await ensureIndexSafe(queryInterface, 'PlayerImages', ['playerName', 'teamName'], {
    unique: true,
    name: 'player_images_player_name_team_name',
  });
  console.log('Migration: PlayerImages unique indexes auf (playerName, teamName) korrigiert.');
}

async function ensureIndexSafe(queryInterface, tableName, fields, options = {}) {
  try {
    await queryInterface.addIndex(tableName, fields, options);
    console.log(`Migration: Index ${tableName}(${fields.join(', ')}) hinzugefügt.`);
  } catch (error) {
    if (!/already exists|duplicate/i.test(error.message)) {
      console.warn(`Migration: Index ${tableName}(${fields.join(', ')}) übersprungen: ${error.message}`);
    }
  }
}

async function ensureIndexes(queryInterface) {
  await ensureIndexSafe(queryInterface, 'Predictions', ['userId']);
  await ensureIndexSafe(queryInterface, 'Notifications', ['userId', 'isRead', 'createdAt']);
  await ensureIndexSafe(queryInterface, 'LeaderboardSnapshots', ['snapshotTime']);
  await ensureIndexSafe(queryInterface, 'LeaderboardSnapshots', ['userId', 'snapshotTime']);
  await ensureIndexSafe(queryInterface, 'SyncLogs', ['startedAt']);
  await ensureIndexSafe(queryInterface, 'SyncLogs', ['syncType', 'status', 'startedAt']);
  await ensureIndexSafe(queryInterface, 'Users', ['authProvider', 'providerId'], {
    unique: true,
    name: 'users_auth_provider_id_unique',
  });
}

module.exports = { runMigrations, ensureColumn };
