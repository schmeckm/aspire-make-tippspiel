const NON_EDITABLE_STATUSES = ['finished', 'locked', 'live', 'halftime', 'suspended', 'cancelled'];

function canEditPrediction(match, options = {}) {
  if (!match) return false;

  const { allowAdminOverride = false, isAdmin = false } = options;
  if (allowAdminOverride && isAdmin) return true;

  if (NON_EDITABLE_STATUSES.includes(match.status)) return false;
  if (match.isManuallyLocked) return false;
  if (match.kickoffTime && new Date() >= new Date(match.kickoffTime)) return false;
  return true;
}

function isMatchEditable(match) {
  return canEditPrediction(match);
}

module.exports = {
  NON_EDITABLE_STATUSES,
  canEditPrediction,
  isMatchEditable,
};
