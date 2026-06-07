const { teamsMatch } = require('./wm2026ScheduleLookup');

/**
 * Curated FIFA World Cup head-to-head records for pairs that cannot be resolved
 * via football-data.org on the free tier (no bridge match in the current season).
 * Sources: official FIFA World Cup match records.
 */
const WC_HISTORICAL_PAIRINGS = [
  {
    teamA: 'Germany',
    teamB: 'Argentina',
    meetings: [
      {
        date: '2014-07-13T19:00:00Z',
        competition: 'FIFA World Cup',
        seasonYear: 2014,
        stage: 'FINAL',
        homeTeam: 'Germany',
        awayTeam: 'Argentina',
        homeScore: 1,
        awayScore: 0,
      },
      {
        date: '2010-07-03T18:00:00Z',
        competition: 'FIFA World Cup',
        seasonYear: 2010,
        stage: 'QUARTER_FINALS',
        homeTeam: 'Germany',
        awayTeam: 'Argentina',
        homeScore: 4,
        awayScore: 0,
      },
      {
        date: '2006-06-30T20:00:00Z',
        competition: 'FIFA World Cup',
        seasonYear: 2006,
        stage: 'QUARTER_FINALS',
        homeTeam: 'Germany',
        awayTeam: 'Argentina',
        homeScore: 1,
        awayScore: 1,
      },
      {
        date: '1990-07-08T19:00:00Z',
        competition: 'FIFA World Cup',
        seasonYear: 1990,
        stage: 'FINAL',
        homeTeam: 'Germany',
        awayTeam: 'Argentina',
        homeScore: 1,
        awayScore: 0,
      },
      {
        date: '1986-06-29T19:00:00Z',
        competition: 'FIFA World Cup',
        seasonYear: 1986,
        stage: 'FINAL',
        homeTeam: 'Argentina',
        awayTeam: 'Germany',
        homeScore: 3,
        awayScore: 2,
      },
      {
        date: '1982-06-29T18:00:00Z',
        competition: 'FIFA World Cup',
        seasonYear: 1982,
        stage: 'GROUP_STAGE',
        homeTeam: 'Argentina',
        awayTeam: 'Germany',
        homeScore: 2,
        awayScore: 1,
      },
    ],
  },
];

function normalizeMeeting(meeting) {
  let winner = null;
  if (meeting.homeScore > meeting.awayScore) winner = 'home';
  else if (meeting.awayScore > meeting.homeScore) winner = 'away';
  else winner = 'draw';

  return {
    id: null,
    date: meeting.date,
    competition: meeting.competition,
    seasonYear: meeting.seasonYear,
    stage: meeting.stage,
    homeTeam: meeting.homeTeam,
    awayTeam: meeting.awayTeam,
    homeScore: meeting.homeScore,
    awayScore: meeting.awayScore,
    winner,
  };
}

function findHistoricalHeadToHead(teamAName, teamBName) {
  const pairing = WC_HISTORICAL_PAIRINGS.find((entry) => (
    (teamsMatch(entry.teamA, teamAName) && teamsMatch(entry.teamB, teamBName))
    || (teamsMatch(entry.teamA, teamBName) && teamsMatch(entry.teamB, teamAName))
  ));
  if (!pairing) return null;

  const meetings = pairing.meetings.map(normalizeMeeting);
  return {
    teamA: teamAName,
    teamB: teamBName,
    meetings,
  };
}

module.exports = {
  findHistoricalHeadToHead,
  WC_HISTORICAL_PAIRINGS,
};
