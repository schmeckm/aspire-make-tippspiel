const { parse } = require('csv-parse/sync');
const { Match } = require('../models');

const REQUIRED_COLUMNS = [
  'matchNumber',
  'stage',
  'groupName',
  'homeTeam',
  'awayTeam',
  'kickoffTime',
  'stadium',
  'city',
];

function validateColumns(headers) {
  return REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
}

function parseKickoffTime(value, rowNum) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Zeile ${rowNum}: Ungültiges kickoffTime-Format "${value}"`);
  }
  return date;
}

async function importMatchesFromCsv(csvContent) {
  const summary = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  let records;
  try {
    records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch (error) {
    summary.errors.push({ row: 0, message: `CSV-Parsing fehlgeschlagen: ${error.message}` });
    return summary;
  }

  if (records.length === 0) {
    summary.errors.push({ row: 0, message: 'CSV-Datei enthält keine Datenzeilen.' });
    return summary;
  }

  const headers = Object.keys(records[0]);
  const missing = validateColumns(headers);
  if (missing.length > 0) {
    summary.errors.push({ row: 0, message: `Fehlende Spalten: ${missing.join(', ')}` });
    return summary;
  }

  const seenMatchNumbers = new Set();

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2;

    try {
      const matchNumber = parseInt(row.matchNumber, 10);
      if (Number.isNaN(matchNumber)) {
        throw new Error(`Ungültige matchNumber: "${row.matchNumber}"`);
      }

      if (seenMatchNumbers.has(matchNumber)) {
        summary.skipped++;
        summary.errors.push({ row: rowNum, message: `Doppelte matchNumber ${matchNumber} in CSV übersprungen.` });
        continue;
      }
      seenMatchNumbers.add(matchNumber);

      if (!row.stage || !row.homeTeam || !row.awayTeam || !row.kickoffTime) {
        throw new Error('Pflichtfelder stage, homeTeam, awayTeam oder kickoffTime fehlen.');
      }

      const kickoffTime = parseKickoffTime(row.kickoffTime, rowNum);

      const matchData = {
        matchNumber,
        stage: row.stage.trim(),
        groupName: row.groupName?.trim() || null,
        homeTeam: row.homeTeam.trim(),
        awayTeam: row.awayTeam.trim(),
        kickoffTime,
        stadium: row.stadium?.trim() || null,
        city: row.city?.trim() || null,
        dataSource: 'csv',
        isApiManaged: false,
        apiProvider: null,
        syncError: null,
      };

      const existing = await Match.findOne({ where: { matchNumber } });
      if (existing) {
        if (existing.isManuallyLocked && existing.dataSource === 'api') {
          summary.skipped++;
          summary.errors.push({
            row: rowNum,
            message: `Spiel #${matchNumber} ist API-gesperrt und wurde übersprungen.`,
          });
          continue;
        }
        await existing.update(matchData);
        summary.updated++;
      } else {
        await Match.create({ ...matchData, status: 'scheduled' });
        summary.created++;
      }
    } catch (error) {
      summary.errors.push({ row: rowNum, message: error.message });
    }
  }

  return summary;
}

module.exports = { importMatchesFromCsv, REQUIRED_COLUMNS };
