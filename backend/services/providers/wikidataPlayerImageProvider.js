const { fetchJson } = require('./providerUtils');

const NAME = 'wikidata';
const USER_AGENT = 'ai-football-agent/2.5 (player-image; contact: local-admin)';

function buildCommonsUrl(filename) {
  const clean = String(filename).replace(/^File:/i, '').trim();
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(clean)}?width=300`;
}

async function searchEntity(playerName) {
  const url = new URL('https://www.wikidata.org/w/api.php');
  url.searchParams.set('action', 'wbsearchentities');
  url.searchParams.set('search', playerName.trim());
  url.searchParams.set('language', 'en');
  url.searchParams.set('type', 'item');
  url.searchParams.set('limit', '5');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const data = await fetchJson(url.toString(), { 'User-Agent': USER_AGENT });
  return data.search || [];
}

async function getEntityClaims(entityId) {
  const url = new URL('https://www.wikidata.org/w/api.php');
  url.searchParams.set('action', 'wbgetentities');
  url.searchParams.set('ids', entityId);
  url.searchParams.set('props', 'claims|labels');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const data = await fetchJson(url.toString(), { 'User-Agent': USER_AGENT });
  return data.entities?.[entityId] || null;
}

function pickBestEntity(entities, playerName, teamName) {
  const nameKey = playerName.trim().toLowerCase();
  const teamKey = teamName?.trim().toLowerCase();

  for (const entity of entities) {
    const label = entity.label?.toLowerCase();
    if (label && (label === nameKey || label.includes(nameKey) || nameKey.includes(label))) {
      if (!teamKey || !entity.description || entity.description.toLowerCase().includes('football')
        || entity.description.toLowerCase().includes('soccer')) {
        return entity.id;
      }
    }
  }

  return entities[0]?.id || null;
}

function extractImageFilename(entity) {
  const claims = entity?.claims?.P18;
  if (!claims?.length) return null;
  const mainsnak = claims[0].mainsnak;
  if (mainsnak?.datavalue?.type !== 'string') return null;
  return mainsnak.datavalue.value;
}

async function fetchPlayerImage({ playerName, teamName }) {
  if (!playerName?.trim()) return null;

  const entities = await searchEntity(playerName);
  if (!entities.length) return null;

  const entityId = pickBestEntity(entities, playerName, teamName);
  if (!entityId) return null;

  const entity = await getEntityClaims(entityId);
  const filename = extractImageFilename(entity);
  if (!filename) return null;

  const label = entity.labels?.en?.value || playerName.trim();

  return {
    imageUrl: buildCommonsUrl(filename),
    source: NAME,
    sourceId: entityId,
    licenseInfo: 'Wikimedia Commons image linked via Wikidata (P18). Check file page for license.',
    attributionText: `${label} – Wikimedia Commons via Wikidata (${entityId})`,
    playerName: label,
    teamName: teamName || null,
  };
}

module.exports = {
  name: NAME,
  label: 'Wikidata / Wikimedia Commons',
  requiresApiKey: false,
  fetchPlayerImage,
};
