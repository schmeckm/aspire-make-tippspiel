const { Match } = require('../models');
const footballProviderService = require('./footballProviderService');
const { getSetting } = require('./settingsService');
const { logAudit } = require('./auditService');
const { startSyncLog, finishSyncLog, failSyncLog, emptySummary } = require('./syncLogService');
const { shouldApplyFixtureUpdate, buildFixtureUpdateData } = require('./matchSyncUtils');
const { shouldSkipSyncDueToRateLimit } = require('./footballDataRateLimitService');
const { fixLegacyApiMatchNumbers, getNextMatchNumber } = require('./matchNumberService');
const { enrichMatchVenuesFromTheSportsDb } = require('./theSportsDbVenueService');

async function syncFixtures({ userId = null, req = null } = {}) {
  const config = await footballProviderService.getProviderConfig();

  const apiSyncEnabled = await getSetting('apiSyncEnabled', config.syncEnabled);
  if (!apiSyncEnabled) {
    return { skipped: true, message: 'API-Synchronisierung ist deaktiviert.' };
  }

  footballProviderService.assertApiConfigured(config);

  const rateCheck = shouldSkipSyncDueToRateLimit('fixtures');
  if (rateCheck.skip) {
    return {
      skipped: true,
      message: 'Spielplan-Sync wegen Rate-Limit vorübergehend pausiert.',
      rateLimitReason: rateCheck.reason,
    };
  }

  const log = await startSyncLog('fixtures', config.provider);
  const summary = emptySummary();

  try {
    const { fixtures, rateLimits, rateLimitsHistory, competitionUsed, usedFallback, endpoint } =
      await footballProviderService.fetchForSync(config, 'fixtures');
    summary.rateLimits = rateLimits;
    summary.rateLimitsHistory = rateLimitsHistory;
    summary.competitionUsed = competitionUsed;
    summary.usedFallback = usedFallback;
    summary.endpoint = endpoint;

    await fixLegacyApiMatchNumbers();
    let nextMatchNumber = await getNextMatchNumber();

    for (const fixture of fixtures) {
      try {
        if (!fixture.externalApiId) {
          summary.skippedCount++;
          continue;
        }

        const match = await Match.findOne({ where: { externalApiId: fixture.externalApiId } });

        if (match) {
          const check = shouldApplyFixtureUpdate(match, fixture);
          if (!check.allowed) {
            summary.skippedCount++;
            summary.skipped = summary.skipped || [];
            summary.skipped.push({ externalApiId: fixture.externalApiId, reason: check.reason });
            continue;
          }
        }

        const matchData = buildFixtureUpdateData(fixture, config, match);

        if (match) {
          if (match.status !== 'finished') {
            matchData.status = fixture.status === 'finished' ? match.status : fixture.status;
          }
          await match.update(matchData);
          summary.updatedCount++;
        } else {
          nextMatchNumber += 1;
          await Match.create({
            ...matchData,
            matchNumber: nextMatchNumber,
            status: fixture.status || 'scheduled',
          });
          summary.createdCount++;
        }
      } catch (err) {
        summary.errorCount++;
        summary.errors.push({ externalApiId: fixture.externalApiId, message: err.message });
      }
    }

    try {
      summary.venueEnrichment = await enrichMatchVenuesFromTheSportsDb();
    } catch (venueError) {
      summary.venueEnrichment = {
        skipped: true,
        message: venueError.message,
        errors: [{ message: venueError.message }],
      };
    }

    await finishSyncLog(log, summary, rateLimits);

    if (userId) {
      await logAudit({
        userId,
        action: 'SYNC_FIXTURES',
        entityType: 'SyncLog',
        entityId: log.id,
        newValue: summary,
        req,
      });
    }

    return { logId: log.id, ...summary, message: 'Spielplan-Synchronisierung abgeschlossen.' };
  } catch (error) {
    await failSyncLog(log, error, summary);
    throw error;
  }
}

module.exports = { syncFixtures };
