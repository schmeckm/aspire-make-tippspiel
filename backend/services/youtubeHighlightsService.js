function getYouTubeApiKey() {
  const key = process.env.YOUTUBE_API_KEY;
  return typeof key === 'string' && key.trim() ? key.trim() : '';
}

function parseCsv(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getSkipChannelKeywords() {
  // Default: skip FIFA uploads. Can be extended via env.
  return parseCsv(process.env.YOUTUBE_SKIP_CHANNEL_KEYWORDS || 'fifa').map((s) => s.toLowerCase());
}

function getSkipChannelIds() {
  return parseCsv(process.env.YOUTUBE_SKIP_CHANNEL_IDS || '');
}

function getRegionCode() {
  const code = String(process.env.YOUTUBE_REGION_CODE || '').trim().toUpperCase();
  // YouTube uses ISO 3166-1 alpha-2 country codes (e.g. DE, CH, US)
  return /^[A-Z]{2}$/.test(code) ? code : '';
}

function isBlockedInRegion(regionCode, videoDetails) {
  if (!regionCode) return false;
  const rr = videoDetails?.contentDetails?.regionRestriction;
  const blocked = Array.isArray(rr?.blocked) ? rr?.blocked : null;
  const allowed = Array.isArray(rr?.allowed) ? rr?.allowed : null;
  if (blocked?.includes?.(regionCode)) return true;
  if (allowed && !allowed?.includes?.(regionCode)) return true;
  return false;
}

function shouldSkipVideo(row) {
  const keywords = getSkipChannelKeywords();
  const channelIds = new Set(getSkipChannelIds());
  const channelTitle = String(row?.channelTitle || '').toLowerCase();
  const channelId = String(row?.channelId || '');

  if (channelId && channelIds.has(channelId)) return true;
  // Only filter by channel name/id to avoid accidentally skipping non-FIFA channels
  // that mention "FIFA" in the video title.
  return keywords.some((kw) => kw && channelTitle.includes(kw));
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

  const requireSyndicated = process.env.YOUTUBE_REQUIRE_SYNDICATED === 'true';
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const desired = clamp(Number(maxResults) || 6, 1, 25);
  const searchLimit = clamp(desired * 4, 8, 25);
  const regionCode = getRegionCode();

  async function searchOnce({ requireEmbeddable }) {
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('maxResults', String(searchLimit));
    searchUrl.searchParams.set('q', query);
    if (requireEmbeddable) searchUrl.searchParams.set('videoEmbeddable', 'true');
    if (requireSyndicated) searchUrl.searchParams.set('videoSyndicated', 'true');
    if (regionCode) searchUrl.searchParams.set('regionCode', regionCode);
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
      channelId: it.snippet?.channelId || '',
      publishedAt: it.snippet?.publishedAt || '',
      thumbnailUrl: it.snippet?.thumbnails?.medium?.url
        || it.snippet?.thumbnails?.default?.url
        || '',
      url: it.id?.videoId ? `https://www.youtube.com/watch?v=${it.id.videoId}` : '',
    }));

    if (videoIds.length === 0) return [];

    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    videosUrl.searchParams.set('part', 'contentDetails,statistics,status');
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
    return base.map((row) => {
      const d = detailMap.get(row.videoId);
      const viewCount = d?.statistics?.viewCount ? Number(d.statistics.viewCount) : null;
      const duration = d?.contentDetails?.duration || '';
      const embeddable = d?.status?.embeddable;
      const blockedInRegion = isBlockedInRegion(regionCode, d);
      return {
        ...row,
        viewCount: Number.isFinite(viewCount) ? viewCount : null,
        duration,
        embeddable: typeof embeddable === 'boolean' ? embeddable : null,
        blockedInRegion,
      };
    });
  }

  // 1) Preferred: embeddable (best UX in modal iframe), and non-FIFA channels.
  const strict = (await searchOnce({ requireEmbeddable: true }))
    .filter((row) => !shouldSkipVideo(row))
    .filter((row) => !row.blockedInRegion)
    .slice(0, desired);
  if (strict.length > 0) return { query, regionCode, items: strict };

  // 2) Fallback: still skip FIFA channels, but allow non-embeddable videos so admins can
  // at least pick a "watch on YouTube" link instead of getting an empty list.
  const relaxed = (await searchOnce({ requireEmbeddable: false }))
    .filter((row) => !shouldSkipVideo(row))
    .filter((row) => !row.blockedInRegion)
    .slice(0, desired);
  return { query, regionCode, items: relaxed };
}

module.exports = { searchMatchHighlights };

