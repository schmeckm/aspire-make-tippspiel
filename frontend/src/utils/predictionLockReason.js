const LIVE_LIKE_STATUSES = new Set(['live', 'halftime', 'suspended']);

/**
 * Returns an i18n key + optional params to explain why predictions are locked.
 * Keep this purely derived from the match object (no API calls).
 */
export function getPredictionLockReason(match) {
  if (!match) {
    return { key: 'predictions.locked', kickoffTime: null };
  }

  if (match.isManuallyLocked || match.status === 'locked') {
    return { key: 'predictions.lockReasonManual', kickoffTime: match.kickoffTime || null };
  }

  if (match.status === 'finished') {
    return { key: 'predictions.lockReasonFinished', kickoffTime: match.kickoffTime || null };
  }

  if (match.status === 'cancelled') {
    return { key: 'predictions.lockReasonCancelled', kickoffTime: match.kickoffTime || null };
  }

  if (LIVE_LIKE_STATUSES.has(match.status)) {
    return { key: 'predictions.lockReasonLive', kickoffTime: match.kickoffTime || null };
  }

  const kickoffMs = match.kickoffTime ? new Date(match.kickoffTime).getTime() : null;
  if (kickoffMs && Date.now() >= kickoffMs) {
    return { key: 'predictions.lockReasonKickoff', kickoffTime: match.kickoffTime };
  }

  return { key: 'predictions.locked', kickoffTime: match.kickoffTime || null };
}

