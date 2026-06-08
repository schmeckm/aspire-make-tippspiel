const ExcelJS = require('exceljs');
const {
  User,
  Team,
  Match,
  Prediction,
  BonusPrediction,
  BonusQuestion,
  ScoringRule,
} = require('../models');
const { getLeaderboard, getTeamRanking } = require('./leaderboardService');

function formatDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

function formatScore(home, away) {
  if (home == null || away == null) return '';
  return `${home}:${away}`;
}

function formatAnswer(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'object') {
    if (value.name && value.teamName) return `${value.name} (${value.teamName})`;
    if (value.name) return value.name;
    return JSON.stringify(value);
  }
  return String(value);
}

function parseJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function addSheet(workbook, sheetName, headers, rows) {
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(headers);
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8EEF7' },
    };
  });

  for (const row of rows) {
    sheet.addRow(row);
  }

  sheet.columns.forEach((column) => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const value = cell.value == null ? '' : String(cell.value);
      maxLength = Math.max(maxLength, Math.min(value.length + 2, 60));
    });
    column.width = maxLength;
  });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  return sheet;
}

function buildExportFilename() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `tippspiel-export-${stamp}.xlsx`;
}

const EXPORT_LEADERBOARD_OPTIONS = {
  includeEmail: true,
  includeAdmins: true,
  skipCache: true,
};

async function collectExportData() {
  const [
    leaderboard,
    teamRanking,
    users,
    matches,
    predictions,
    bonusQuestions,
    bonusPredictions,
    scoringRules,
  ] = await Promise.all([
    getLeaderboard(EXPORT_LEADERBOARD_OPTIONS),
    getTeamRanking(EXPORT_LEADERBOARD_OPTIONS),
    User.findAll({
      include: [{ model: Team, as: 'team', attributes: ['name'] }],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']],
    }),
    Match.findAll({ order: [['kickoffTime', 'ASC'], ['matchNumber', 'ASC']] }),
    Prediction.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'], include: [{ model: Team, as: 'team', attributes: ['name'] }] },
        { model: Match, as: 'match' },
      ],
      order: [['submittedAt', 'ASC']],
    }),
    BonusQuestion.findAll({ order: [['id', 'ASC']] }),
    BonusPrediction.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'], include: [{ model: Team, as: 'team', attributes: ['name'] }] },
        { model: BonusQuestion, as: 'bonusQuestion' },
      ],
      order: [['submittedAt', 'ASC']],
    }),
    ScoringRule.findAll({ order: [['id', 'ASC']] }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    leaderboard,
    teamRanking,
    users,
    matches,
    predictions,
    bonusQuestions,
    bonusPredictions,
    scoringRules,
  };
}

async function buildExcelWorkbook() {
  const data = await collectExportData();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'WM2026 Tippspiel';
  workbook.created = new Date();
  workbook.modified = new Date();

  addSheet(workbook, 'Hitliste', [
    'Rang', 'Vorname', 'Nachname', 'E-Mail', 'Team', 'Spielpunkte', 'Bonuspunkte',
    'Gesamtpunkte', 'Exakt', 'Tordifferenz', 'Tendenz', 'Tipps', 'Vollständigkeit %',
  ], data.leaderboard.map((entry) => [
    entry.rank,
    entry.firstName,
    entry.lastName,
    entry.email || '',
    entry.teamName || '',
    entry.matchPoints,
    entry.bonusPoints,
    entry.totalPoints,
    entry.exactResults,
    entry.goalDifferences,
    entry.tendencies,
    entry.submittedPredictions,
    entry.completionPercentage,
  ]));

  const activeTeamRanking = data.teamRanking.filter((entry) => entry.userCount > 0);

  addSheet(workbook, 'Teamwertung', [
    'Rang', 'Team', 'Mitglieder', 'Gesamtpunkte', 'Ø Punkte', 'Exakte Tipps', 'Bester Tipper', 'Vollständigkeit %',
  ], activeTeamRanking.map((entry) => [
    entry.rank,
    entry.teamName,
    entry.userCount,
    entry.totalPoints,
    entry.averagePoints,
    entry.exactResults,
    entry.bestUser || '',
    entry.completionRate,
  ]));

  addSheet(workbook, 'Spieltipps', [
    'Nutzer', 'E-Mail', 'Team', 'Spiel-Nr.', 'Phase', 'Gruppe', 'Heim', 'Auswärts',
    'Anpfiff', 'Tipp', 'Ergebnis', 'Status', 'Punkte', 'Abgegeben am',
  ], data.predictions.map((prediction) => {
    const match = prediction.match;
    const user = prediction.user;
    return [
      user ? `${user.firstName} ${user.lastName}` : '',
      user?.email || '',
      user?.team?.name || '',
      match?.matchNumber ?? '',
      match?.stage || '',
      match?.groupName || '',
      match?.homeTeam || '',
      match?.awayTeam || '',
      formatDate(match?.kickoffTime),
      formatScore(prediction.predictedHomeScore, prediction.predictedAwayScore),
      formatScore(match?.homeScore, match?.awayScore),
      match?.status || '',
      prediction.points ?? '',
      formatDate(prediction.submittedAt),
    ];
  }));

  addSheet(workbook, 'Bonustipps', [
    'Nutzer', 'E-Mail', 'Team', 'Frage', 'Typ', 'Antwort', 'Punkte', 'Frage-Status', 'Abgegeben am',
  ], data.bonusPredictions.map((prediction) => {
    const user = prediction.user;
    const question = prediction.bonusQuestion;
    return [
      user ? `${user.firstName} ${user.lastName}` : '',
      user?.email || '',
      user?.team?.name || '',
      question?.questionText || '',
      question?.questionType || '',
      formatAnswer(parseJson(prediction.answerJson)),
      prediction.points ?? '',
      question?.status || '',
      formatDate(prediction.submittedAt),
    ];
  }));

  addSheet(workbook, 'Bonusfragen', [
    'ID', 'Frage', 'Typ', 'Punkte', 'Status', 'Sperrzeit', 'Richtige Antwort', 'Schlüssel',
  ], data.bonusQuestions.map((question) => [
    question.id,
    question.questionText,
    question.questionType,
    question.points,
    question.status,
    formatDate(question.lockTime),
    formatAnswer(parseJson(question.correctAnswerJson)),
    question.resolutionKey || '',
  ]));

  addSheet(workbook, 'Spiele', [
    'Spiel-Nr.', 'Phase', 'Gruppe', 'Heim', 'Auswärts', 'Anpfiff', 'Ergebnis',
    'Status', 'Stadion', 'Stadt', 'API-ID', 'Zuletzt synchronisiert',
  ], data.matches.map((match) => [
    match.matchNumber,
    match.stage,
    match.groupName || '',
    match.homeTeam,
    match.awayTeam,
    formatDate(match.kickoffTime),
    formatScore(match.homeScore, match.awayScore),
    match.status,
    match.stadium || '',
    match.city || '',
    match.externalApiId || '',
    formatDate(match.lastSyncedAt),
  ]));

  addSheet(workbook, 'Nutzer', [
    'Vorname', 'Nachname', 'E-Mail', 'Team', 'Rolle', 'Lieblingsteam', 'Torschützen-Tipp',
    'E-Mail bestätigt', 'Registriert am',
  ], data.users.map((user) => [
    user.firstName,
    user.lastName,
    user.email,
    user.team?.name || '',
    user.role,
    user.favoriteNationalTeamName || '',
    user.topScorerPlayerName || '',
    user.emailVerified ? 'ja' : 'nein',
    formatDate(user.createdAt),
  ]));

  const rules = data.scoringRules[0];
  addSheet(workbook, 'Punkte-Regeln', ['Regel', 'Wert'], [
    ['Exaktes Ergebnis', rules?.exactResultPoints ?? ''],
    ['Richtige Tordifferenz (nur Sieg)', rules?.goalDifferencePoints ?? ''],
    ['Richtige Tendenz', rules?.tendencyPoints ?? ''],
    ['Falscher Tipp', rules?.wrongPredictionPoints ?? ''],
    ['Export erstellt am', data.exportedAt],
    ['Nutzer gesamt', data.users.length],
    ['Nutzer in Hitliste', data.leaderboard.length],
    ['Teams mit Mitgliedern', activeTeamRanking.length],
    ['Spiele', data.matches.length],
    ['Spieltipps', data.predictions.length],
    ['Bonustipps', data.bonusPredictions.length],
    ['Bonusfragen', data.bonusQuestions.length],
  ]);

  return { workbook, meta: {
    exportedAt: data.exportedAt,
    sheetCount: workbook.worksheets.length,
    userCount: data.users.length,
    predictionCount: data.predictions.length,
    bonusPredictionCount: data.bonusPredictions.length,
    matchCount: data.matches.length,
  } };
}

async function buildExcelExportBuffer() {
  const { workbook } = await buildExcelWorkbook();
  return workbook.xlsx.writeBuffer();
}

module.exports = {
  buildExportFilename,
  buildExcelWorkbook,
  buildExcelExportBuffer,
  collectExportData,
};
