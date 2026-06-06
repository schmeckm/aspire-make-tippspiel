/**
 * Generates backend/data/wm2026MatchSchedule.js from Wikipedia wikitext.
 * Run: node scripts/buildWm2026Schedule.js
 */
const fs = require('fs');
const path = require('path');
const { WM2026_VENUES, normalizeStadiumKey } = require('../data/wm2026Venues');

const WIKI_PATH = path.join(__dirname, '../data/wiki-full.json');
const OUT_PATH = path.join(__dirname, '../data/wm2026MatchSchedule.js');

const FIFA_CITY_ALIASES = {
  'mexiko stadt': 'Mexico City',
  'mexico city': 'Mexico City',
  zapopan: 'Guadalajara',
  guadalupe: 'Monterrey',
  monterrey: 'Monterrey',
  inglewood: 'Inglewood',
  'los angeles': 'Inglewood',
  'east rutherford': 'East Rutherford',
  'new york': 'East Rutherford',
  foxborough: 'Foxborough',
  boston: 'Foxborough',
  'santa clara': 'Santa Clara',
  'san francisco': 'Santa Clara',
  'san francisco bay area': 'Santa Clara',
  'miami gardens': 'Miami Gardens',
  miami: 'Miami Gardens',
  arlington: 'Dallas',
  dallas: 'Dallas',
  toronto: 'Toronto',
  vancouver: 'Vancouver',
  houston: 'Houston',
  atlanta: 'Atlanta',
  philadelphia: 'Philadelphia',
  'kansas city': 'Kansas City',
  seattle: 'Seattle',
};

function resolveVenueFromLocation(rawLocation) {
  const cleaned = String(rawLocation || '')
    .replace(/\[\[([^|\]]+)\|[^\]]+\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const key = normalizeStadiumKey(cleaned);
  const city = FIFA_CITY_ALIASES[key]
    || WM2026_VENUES.find((v) => normalizeStadiumKey(v.city) === key)?.city
    || null;

  if (!city) return null;
  const venue = WM2026_VENUES.find((v) => v.city === city);
  if (!venue) return null;
  return { stadium: venue.stadium, city: venue.city };
}

function splitWikitextFields(value) {
  const parts = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < value.length; i += 1) {
    if (value[i] === '{' && value[i + 1] === '{') {
      depth += 1;
      current += '{{';
      i += 1;
      continue;
    }
    if (value[i] === '}' && value[i + 1] === '}') {
      depth -= 1;
      current += '}}';
      i += 1;
      continue;
    }
    if (value[i] === '[' && value[i + 1] === '[') {
      depth += 1;
      current += '[[';
      i += 1;
      continue;
    }
    if (value[i] === ']' && value[i + 1] === ']') {
      depth -= 1;
      current += ']]';
      i += 1;
      continue;
    }
    if (value[i] === '|' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += value[i];
  }

  parts.push(current);
  return parts;
}

function extractLocation(rawDateLocation) {
  const inIndex = rawDateLocation.toLowerCase().lastIndexOf(' in ');
  if (inIndex === -1) return rawDateLocation.trim();
  return rawDateLocation.slice(inIndex + 4).trim();
}

function parseScheduleLines(wikitext) {
  const re = /\{\{Fußballspiel kurz\/Zeile\|(.+?)\}\}/g;
  const matches = [];
  let row;

  while ((row = re.exec(wikitext)) !== null) {
    const fields = splitWikitextFields(row[1]);
    if (fields.length < 3) continue;

    const venue = resolveVenueFromLocation(extractLocation(fields[0]));
    if (!venue) {
      console.warn('Skipped row (unknown venue):', extractLocation(fields[0]));
      continue;
    }

    const homeTeam = fields[1].trim();
    const awayTeam = fields[2].trim();
    if (!homeTeam || !awayTeam || homeTeam.includes('Gruppe') || awayTeam.includes('Gruppe')) {
      continue;
    }

    matches.push({
      homeTeam,
      awayTeam,
      stadium: venue.stadium,
      city: venue.city,
    });
  }

  return matches;
}

function main() {
  if (!fs.existsSync(WIKI_PATH)) {
    console.error(`Missing ${WIKI_PATH}. Download Wikipedia wikitext first.`);
    process.exit(1);
  }

  const wiki = JSON.parse(fs.readFileSync(WIKI_PATH, 'utf8'));
  const wikitext = wiki.parse?.wikitext?.['*'] || '';
  const schedule = parseScheduleLines(wikitext);

  const content = `/**
 * FIFA WM 2026 fixture venues parsed from German Wikipedia (Fußballspiel kurz/Zeile).
 * Regenerate: node scripts/buildWm2026Schedule.js
 */
const WM2026_MATCH_SCHEDULE = ${JSON.stringify(schedule, null, 2)};

module.exports = { WM2026_MATCH_SCHEDULE };
`;

  fs.writeFileSync(OUT_PATH, content, 'utf8');
  console.log(`Wrote ${schedule.length} fixtures to ${OUT_PATH}`);
}

main();
