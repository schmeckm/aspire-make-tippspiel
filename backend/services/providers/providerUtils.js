const STATUS_MAP = {
  SCHEDULED: 'scheduled',
  TIMED: 'scheduled',
  NOT_STARTED: 'scheduled',
  NS: 'scheduled',
  IN_PLAY: 'live',
  LIVE: 'live',
  '1H': 'live',
  '2H': 'live',
  ET: 'live',
  BT: 'live',
  PAUSED: 'halftime',
  HALFTIME: 'halftime',
  HT: 'halftime',
  FINISHED: 'finished',
  FT: 'finished',
  AET: 'finished',
  PEN: 'finished',
  POSTPONED: 'postponed',
  CANCELLED: 'cancelled',
  SUSPENDED: 'suspended',
  ABANDONED: 'cancelled',
  CANCL: 'cancelled',
  PST: 'postponed',
};

function mapStatus(externalStatus) {
  if (!externalStatus) return 'scheduled';
  const key = String(externalStatus).toUpperCase().replace(/ /g, '_');
  return STATUS_MAP[key] || 'scheduled';
}

async function fetchJson(url, headers = {}, { timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`API request failed: ${response.status} ${response.statusText}${body ? ` – ${body.slice(0, 200)}` : ''}`);
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function buildNormalizedFixture(fields) {
  return {
    externalApiId: fields.externalApiId ? String(fields.externalApiId) : null,
    matchNumber: fields.matchNumber || null,
    stage: fields.stage || 'Group Stage',
    groupName: fields.groupName || null,
    homeTeam: fields.homeTeam || 'TBD',
    awayTeam: fields.awayTeam || 'TBD',
    kickoffTime: fields.kickoffTime,
    timezone: fields.timezone || null,
    stadium: fields.stadium || null,
    city: fields.city || null,
    homeScore: fields.homeScore ?? null,
    awayScore: fields.awayScore ?? null,
    status: fields.status || 'scheduled',
    apiLastStatus: fields.apiLastStatus || fields.status || 'scheduled',
    rawJson: fields.rawJson || null,
    dataSource: fields.dataSource || null,
    apiProvider: fields.apiProvider || null,
  };
}

module.exports = {
  STATUS_MAP,
  mapStatus,
  fetchJson,
  buildNormalizedFixture,
};
