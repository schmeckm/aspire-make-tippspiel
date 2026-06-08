require('../helpers/testEnv');
const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { sequelize, User, Team, Match, ScoringRule } = require('../../models');
const { buildExcelWorkbook, buildExcelExportBuffer, collectExportData } = require('../../services/excelExportService');

describe('excelExportService', () => {
  before(async () => {
    await sequelize.sync({ force: true });
    const team = await Team.create({ name: 'IT' });
    await User.create({
      firstName: 'Excel',
      lastName: 'Tester',
      email: 'excel@test.local',
      password: 'test12345',
      role: 'user',
      teamId: team.id,
      emailVerified: true,
    });
    await ScoringRule.create({
      exactResultPoints: 4,
      goalDifferencePoints: 3,
      tendencyPoints: 2,
      wrongPredictionPoints: 0,
    });
    await Match.create({
      matchNumber: 1,
      stage: 'Group Stage',
      groupName: 'A',
      homeTeam: 'Germany',
      awayTeam: 'France',
      kickoffTime: new Date('2026-06-12T18:00:00.000Z'),
      status: 'scheduled',
    });
  });

  test('buildExcelWorkbook creates all expected sheets', async () => {
    const { workbook, meta } = await buildExcelWorkbook();
    const sheetNames = workbook.worksheets.map((sheet) => sheet.name);
    assert.deepEqual(sheetNames, [
      'Hitliste',
      'Teamwertung',
      'Spieltipps',
      'Bonustipps',
      'Bonusfragen',
      'Spiele',
      'Nutzer',
      'Punkte-Regeln',
    ]);
    assert.equal(meta.sheetCount, 8);
    assert.ok(meta.userCount >= 1);
    assert.ok(meta.matchCount >= 1);
  });

  test('collectExportData includes admins in leaderboard for emergency export', async () => {
    await User.create({
      firstName: 'Admin',
      lastName: 'Export',
      email: 'admin-export@test.local',
      password: 'test12345',
      role: 'admin',
      teamId: (await Team.findOne()).id,
      emailVerified: true,
    });

    const data = await collectExportData();
    const emails = data.leaderboard.map((entry) => entry.email);
    assert.ok(emails.includes('admin-export@test.local'));
    assert.equal(data.users.length, data.leaderboard.length);
  });

  test('buildExcelExportBuffer returns a valid xlsx file', async () => {
    const buffer = await buildExcelExportBuffer();
    assert.ok(buffer.byteLength > 1000);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const spiele = workbook.getWorksheet('Spiele');
    assert.equal(spiele.rowCount, 2);
    assert.equal(spiele.getRow(2).getCell(4).value, 'Germany');
  });
});
