const { User, Team, Match, ScoringRule, BonusQuestion } = require('../models');
const { seedDefaultSettings } = require('../services/settingsService');

async function seedDemoData() {
  const teams = await Team.bulkCreate([
    { name: 'IT', description: 'IT-Abteilung' },
    { name: 'Finance', description: 'Finanzabteilung' },
    { name: 'Operations', description: 'Operations-Abteilung' },
  ]);

  await User.create({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    teamId: teams[0].id,
    emailVerified: true,
  });

  const users = [
    { firstName: 'Max', lastName: 'Müller', email: 'max.mueller@example.com', teamId: teams[0].id },
    { firstName: 'Anna', lastName: 'Schneider', email: 'anna.schneider@example.com', teamId: teams[1].id },
    { firstName: 'Thomas', lastName: 'Weber', email: 'thomas.weber@example.com', teamId: teams[2].id },
    { firstName: 'Julia', lastName: 'Fischer', email: 'julia.fischer@example.com', teamId: teams[0].id },
    { firstName: 'Markus', lastName: 'Schmeckenbecher', email: 'markus.schmeckenbecher@example.com', teamId: teams[2].id },
  ];
  for (const u of users) {
    await User.create({ ...u, password: 'user123', role: 'user', emailVerified: true });
  }

  await ScoringRule.create({
    exactResultPoints: 5,
    goalDifferencePoints: 3,
    tendencyPoints: 2,
    wrongPredictionPoints: 0,
  });

  await seedDefaultSettings();

  await Match.bulkCreate([
    { matchNumber: 1, stage: 'Group Stage', groupName: 'A', homeTeam: 'Deutschland', awayTeam: 'Frankreich', kickoffTime: '2026-06-11T21:00:00.000Z', stadium: 'MetLife Stadium', city: 'New York' },
    { matchNumber: 2, stage: 'Group Stage', groupName: 'A', homeTeam: 'Brasilien', awayTeam: 'Japan', kickoffTime: '2026-06-12T18:00:00.000Z', stadium: 'SoFi Stadium', city: 'Los Angeles' },
    { matchNumber: 3, stage: 'Group Stage', groupName: 'B', homeTeam: 'Spanien', awayTeam: 'Argentinien', kickoffTime: '2026-06-13T21:00:00.000Z', stadium: 'AT&T Stadium', city: 'Dallas' },
    { matchNumber: 4, stage: 'Group Stage', groupName: 'B', homeTeam: 'England', awayTeam: 'Niederlande', kickoffTime: '2026-06-14T18:00:00.000Z', stadium: 'Mercedes-Benz Stadium', city: 'Atlanta' },
    { matchNumber: 5, stage: 'Group Stage', groupName: 'C', homeTeam: 'Portugal', awayTeam: 'Marokko', kickoffTime: '2026-06-15T21:00:00.000Z', stadium: 'Hard Rock Stadium', city: 'Miami' },
    { matchNumber: 6, stage: 'Group Stage', groupName: 'C', homeTeam: 'Belgien', awayTeam: 'Kroatien', kickoffTime: '2026-06-16T18:00:00.000Z', stadium: 'Lumen Field', city: 'Seattle' },
    { matchNumber: 7, stage: 'Group Stage', groupName: 'D', homeTeam: 'Italien', awayTeam: 'Uruguay', kickoffTime: '2026-06-17T21:00:00.000Z', stadium: "Levi's Stadium", city: 'San Francisco' },
    { matchNumber: 8, stage: 'Round of 16', groupName: null, homeTeam: 'Gruppensieger A', awayTeam: 'Zweiter Gruppe B', kickoffTime: '2026-07-01T21:00:00.000Z', stadium: 'MetLife Stadium', city: 'New York' },
    { matchNumber: 9, stage: 'Quarter Final', groupName: null, homeTeam: 'Sieger Achtelfinale 1', awayTeam: 'Sieger Achtelfinale 2', kickoffTime: '2026-07-09T21:00:00.000Z', stadium: 'SoFi Stadium', city: 'Los Angeles' },
    { matchNumber: 10, stage: 'Final', groupName: null, homeTeam: 'Finalist 1', awayTeam: 'Finalist 2', kickoffTime: '2026-07-19T21:00:00.000Z', stadium: 'MetLife Stadium', city: 'New York' },
  ]);

  await BonusQuestion.bulkCreate([
    {
      questionText: 'Wer wird Weltmeister?',
      questionType: 'national_team',
      optionsJson: null,
      points: 20,
      lockTime: '2026-06-11T20:00:00.000Z',
      status: 'open',
    },
    {
      questionText: 'Wer wird Torschützenkönig?',
      questionType: 'national_team_player',
      optionsJson: null,
      points: 15,
      lockTime: '2026-06-11T20:00:00.000Z',
      status: 'open',
    },
    {
      questionText: 'Wie weit kommt {team}?',
      questionType: 'favorite_team_progress',
      optionsJson: JSON.stringify(['groupStage', 'roundOf16', 'quarterFinal', 'semiFinal', 'final', 'champion']),
      points: 10,
      lockTime: '2026-06-11T20:00:00.000Z',
      status: 'open',
    },
  ]);
}

module.exports = { seedDemoData };
