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
}

module.exports = { runMigrations, ensureColumn };
