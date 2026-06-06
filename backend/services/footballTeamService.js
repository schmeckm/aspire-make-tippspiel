const footballDataProvider = require('./providers/footballDataProvider');
const { getProviderConfig, assertApiConfigured, isApiConfigured } = require('./footballProviderService');
const { enrichPlayersWithImages, resolveImage } = require('./playerImageService');
const { isEnabled: isPlayerImageEnabled } = require('./playerImageProviderService');

const CACHE_TTL_MS = 60 * 60 * 1000;
let cache = { teams: null, fetchedAt: 0 };

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

async function resolveMissingSquadImages(squad, teamName) {
  if (!isPlayerImageEnabled() || !squad?.length) return squad;

  const enriched = [...squad];
  for (const player of enriched) {
    if (player.imageUrl) continue;
    const resolved = await resolveImage({
      playerName: player.name,
      teamName,
      countryCode: player.nationality || null,
    });
    if (!resolved?.imageUrl) continue;
    player.imageUrl = resolved.imageUrl;
    player.imageSource = resolved.source || null;
    player.imageAttribution = resolved.attributionText || null;
    player.imageLicense = resolved.licenseInfo || null;
  }
  return enriched;
}

async function getTeamById(teamId, { resolveImages = false } = {}) {
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
    let squad = await enrichPlayersWithImages(team.squad.map((p) => ({
      ...p,
      teamName: team.name,
    })));
    if (resolveImages) {
      squad = await resolveMissingSquadImages(squad, team.name);
    }
    team = { ...team, squad };
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

  const sorted = filtered.sort((a, b) => a.name.localeCompare(b.name));
  return enrichPlayersWithImages(sorted);
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
        countryCode: player.nationality || team.area?.code || null,
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
