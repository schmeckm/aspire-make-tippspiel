const footballDataProvider = require('./providers/footballDataProvider');
const { getProviderConfig, assertApiConfigured, isApiConfigured } = require('./footballProviderService');
const { enrichPlayersWithImages, resolveImage, normalizeCountryCode } = require('./playerImageService');
const { isEnabled: isPlayerImageEnabled, isExternalProviderPaused } = require('./playerImageProviderService');

const CACHE_TTL_MS = 60 * 60 * 1000;
let cache = { teams: null, fetchedAt: 0 };

const MAX_CONCURRENT_IMAGE_RESOLVE = 2;
let activeImageResolves = 0;
const imageResolveWaiters = [];

async function acquireImageResolveSlot() {
  if (activeImageResolves < MAX_CONCURRENT_IMAGE_RESOLVE) {
    activeImageResolves += 1;
    return;
  }
  await new Promise((resolve) => {
    imageResolveWaiters.push(resolve);
  });
  activeImageResolves += 1;
}

function releaseImageResolveSlot() {
  activeImageResolves = Math.max(0, activeImageResolves - 1);
  const next = imageResolveWaiters.shift();
  if (next) next();
}

const DEFAULT_RESOLVE_TIME_BUDGET_MS = 12000;
const RESOLVE_DELAY_MS = 500;

async function loadTeams(force = false) {
  if (!force && cache.teams && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.teams;
  }

  const config = await getProviderConfig();
  assertApiConfigured(config);

  const { teams } = await footballDataProvider.fetchTeams(config);
  cache.teams = (teams || []).map(footballDataProvider.normalizeTeamDetail).filter(Boolean);
  cache.fetchedAt = Date.now();
  return cache.teams;
}

async function listTeams() {
  const teams = await loadTeams();
  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    tla: t.tla,
    crest: t.crest,
    area: t.area,
    squadSize: t.squad.length,
  })).sort((a, b) => a.name.localeCompare(b.name));
}

async function resolveMissingSquadImages(squad, teamName, {
  maxResolve = 2,
  timeBudgetMs = DEFAULT_RESOLVE_TIME_BUDGET_MS,
} = {}) {
  if (!isPlayerImageEnabled() || !squad?.length) return squad;
  if (isExternalProviderPaused()) return squad;

  const enriched = [...squad];
  const startedAt = Date.now();
  let resolvedCount = 0;

  for (const player of enriched) {
    if (player.imageUrl) continue;
    if (resolvedCount >= maxResolve) break;
    if (Date.now() - startedAt >= timeBudgetMs) break;
    if (isExternalProviderPaused()) break;

    try {
      if (resolvedCount > 0) {
        await new Promise((resolve) => { setTimeout(resolve, RESOLVE_DELAY_MS); });
      }

      const resolved = await resolveImage({
        playerName: player.name,
        teamName,
        countryCode: normalizeCountryCode(player.nationality),
      });
      if (!resolved?.imageUrl) continue;
      player.imageUrl = resolved.imageUrl;
      player.imageSource = resolved.source || null;
      player.imageAttribution = resolved.attributionText || null;
      player.imageLicense = resolved.licenseInfo || null;
      resolvedCount += 1;
    } catch (error) {
      console.warn(`resolveMissingSquadImages (${teamName}/${player.name}):`, error.message);
    }
  }

  return enriched;
}

async function getTeamById(teamId, {
  resolveImages = false,
  maxResolve = 2,
  resolveTimeBudgetMs = DEFAULT_RESOLVE_TIME_BUDGET_MS,
} = {}) {
  const id = parseInt(teamId, 10);
  if (!Number.isFinite(id)) return null;

  const cached = (await loadTeams()).find((t) => t.id === id);
  let team;
  if (cached?.squad?.length) {
    team = cached;
  } else {
    const config = await getProviderConfig();
    assertApiConfigured(config);
    const { team: fetched } = await footballDataProvider.fetchTeamById(config, id);
    team = fetched;
  }

  if (team?.squad?.length) {
    let squad = team.squad.map((p) => ({
      ...p,
      teamName: team.name,
    }));
    try {
      squad = await enrichPlayersWithImages(squad);
    } catch (error) {
      console.warn(`enrichPlayersWithImages failed for team ${team.id}:`, error.message);
    }
    const missingBefore = squad.filter((p) => !p.imageUrl).length;
    if (resolveImages && missingBefore > 0) {
      await acquireImageResolveSlot();
      try {
        squad = await resolveMissingSquadImages(squad, team.name, {
          maxResolve,
          timeBudgetMs: resolveTimeBudgetMs,
        });
      } finally {
        releaseImageResolveSlot();
      }
    }
    const missingAfter = squad.filter((p) => !p.imageUrl).length;
    team = {
      ...team,
      squad,
      ...(resolveImages ? {
        imageResolve: {
          remaining: missingAfter,
          resolvedThisRequest: Math.max(0, missingBefore - missingAfter),
          complete: missingAfter === 0,
        },
      } : {}),
    };
  }

  return team;
}

async function findTeamByName(name) {
  if (!name?.trim()) return null;
  const key = name.trim().toLowerCase();
  const teams = await loadTeams();

  return teams.find((t) => (
    t.name.toLowerCase() === key
    || t.shortName?.toLowerCase() === key
    || t.tla?.toLowerCase() === key
    || t.area?.name?.toLowerCase() === key
  )) || null;
}

function isFootballApiAvailable() {
  return isApiConfigured();
}

async function listPlayers(search = '') {
  const teams = await loadTeams();
  const q = search.trim().toLowerCase();
  const players = [];

  for (const team of teams) {
    for (const player of team.squad || []) {
      players.push({
        id: player.id,
        name: player.name,
        position: player.position,
        teamId: team.id,
        teamName: team.name,
        teamCrest: team.crest,
      });
    }
  }

  const filtered = q
    ? players.filter((p) => (
      p.name.toLowerCase().includes(q)
      || p.teamName.toLowerCase().includes(q)
    ))
    : players;

  return filtered.sort((a, b) => a.name.localeCompare(b.name));
}

async function getAllSquadPlayers() {
  const teams = await loadTeams();
  const players = [];

  for (const team of teams) {
    for (const player of team.squad || []) {
      if (!player.name) continue;
      players.push({
        playerName: player.name,
        teamName: team.name,
        countryCode: normalizeCountryCode(player.nationality || team.area?.code || null),
      });
    }
  }

  return players;
}

module.exports = {
  listTeams,
  getTeamById,
  findTeamByName,
  listPlayers,
  getAllSquadPlayers,
  isFootballApiAvailable,
  clearCache: () => { cache = { teams: null, fetchedAt: 0 }; },
};
