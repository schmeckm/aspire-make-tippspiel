const { Op } = require('sequelize');
const { PlayerImage } = require('../models');
const { logAudit } = require('./auditService');
const {
  isEnabled,
  getCacheTtlMs,
  resolveFromExternalProviders,
  searchAllProviders,
  manualPlayerImageProvider,
} = require('./playerImageProviderService');
const {
  buildImageUrl,
  deletePlayerImageFiles,
  deleteImageByUrl,
} = require('./manualPlayerImageUploadService');

function normalizePlayerName(name) {
  return (name || '').trim();
}

function normalizeTeamName(name) {
  return (name || '').trim();
}

function normalizeCountryCode(value) {
  if (value == null || value === '') return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed.slice(0, 64) : null;
}

function toPublicRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    playerName: record.playerName,
    teamName: record.teamName,
    countryCode: record.countryCode,
    imageUrl: record.imageUrl,
    source: record.source,
    sourceId: record.sourceId,
    licenseInfo: record.licenseInfo,
    attributionText: record.attributionText,
    lastCheckedAt: record.lastCheckedAt,
    isManuallyApproved: record.isManuallyApproved,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function isCacheValid(record) {
  if (!record?.imageUrl || !record.lastCheckedAt) return false;
  if (record.isManuallyApproved || record.source === 'manual') return true;
  return Date.now() - new Date(record.lastCheckedAt).getTime() < getCacheTtlMs();
}

async function findRecord(playerName, teamName) {
  const normalizedName = normalizePlayerName(playerName);
  const normalizedTeam = normalizeTeamName(teamName);

  if (!normalizedName) return null;

  const where = { playerName: normalizedName };
  if (normalizedTeam) {
    where.teamName = normalizedTeam;
  } else {
    where.teamName = { [Op.or]: [null, ''] };
  }

  return PlayerImage.findOne({ where });
}

async function upsertRecord(data) {
  const playerName = normalizePlayerName(data.playerName);
  const teamName = normalizeTeamName(data.teamName) || null;
  if (!playerName) throw new Error('playerName is required');

  let record = await findRecord(playerName, teamName);
  const payload = {
    playerName,
    teamName,
    countryCode: normalizeCountryCode(data.countryCode),
    imageUrl: data.imageUrl || null,
    source: data.source || 'placeholder',
    sourceId: data.sourceId || null,
    licenseInfo: data.licenseInfo || null,
    attributionText: data.attributionText || null,
    lastCheckedAt: data.lastCheckedAt || new Date(),
    isManuallyApproved: !!data.isManuallyApproved,
  };

  if (record) {
    await record.update(payload);
  } else {
    record = await PlayerImage.create(payload);
  }

  return record;
}

async function resolveImage({ playerName, teamName, countryCode, forceRefresh = false }) {
  if (!isEnabled()) return null;

  const normalizedName = normalizePlayerName(playerName);
  if (!normalizedName) return null;

  const params = {
    playerName: normalizedName,
    teamName: normalizeTeamName(teamName) || null,
    countryCode: normalizeCountryCode(countryCode),
  };

  if (!forceRefresh) {
    const cached = await findRecord(params.playerName, params.teamName);
    if (cached?.isManuallyApproved && cached.imageUrl) {
      return toPublicRecord(cached);
    }
    if (cached?.imageUrl && isCacheValid(cached)) {
      return toPublicRecord(cached);
    }
  }

  const manual = await manualPlayerImageProvider.fetchPlayerImage(params);
  if (manual?.imageUrl) {
    const record = await upsertRecord({
      ...params,
      ...manual,
      isManuallyApproved: true,
    });
    return toPublicRecord(record);
  }

  const external = await resolveFromExternalProviders(params);
  if (external?.imageUrl) {
    const record = await upsertRecord({
      ...params,
      ...external,
      isManuallyApproved: false,
    });
    return toPublicRecord(record);
  }

  const existing = await findRecord(params.playerName, params.teamName);
  if (existing) {
    await existing.update({ lastCheckedAt: new Date() });
    return existing.imageUrl ? toPublicRecord(existing) : null;
  }

  return null;
}

async function batchResolveImages(players = []) {
  const results = {};
  for (const player of players) {
    const key = `${normalizePlayerName(player.playerName)}|${normalizeTeamName(player.teamName)}`;
    try {
      results[key] = await resolveImage({
        playerName: player.playerName,
        teamName: player.teamName,
        countryCode: player.countryCode,
      });
    } catch (error) {
      console.warn('batchResolveImages error:', error.message);
      results[key] = null;
    }
  }
  return results;
}

async function findCachedRecordsInBatches(names, batchSize = 50) {
  const records = [];
  for (let i = 0; i < names.length; i += batchSize) {
    const batch = names.slice(i, i + batchSize);
    const batchRecords = await PlayerImage.findAll({
      where: {
        [Op.or]: batch.map(({ playerName, teamName }) => ({
          playerName,
          teamName: teamName || { [Op.or]: [null, ''] },
        })),
      },
    });
    records.push(...batchRecords);
  }
  return records;
}

async function enrichPlayersWithImages(players = []) {
  if (!isEnabled() || !players.length) return players;

  const keys = new Map();
  for (const player of players) {
    const playerName = normalizePlayerName(player.name || player.playerName);
    const teamName = normalizeTeamName(player.teamName || player.team?.name);
    if (!playerName) continue;
    keys.set(`${playerName}|${teamName}`, { playerName, teamName });
  }

  if (!keys.size) return players;

  const names = [...keys.values()];
  const cachedRecords = await findCachedRecordsInBatches(names);

  const imageMap = new Map();
  for (const record of cachedRecords) {
    if (!record.imageUrl) continue;
    const key = `${record.playerName}|${record.teamName || ''}`;
    if (isCacheValid(record) || record.isManuallyApproved) {
      imageMap.set(key, {
        imageUrl: record.imageUrl,
        imageSource: record.source,
        imageAttribution: record.attributionText || null,
        imageLicense: record.licenseInfo || null,
      });
    }
  }

  return players.map((player) => {
    const playerName = normalizePlayerName(player.name || player.playerName);
    const teamName = normalizeTeamName(player.teamName || player.team?.name);
    const key = `${playerName}|${teamName}`;
    const meta = imageMap.get(key);
    return {
      ...player,
      imageUrl: meta?.imageUrl || player.imageUrl || null,
      imageSource: meta?.imageSource || player.imageSource || null,
      imageAttribution: meta?.imageAttribution || player.imageAttribution || null,
      imageLicense: meta?.imageLicense || player.imageLicense || null,
    };
  });
}

async function listImages({ search = '', limit = 50, offset = 0 } = {}) {
  const where = {};
  const q = search.trim();
  if (q) {
    where[Op.or] = [
      { playerName: { [Op.like]: `%${q}%` } },
      { teamName: { [Op.like]: `%${q}%` } },
    ];
  }

  const { rows, count } = await PlayerImage.findAndCountAll({
    where,
    order: [['playerName', 'ASC'], ['teamName', 'ASC']],
    limit: Math.min(limit, 200),
    offset,
  });

  return {
    items: rows.map(toPublicRecord),
    total: count,
    limit,
    offset,
  };
}

async function getImageById(id) {
  const record = await PlayerImage.findByPk(id);
  return toPublicRecord(record);
}

async function searchProviders({ playerName, teamName, countryCode }) {
  const params = {
    playerName: normalizePlayerName(playerName),
    teamName: normalizeTeamName(teamName) || null,
    countryCode: countryCode || null,
  };

  if (!params.playerName) {
    const err = new Error('playerName is required');
    err.code = 'VALIDATION';
    throw err;
  }

  return searchAllProviders(params);
}

async function approveImage(id, userId, req) {
  const record = await PlayerImage.findByPk(id);
  if (!record) return null;

  const oldValue = toPublicRecord(record);
  await record.update({ isManuallyApproved: true, lastCheckedAt: new Date() });

  await logAudit({
    userId,
    action: 'player_image.approve',
    entityType: 'PlayerImage',
    entityId: record.id,
    oldValue,
    newValue: toPublicRecord(record),
    req,
  });

  return toPublicRecord(record);
}

async function createManualImage({
  playerName,
  teamName,
  countryCode,
  licenseInfo,
  attributionText,
  userId,
  req,
}) {
  const record = await upsertRecord({
    playerName,
    teamName,
    countryCode,
    imageUrl: null,
    source: 'manual',
    licenseInfo: licenseInfo || 'Manually uploaded image.',
    attributionText,
    isManuallyApproved: true,
  });

  await logAudit({
    userId,
    action: 'player_image.create',
    entityType: 'PlayerImage',
    entityId: record.id,
    newValue: toPublicRecord(record),
    req,
  });

  return toPublicRecord(record);
}

async function applyUploadedFile(recordId, ext) {
  const record = await PlayerImage.findByPk(recordId);
  if (!record) return null;

  if (record.imageUrl?.startsWith('/uploads/players/')) {
    deleteImageByUrl(record.imageUrl);
  }

  record.imageUrl = buildImageUrl(recordId, ext);
  record.source = 'manual';
  record.isManuallyApproved = true;
  record.lastCheckedAt = new Date();
  if (!record.licenseInfo) {
    record.licenseInfo = 'Manually uploaded image.';
  }
  await record.save();
  return toPublicRecord(record);
}

async function replaceImageMetadata(id, data, userId, req) {
  const record = await PlayerImage.findByPk(id);
  if (!record) return null;

  const oldValue = toPublicRecord(record);
  const updates = {};

  if (data.imageUrl !== undefined) updates.imageUrl = data.imageUrl;
  if (data.source !== undefined) updates.source = data.source;
  if (data.sourceId !== undefined) updates.sourceId = data.sourceId;
  if (data.licenseInfo !== undefined) updates.licenseInfo = data.licenseInfo;
  if (data.attributionText !== undefined) updates.attributionText = data.attributionText;
  if (data.playerName !== undefined) updates.playerName = normalizePlayerName(data.playerName);
  if (data.teamName !== undefined) updates.teamName = normalizeTeamName(data.teamName) || null;
  if (data.countryCode !== undefined) updates.countryCode = data.countryCode || null;
  updates.lastCheckedAt = new Date();

  await record.update(updates);

  await logAudit({
    userId,
    action: 'player_image.replace',
    entityType: 'PlayerImage',
    entityId: record.id,
    oldValue,
    newValue: toPublicRecord(record),
    req,
  });

  return toPublicRecord(record);
}

async function applyProviderResult(id, providerResult, userId, req) {
  const record = await PlayerImage.findByPk(id);
  if (!record) return null;

  const oldValue = toPublicRecord(record);

  if (record.imageUrl?.startsWith('/uploads/players/')) {
    deleteImageByUrl(record.imageUrl);
  }

  await record.update({
    imageUrl: providerResult.imageUrl,
    source: providerResult.source || providerResult.provider,
    sourceId: providerResult.sourceId || null,
    licenseInfo: providerResult.licenseInfo || null,
    attributionText: providerResult.attributionText || null,
    lastCheckedAt: new Date(),
    isManuallyApproved: false,
  });

  await logAudit({
    userId,
    action: 'player_image.apply_provider',
    entityType: 'PlayerImage',
    entityId: record.id,
    oldValue,
    newValue: toPublicRecord(record),
    req,
  });

  return toPublicRecord(record);
}

async function removeImage(id, userId, req) {
  const record = await PlayerImage.findByPk(id);
  if (!record) return null;

  const oldValue = toPublicRecord(record);

  if (record.imageUrl?.startsWith('/uploads/players/')) {
    deletePlayerImageFiles(record.id);
  }

  await record.update({
    imageUrl: null,
    source: 'placeholder',
    sourceId: null,
    licenseInfo: null,
    attributionText: null,
    isManuallyApproved: false,
    lastCheckedAt: new Date(),
  });

  await logAudit({
    userId,
    action: 'player_image.remove',
    entityType: 'PlayerImage',
    entityId: record.id,
    oldValue,
    newValue: toPublicRecord(record),
    req,
  });

  return toPublicRecord(record);
}

async function deleteImageRecord(id, userId, req) {
  const record = await PlayerImage.findByPk(id);
  if (!record) return false;

  const oldValue = toPublicRecord(record);

  if (record.imageUrl?.startsWith('/uploads/players/')) {
    deletePlayerImageFiles(record.id);
  }

  await record.destroy();

  await logAudit({
    userId,
    action: 'player_image.delete',
    entityType: 'PlayerImage',
    entityId: id,
    oldValue,
    req,
  });

  return true;
}

module.exports = {
  normalizePlayerName,
  normalizeTeamName,
  normalizeCountryCode,
  toPublicRecord,
  resolveImage,
  batchResolveImages,
  enrichPlayersWithImages,
  listImages,
  getImageById,
  findRecord,
  searchProviders,
  approveImage,
  createManualImage,
  applyUploadedFile,
  replaceImageMetadata,
  applyProviderResult,
  removeImage,
  deleteImageRecord,
};
