function getYouTubeApiKey() {
  const key = process.env.YOUTUBE_API_KEY;
  return typeof key === 'string' && key.trim() ? key.trim() : '';
}

function buildQuery({ homeTeam, awayTeam, kickoffTime }) {
  const home = String(homeTeam || '').trim();
  const away = String(awayTeam || '').trim();
  const year = kickoffTime ? new Date(kickoffTime).getFullYear() : '';
  return [home, away, year, 'highlights'].filter(Boolean).join(' ');
}

async function youtubeFetchJson(url) {
  const https = require('node:https');
  const text = await new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { accept: 'application/json' } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        const status = res.statusCode || 0;
        if (status < 200 || status >= 300) {
          const err = new Error(`YouTube request failed (${status})`);
          err.status = status;
          err.body = body;
          reject(err);
          return;
        }
        resolve(body);
      });
    });
    req.on('error', reject);
    req.end();
  });

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function isoHoursBefore(dateStr, hours) {
  if (!dateStr) return '';
  const ms = new Date(dateStr).getTime();
  if (!Number.isFinite(ms)) return '';
  return new Date(ms - hours * 60 * 60 * 1000).toISOString();
}

async function searchMatchHighlights(match, { maxResults = 6 } = {}) {
  const apiKey = getYouTubeApiKey();
  if (!apiKey) {
    const err = new Error('YOUTUBE_API_KEY missing');
    err.code = 'YOUTUBE_API_KEY_MISSING';
    throw err;
  }

  const query = buildQuery(match);
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('maxResults', String(maxResults));
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('videoEmbeddable', 'true');
  searchUrl.searchParams.set('safeSearch', 'none');
  const publishedAfter = isoHoursBefore(match.kickoffTime, 18);
  if (publishedAfter) searchUrl.searchParams.set('publishedAfter', publishedAfter);
  searchUrl.searchParams.set('key', apiKey);

  const searchJson = await youtubeFetchJson(searchUrl.toString());
  const items = Array.isArray(searchJson?.items) ? searchJson.items : [];
  const videoIds = items
    .map((it) => it?.id?.videoId)
    .filter(Boolean);

  const base = items.map((it) => ({
    videoId: it.id.videoId,
    title: it.snippet?.title || '',
    channelTitle: it.snippet?.channelTitle || '',
    publishedAt: it.snippet?.publishedAt || '',
    thumbnailUrl: it.snippet?.thumbnails?.medium?.url
      || it.snippet?.thumbnails?.default?.url
      || '',
    url: it.id?.videoId ? `https://www.youtube.com/watch?v=${it.id.videoId}` : '',
  }));

  if (videoIds.length === 0) return { query, items: [] };

  const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  videosUrl.searchParams.set('part', 'contentDetails,statistics');
  videosUrl.searchParams.set('id', videoIds.join(','));
  videosUrl.searchParams.set('key', apiKey);
  let details = [];
  try {
    const videosJson = await youtubeFetchJson(videosUrl.toString());
    details = Array.isArray(videosJson?.items) ? videosJson.items : [];
  } catch {
    details = [];
  }

  const detailMap = new Map(details.map((d) => [d.id, d]));
  const merged = base.map((row) => {
    const d = detailMap.get(row.videoId);
    const viewCount = d?.statistics?.viewCount ? Number(d.statistics.viewCount) : null;
    const duration = d?.contentDetails?.duration || '';
    return {
      ...row,
      viewCount: Number.isFinite(viewCount) ? viewCount : null,
      duration,
    };
  });

  return { query, items: merged };
}

module.exports = { searchMatchHighlights };

