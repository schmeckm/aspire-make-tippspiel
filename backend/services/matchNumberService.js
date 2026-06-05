const { Op } = require('sequelize');
const { Match } = require('../models');

const LEGACY_MATCH_NUMBER_THRESHOLD = 9999;

async function fixLegacyApiMatchNumbers() {
  const legacyMatches = await Match.findAll({
    where: { matchNumber: { [Op.gt]: LEGACY_MATCH_NUMBER_THRESHOLD } },
    order: [['kickoffTime', 'ASC']],
  });

  if (legacyMatches.length === 0) {
    return { fixed: 0 };
  }

  for (let i = 0; i < legacyMatches.length; i += 1) {
    await legacyMatches[i].update({ matchNumber: -(i + 1) });
  }

  let nextNumber = (await Match.max('matchNumber', {
    where: { matchNumber: { [Op.gt]: 0 } },
  })) || 0;

  for (const match of legacyMatches) {
    nextNumber += 1;
    await match.update({ matchNumber: nextNumber });
  }

  return { fixed: legacyMatches.length };
}

async function getNextMatchNumber() {
  return (await Match.max('matchNumber')) || 0;
}

module.exports = {
  fixLegacyApiMatchNumbers,
  getNextMatchNumber,
  LEGACY_MATCH_NUMBER_THRESHOLD,
};
