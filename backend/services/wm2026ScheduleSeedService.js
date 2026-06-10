const { Op } = require('sequelize');
const { Match, Prediction } = require('../models');
const { WM2026_MATCH_SCHEDULE } = require('../data/wm2026MatchSchedule');
const { WM2026_KNOCKOUT_BRACKET } = require('../data/wm2026KnockoutBracket');
const { teamsMatch } = require('../data/wm2026ScheduleLookup');
const { safeDestroyMatch } = require('./predictionProtectionService');

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('');
const MATCHES_PER_GROUP = 6;
const GROUP_MATCH_COUNT = 72;
const TOURNAMENT_START_MS = Date.parse('2026-06-11T16:00:00.000Z');

function kickoffForIndex(index) {
  return new Date(TOURNAMENT_START_MS + index * 3 * 60 * 60 * 1000);
}

function buildOfficialGroupFixtures() {
  return WM2026_MATCH_SCHEDULE.slice(0, GROUP_MATCH_COUNT).map((entry, index) => {
    const groupName = GROUP_LETTERS[Math.floor(index / MATCHES_PER_GROUP)];
    return {
      matchNumber: index + 1,
      stage: 'GROUP_STAGE',
      groupName,
      homeTeam: entry.homeTeam,
      awayTeam: entry.awayTeam,
      kickoffTime: kickoffForIndex(index),
      timezone: 'UTC',
      stadium: entry.stadium || null,
      city: entry.city || null,
      status: 'scheduled',
    };
  });
}

function buildOfficialKnockoutFixtures() {
  const scheduleKnockout = WM2026_MATCH_SCHEDULE.slice(GROUP_MATCH_COUNT);
  return WM2026_KNOCKOUT_BRACKET.map((entry, index) => {
    const venue = scheduleKnockout[index] || {};
    return {
      matchNumber: entry.matchNumber,
      stage: entry.stage,
      groupName: null,
      homeTeam: entry.home,
      awayTeam: entry.away,
      kickoffTime: kickoffForIndex(GROUP_MATCH_COUNT + index),
      timezone: 'UTC',
      stadium: venue.stadium || null,
      city: venue.city || null,
      status: 'scheduled',
    };
  });
}

function isOfficialGroupMatch(match, officialByNumber) {
  const official = officialByNumber.get(match.matchNumber);
  if (!official) return false;
  return teamsMatch(match.homeTeam, official.homeTeam)
    && teamsMatch(match.awayTeam, official.awayTeam);
}

async function removeConflictingManualMatches(officialByNumber, knockoutByNumber) {
  const manualMatches = await Match.findAll({
    where: {
      [Op.or]: [
        { externalApiId: null },
        { externalApiId: '' },
      ],
    },
  });

  let removedCount = 0;
  let skippedWithPredictions = 0;
  for (const match of manualMatches) {
    const officialGroup = officialByNumber.get(match.matchNumber);
    const officialKnockout = knockoutByNumber.get(match.matchNumber);

    let keep = false;
    if (officialGroup) {
      keep = isOfficialGroupMatch(match, officialByNumber);
    } else if (officialKnockout) {
      keep = match.homeTeam === officialKnockout.home
        && match.awayTeam === officialKnockout.away;
    }

    if (keep) continue;

    const destroyResult = await safeDestroyMatch(match, { context: 'wm2026_schedule_seed' });
    if (destroyResult.skipped) {
      skippedWithPredictions += 1;
      continue;
    }
    removedCount += 1;
  }

  return { removedCount, skippedWithPredictions };
}

async function upsertOfficialFixtures(fixtures) {
  let createdCount = 0;
  let updatedCount = 0;

  for (const fixture of fixtures) {
    const existing = await Match.findOne({ where: { matchNumber: fixture.matchNumber } });
    if (!existing) {
      await Match.create(fixture);
      createdCount += 1;
      continue;
    }

    if (existing.externalApiId) continue;

    const shouldReplaceTeams = fixture.groupName
      ? !teamsMatch(existing.homeTeam, fixture.homeTeam)
        || !teamsMatch(existing.awayTeam, fixture.awayTeam)
      : false;

    if (!shouldReplaceTeams) continue;

    const predictionCount = await Prediction.count({ where: { matchId: existing.id } });
    if (predictionCount > 0) continue;

    await existing.update({
      stage: fixture.stage,
      groupName: fixture.groupName,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      kickoffTime: fixture.kickoffTime,
      stadium: fixture.stadium || existing.stadium,
      city: fixture.city || existing.city,
      status: existing.status === 'finished' ? existing.status : fixture.status,
    });
    updatedCount += 1;
  }

  return { createdCount, updatedCount };
}

async function seedOfficialWm2026MatchesIfNeeded() {
  if (process.env.WM2026_AUTO_SEED_SCHEDULE === 'false') {
    return { skipped: true, reason: 'disabled' };
  }

  const existingCount = await Match.count();
  const groupCount = await Match.count({ where: { groupName: { [Op.ne]: null } } });
  if (existingCount >= 104 && groupCount >= GROUP_MATCH_COUNT) {
    return { skipped: true, reason: 'complete' };
  }

  const groupFixtures = buildOfficialGroupFixtures();
  const knockoutFixtures = buildOfficialKnockoutFixtures();
  const officialByNumber = new Map(groupFixtures.map((fixture) => [fixture.matchNumber, fixture]));
  const knockoutByNumber = new Map(knockoutFixtures.map((fixture) => [fixture.matchNumber, fixture]));

  const { removedCount, skippedWithPredictions } = await removeConflictingManualMatches(officialByNumber, knockoutByNumber);
  const groupResult = await upsertOfficialFixtures(groupFixtures);
  const knockoutResult = await upsertOfficialFixtures(knockoutFixtures);

  const total = await Match.count();
  return {
    skipped: false,
    removedCount,
    createdCount: groupResult.createdCount + knockoutResult.createdCount,
    updatedCount: groupResult.updatedCount + knockoutResult.updatedCount,
    totalMatches: total,
    message: `WM-2026-Spielplan: ${groupResult.createdCount + knockoutResult.createdCount} Spiele angelegt, `
      + `${groupResult.updatedCount + knockoutResult.updatedCount} aktualisiert, `
      + `${removedCount} Test-Spiele entfernt`
      + (skippedWithPredictions ? `, ${skippedWithPredictions} mit Tipps geschützt` : '')
      + ` (${total} gesamt).`,
  };
}

module.exports = {
  buildOfficialGroupFixtures,
  buildOfficialKnockoutFixtures,
  seedOfficialWm2026MatchesIfNeeded,
};
