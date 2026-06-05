const { applyResultUpdates } = require('./resultSyncService');

async function syncLiveScores(options = {}) {
  return applyResultUpdates({ ...options, syncType: 'live_scores', liveOnly: true });
}

module.exports = { syncLiveScores };
