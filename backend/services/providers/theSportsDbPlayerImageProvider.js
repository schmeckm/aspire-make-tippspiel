const { buildTheSportsDbUrl, fetchTheSportsDb } = require('./theSportsDbClient');

const NAME = 'thesportsdb';

function normalizePlayerResult(player, teamName) {
  const imageUrl = player.strThumb || player.strCutout || null;
  if (!imageUrl) return null;

  const name = player.strPlayer || '';
  const team = teamName || player.strTeam || null;

  return {
    imageUrl,
    source: NAME,
    sourceId: String(player.idPlayer),
    licenseInfo: 'TheSportsDB player image. Subject to TheSportsDB terms of use and image rights.',
    attributionText: `Photo via TheSportsDB (${name}${team ? `, ${team}` : ''})`,
    playerName: name,
    teamName: team,
  };
}

function pickBestPlayer(players, playerName, teamName) {
  if (!players?.length) return null;

  const nameKey = playerName.trim().toLowerCase();
  const teamKey = teamName?.trim().toLowerCase();

  const byName = players.filter((p) => {
    const playerKey = (p.strPlayer || '').toLowerCase();
    return playerKey === nameKey
      || playerKey.includes(nameKey)
      || nameKey.includes(playerKey);
  });

  const candidates = byName.length ? byName : players;

  if (teamKey) {
    const byTeam = candidates.find((p) => {
      const playerTeam = (p.strTeam || '').toLowerCase();
      return playerTeam.includes(teamKey) || teamKey.includes(playerTeam);
    });
    if (byTeam) return byTeam;
  }

  return candidates.find((p) => p.strThumb || p.strCutout) || candidates[0];
}

async function searchPlayers(config, playerName) {
  const data = await fetchTheSportsDb('searchplayers.php', { p: playerName.trim() }, config);
  return data.player || [];
}

async function fetchPlayerImage(config, { playerName, teamName, countryCode }) {
  if (!config?.apiKey || !playerName?.trim()) return null;

  const players = await searchPlayers(config, playerName);
  if (!players.length) return null;

  const match = pickBestPlayer(players, playerName, teamName || countryCode);
  if (!match) return null;

  return normalizePlayerResult(match, teamName);
}

async function testConnection(config) {
  const data = await fetchTheSportsDb('searchplayers.php', { p: 'Messi' }, config);
  const count = data.player?.length || 0;
  return {
    ok: true,
    message: `TheSportsDB verbunden (${count} Test-Treffer, Key: ${config.apiKey === '123' ? 'kostenlos' : 'eigen'})`,
  };
}

module.exports = {
  name: NAME,
  label: 'TheSportsDB',
  requiresApiKey: false,
  defaultBaseUrl: 'https://www.thesportsdb.com/api/v1/json',
  buildApiUrl: buildTheSportsDbUrl,
  fetchPlayerImage,
  testConnection,
};
