const { fetchWikimediaJson, isWikimediaEnabled } = require('./wikimediaClient');

const NAME = 'wikipedia';

async function searchPage(playerName, teamName) {
  if (!isWikimediaEnabled()) return null;

  const searchTerm = teamName
    ? `${playerName.trim()} ${teamName.trim()} footballer`
    : `${playerName.trim()} footballer`;

  const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
  searchUrl.searchParams.set('action', 'query');
  searchUrl.searchParams.set('list', 'search');
  searchUrl.searchParams.set('srsearch', searchTerm);
  searchUrl.searchParams.set('srlimit', '5');
  searchUrl.searchParams.set('format', 'json');
  searchUrl.searchParams.set('origin', '*');

  const searchData = await fetchWikimediaJson(searchUrl.toString());
  const results = searchData.query?.search || [];
  if (!results.length) return null;

  const title = results[0].title;
  const pageUrl = new URL('https://en.wikipedia.org/w/api.php');
  pageUrl.searchParams.set('action', 'query');
  pageUrl.searchParams.set('titles', title);
  pageUrl.searchParams.set('prop', 'pageimages|info');
  pageUrl.searchParams.set('piprop', 'thumbnail');
  pageUrl.searchParams.set('pithumbsize', '300');
  pageUrl.searchParams.set('inprop', 'url');
  pageUrl.searchParams.set('format', 'json');
  pageUrl.searchParams.set('origin', '*');

  const pageData = await fetchWikimediaJson(pageUrl.toString());
  const pages = pageData.query?.pages || {};
  const page = Object.values(pages)[0];
  if (!page?.thumbnail?.source) return null;

  return {
    imageUrl: page.thumbnail.source,
    source: NAME,
    sourceId: String(page.pageid),
    licenseInfo: 'Wikipedia page image. License varies by file; see Wikipedia file page.',
    attributionText: `${title} – Wikipedia (${page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`})`,
    playerName: playerName.trim(),
    teamName: teamName || null,
  };
}

async function fetchPlayerImage({ playerName, teamName }) {
  if (!playerName?.trim()) return null;
  return searchPage(playerName, teamName);
}

module.exports = {
  name: NAME,
  label: 'Wikipedia',
  requiresApiKey: false,
  fetchPlayerImage,
};
