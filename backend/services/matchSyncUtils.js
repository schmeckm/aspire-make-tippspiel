const LIVE_STATUSES = ['live', 'halftime'];
const FINISHED_STATUSES = ['finished'];

function canUpdateMatch(match, { mode = 'fixture', allowFinishedOverwrite = false } = {}) {
  if (match.isManuallyLocked) {
    return { allowed: false, reason: 'manually_locked' };
  }
  if (match.isApiManaged === false) {
    return { allowed: false, reason: 'not_api_managed' };
  }
  if (
    mode === 'result'
    && match.status === 'finished'
    && match.homeScore !== null
    && match.awayScore !== null
    && !allowFinishedOverwrite
  ) {
    return { allowed: false, reason: 'finished_confirmed' };
  }
  return { allowed: true };
}

function shouldApplyFixtureUpdate(match, fixture) {
  const check = canUpdateMatch(match, { mode: 'fixture' });
  if (!check.allowed) return check;

  if (match.status === 'finished' && fixture.status !== 'finished') {
    return { allowed: false, reason: 'local_finished' };
  }

  return { allowed: true };
}

function buildFixtureUpdateData(fixture, config) {
  return {
    stage: fixture.stage,
    groupName: fixture.groupName,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    kickoffTime: new Date(fixture.kickoffTime),
    timezone: fixture.timezone || config.timezone || null,
    stadium: fixture.stadium,
    city: fixture.city,
    externalApiId: fixture.externalApiId,
    dataSource: fixture.dataSource || 'api',
    apiProvider: fixture.apiProvider || config.provider,
    apiLastStatus: fixture.apiLastStatus,
    isApiManaged: true,
    lastSyncedAt: new Date(),
    syncError: null,
    rawJson: fixture.rawJson || null,
  };
}

function buildResultUpdateData(fixture, match) {
  const updateData = {
    apiLastStatus: fixture.apiLastStatus,
    lastSyncedAt: new Date(),
    syncError: null,
  };
  if (fixture.rawJson) updateData.rawJson = fixture.rawJson;
  let changed = false;

  const isFinished = fixture.status === 'finished';
  const isLive = LIVE_STATUSES.includes(fixture.status);

  if (isFinished && fixture.homeScore !== null && fixture.awayScore !== null) {
    if (match.homeScore !== fixture.homeScore || match.awayScore !== fixture.awayScore) {
      updateData.homeScore = fixture.homeScore;
      updateData.awayScore = fixture.awayScore;
      changed = true;
    }
  }

  if (fixture.status && fixture.status !== match.status) {
    updateData.status = fixture.status;
    changed = true;
  }

  if (isLive && !isFinished) {
    // Live/halftime: update status only; final scores persist when finished.
    if (fixture.liveHomeScore != null && fixture.liveAwayScore != null) {
      changed = changed || match.status !== fixture.status;
    }
  }

  if (isFinished && match.status !== 'finished') {
    updateData.status = 'finished';
    updateData.isManuallyLocked = true;
    if (fixture.homeScore !== null && fixture.awayScore !== null) {
      updateData.homeScore = fixture.homeScore;
      updateData.awayScore = fixture.awayScore;
    }
    changed = true;
  }

  return { updateData, changed };
}

function isLiveFixture(fixture) {
  return LIVE_STATUSES.includes(fixture.status);
}

function isResultRelevant(fixture) {
  return LIVE_STATUSES.includes(fixture.status) || FINISHED_STATUSES.includes(fixture.status);
}

module.exports = {
  canUpdateMatch,
  shouldApplyFixtureUpdate,
  buildFixtureUpdateData,
  buildResultUpdateData,
  isLiveFixture,
  isResultRelevant,
  LIVE_STATUSES,
};
