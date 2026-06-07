const { Op } = require('sequelize');
const { Match } = require('../models');
const { resolveVenueFromWm2026Schedule } = require('../data/wm2026ScheduleLookup');
const { resolveCityFromStadium } = require('../data/wm2026Venues');
const { syncFixtures } = require('./fixtureSyncService');
const { enrichMatchVenuesFromTheSportsDb, enrichCitiesFromWm2026Lookup } = require('./theSportsDbVenueService');
const { logAudit } = require('./auditService');

function isTestVenue(match) {
  return /test/i.test(match.stadium || '') || /test/i.test(match.city || '');
}

async function enrichAllMatchesFromWm2026Schedule() {
  const matches = await Match.findAll({ order: [['kickoffTime', 'ASC']] });
  let updatedCount = 0;
  let matchedCount = 0;

  for (const match of matches) {
    const venue = resolveVenueFromWm2026Schedule(match.homeTeam, match.awayTeam);
    if (!venue) continue;
    matchedCount++;

    const updates = {};
    if (venue.stadium && match.stadium !== venue.stadium) {
      updates.stadium = venue.stadium;
    }

    const stadiumForCity = updates.stadium || match.stadium || venue.stadium;
    const city = resolveCityFromStadium(stadiumForCity) || venue.city;
    if (city && match.city !== city) {
      updates.city = city;
    }

    if (Object.keys(updates).length) {
      await match.update(updates);
      updatedCount++;
    }
  }

  return {
    matchedCount,
    updatedCount,
    message: `${updatedCount} Spiel(e) mit offiziellem WM-2026-Stadion abgeglichen.`,
  };
}

async function removeOrphanManualMatches() {
  const manualMatches = await Match.findAll({
    where: {
      [Op.or]: [
        { externalApiId: null },
        { externalApiId: '' },
      ],
    },
  });

  let removedCount = 0;
  const removed = [];

  for (const match of manualMatches) {
    const inOfficialSchedule = !!resolveVenueFromWm2026Schedule(match.homeTeam, match.awayTeam);
    if (inOfficialSchedule && !isTestVenue(match)) continue;

    removed.push({
      id: match.id,
      matchNumber: match.matchNumber,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
    });
    await match.destroy();
    removedCount++;
  }

  return {
    removedCount,
    removed,
    message: removedCount
      ? `${removedCount} Test-/Sonder-Spiel(e) entfernt.`
      : 'Keine Test-/Sonder-Spiele zum Entfernen gefunden.',
  };
}

async function syncOfficialWm2026Schedule({ userId = null, req = null } = {}) {
  const fixtureResult = await syncFixtures({ userId, req });
  const scheduleVenues = await enrichAllMatchesFromWm2026Schedule();

  let theSportsDbResult = { skipped: true, message: 'TheSportsDB nicht ausgeführt.' };
  try {
    theSportsDbResult = await enrichMatchVenuesFromTheSportsDb();
  } catch (error) {
    theSportsDbResult = { skipped: true, message: error.message };
  }

  const lookupResult = await enrichCitiesFromWm2026Lookup();
  const cleanupResult = await removeOrphanManualMatches();

  const summary = {
    fixtureResult,
    scheduleVenues,
    theSportsDbResult,
    lookupResult,
    cleanupResult,
    message: [
      fixtureResult.message,
      scheduleVenues.message,
      lookupResult.message,
      cleanupResult.message,
    ].filter(Boolean).join(' '),
  };

  if (userId) {
    await logAudit({
      userId,
      action: 'SYNC_OFFICIAL_WM2026',
      entityType: 'SyncLog',
      entityId: fixtureResult.logId || null,
      newValue: summary,
      req,
    });
  }

  return summary;
}

module.exports = {
  isTestVenue,
  enrichAllMatchesFromWm2026Schedule,
  removeOrphanManualMatches,
  syncOfficialWm2026Schedule,
};
