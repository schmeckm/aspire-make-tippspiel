const { PlayerImage } = require('../../models');
const { Op } = require('sequelize');

const NAME = 'manual';

function normalizeResult(record) {
  if (!record?.imageUrl) return null;
  return {
    imageUrl: record.imageUrl,
    source: NAME,
    sourceId: record.sourceId || String(record.id),
    licenseInfo: record.licenseInfo || 'Manually uploaded image.',
    attributionText: record.attributionText || null,
    isManuallyApproved: true,
  };
}

async function fetchPlayerImage({ playerName, teamName }) {
  if (!playerName?.trim()) return null;

  const where = {
    playerName: playerName.trim(),
    imageUrl: { [Op.ne]: null },
    [Op.or]: [
      { isManuallyApproved: true },
      { source: NAME },
    ],
  };

  if (teamName?.trim()) {
    where.teamName = teamName.trim();
  } else {
    where.teamName = { [Op.or]: [null, ''] };
  }

  const record = await PlayerImage.findOne({ where, order: [['updatedAt', 'DESC']] });
  return normalizeResult(record);
}

module.exports = {
  name: NAME,
  label: 'Manual upload',
  requiresApiKey: false,
  fetchPlayerImage,
};
