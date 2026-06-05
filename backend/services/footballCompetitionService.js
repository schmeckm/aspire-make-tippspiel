const footballDataProvider = require('./providers/footballDataProvider');
const { getProviderConfig, assertApiConfigured, isApiConfigured } = require('./footballProviderService');
const { enrichPlayersWithImages } = require('./playerImageService');

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = {
  standings: { data: null, fetchedAt: 0, key: '' },
  scorers: { data: null, fetchedAt: 0, key: '' },
};

function cacheKey(query) {
  return JSON.stringify(query || {});
}

async function getStandings(query = {}) {
  const key = cacheKey(query);
  if (cache.standings.data && cache.standings.key === key && Date.now() - cache.standings.fetchedAt < CACHE_TTL_MS) {
    return cache.standings.data;
  }

  const config = await getProviderConfig();
  assertApiConfigured(config);
  const { standings } = await footballDataProvider.fetchStandings(config, query);

  cache.standings = { data: standings, fetchedAt: Date.now(), key };
  return standings;
}

async function getScorers(query = {}) {
  const key = cacheKey(query);
  if (cache.scorers.data && cache.scorers.key === key && Date.now() - cache.scorers.fetchedAt < CACHE_TTL_MS) {
    return cache.scorers.data;
  }

  const config = await getProviderConfig();
  assertApiConfigured(config);
  const { scorers } = await footballDataProvider.fetchScorers(config, query);

  const enrichedPlayers = await enrichPlayersWithImages(
    scorers.map((entry) => ({
      id: entry.player?.id,
      name: entry.player?.name,
      teamName: entry.team?.name,
    })),
  );

  const imageByKey = new Map(
    enrichedPlayers.map((p) => [`${p.name}|${p.teamName || ''}`, {
      imageUrl: p.imageUrl,
      imageSource: p.imageSource,
      imageAttribution: p.imageAttribution,
      imageLicense: p.imageLicense,
    }]),
  );

  const enrichedScorers = scorers.map((entry) => {
    const key = `${entry.player?.name}|${entry.team?.name || ''}`;
    const meta = imageByKey.get(key);
    return {
      ...entry,
      player: {
        ...entry.player,
        imageUrl: meta?.imageUrl || null,
        imageSource: meta?.imageSource || null,
        imageAttribution: meta?.imageAttribution || null,
        imageLicense: meta?.imageLicense || null,
      },
    };
  });

  cache.scorers = { data: enrichedScorers, fetchedAt: Date.now(), key };
  return enrichedScorers;
}

async function getLiveMatches(query = {}) {
  const config = await getProviderConfig();
  assertApiConfigured(config);
  const { matches } = await footballDataProvider.fetchFilteredMatches(config, query);
  return matches;
}

module.exports = {
  getStandings,
  getScorers,
  getLiveMatches,
  isFootballApiAvailable: isApiConfigured,
};
