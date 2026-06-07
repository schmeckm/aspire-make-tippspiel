const { Op } = require('sequelize');
const { Match } = require('../models');
const {
  WM2026_KNOCKOUT_BRACKET,
  GROUP_POSITION_OUTLOOK,
} = require('../data/wm2026KnockoutBracket');

const UPCOMING_STATUSES = ['scheduled', 'live', 'halftime'];
const FINISHED_STATUS = 'finished';

function emptyTeamStats(name) {
  return {
    team: { name },
    playedGames: 0,
    won: 0,
    draw: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  };
}

function applyMatchResult(stats, isHome, homeScore, awayScore) {
  const scored = isHome ? homeScore : awayScore;
  const conceded = isHome ? awayScore : homeScore;
  stats.playedGames += 1;
  stats.goalsFor += scored;
  stats.goalsAgainst += conceded;
  if (scored > conceded) {
    stats.won += 1;
    stats.points += 3;
  } else if (scored === conceded) {
    stats.draw += 1;
    stats.points += 1;
  } else {
    stats.lost += 1;
  }
}

function sortStandings(rows) {
  return rows
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const goalDiffA = a.goalsFor - a.goalsAgainst;
      const goalDiffB = b.goalsFor - b.goalsAgainst;
      if (goalDiffB !== goalDiffA) return goalDiffB - goalDiffA;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.team.name.localeCompare(b.team.name);
    })
    .map((row, index) => ({ ...row, position: index + 1 }));
}

function isFinishedGroupMatch(match) {
  return match.status === FINISHED_STATUS
    && match.homeScore != null
    && match.awayScore != null;
}

function isUpcomingMatch(match) {
  return UPCOMING_STATUSES.includes(match.status);
}

function normalizeMatchSummary(match) {
  return {
    id: match.id,
    matchNumber: match.matchNumber,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    kickoffTime: match.kickoffTime,
    status: match.status,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    groupName: match.groupName || null,
    stage: match.stage,
  };
}

function buildGroupStandingsFromMatches(matches) {
  const groups = new Map();

  for (const match of matches) {
    const group = String(match.groupName).trim().toUpperCase();
    if (!group) continue;

    if (!groups.has(group)) {
      groups.set(group, { group, teams: new Map(), matches: [] });
    }

    const groupData = groups.get(group);
    groupData.matches.push(match);

    for (const teamName of [match.homeTeam, match.awayTeam]) {
      if (!groupData.teams.has(teamName)) {
        groupData.teams.set(teamName, emptyTeamStats(teamName));
      }
    }
  }

  const result = [];

  for (const groupData of groups.values()) {
    for (const match of groupData.matches) {
      if (!isFinishedGroupMatch(match)) continue;
      applyMatchResult(
        groupData.teams.get(match.homeTeam),
        true,
        match.homeScore,
        match.awayScore,
      );
      applyMatchResult(
        groupData.teams.get(match.awayTeam),
        false,
        match.homeScore,
        match.awayScore,
      );
    }

    const table = sortStandings([...groupData.teams.values()]);
    const nextMatches = groupData.matches
      .filter(isUpcomingMatch)
      .sort((a, b) => new Date(a.kickoffTime) - new Date(b.kickoffTime))
      .slice(0, 3)
      .map(normalizeMatchSummary);

    result.push({
      group: groupData.group,
      type: 'TOTAL',
      stage: 'GROUP_STAGE',
      table,
      nextMatches,
    });
  }

  return result.sort((a, b) => a.group.localeCompare(b.group));
}

function parseThirdPlaceGroups(slot) {
  if (!slot?.startsWith('3_')) return [];
  return slot.slice(2).split('');
}

function getTeamAtPosition(standingsByGroup, group, position) {
  const block = standingsByGroup.get(group);
  return block?.table.find((row) => row.position === position) || null;
}

function rankThirdPlaceTeams(groups) {
  const thirds = groups
    .map((block) => {
      const row = block.table.find((entry) => entry.position === 3);
      if (!row) return null;
      return {
        group: block.group,
        ...row,
      };
    })
    .filter(Boolean);

  return sortStandings(thirds).map((row, index) => ({
    ...row,
    thirdPlaceRank: index + 1,
    thirdPlaceQualified: index < 8,
  }));
}

function getKnockoutWinner(match) {
  if (!isFinishedGroupMatch(match)) return null;
  if (match.homeScore > match.awayScore) return match.homeTeam;
  if (match.awayScore > match.homeScore) return match.awayTeam;
  return null;
}

function resolveSlot(slot, standingsByGroup, knockoutByNumber, thirdPlaceRanking, depth = 0) {
  if (!slot || depth > 6) {
    return { team: null, label: slot, resolved: false, projected: false };
  }

  const groupPosMatch = slot.match(/^([12])([A-L])$/);
  if (groupPosMatch) {
    const position = parseInt(groupPosMatch[1], 10);
    const group = groupPosMatch[2];
    const row = getTeamAtPosition(standingsByGroup, group, position);
    if (row) {
      return {
        team: row.team.name,
        label: slot,
        resolved: true,
        projected: row.playedGames < 3,
      };
    }
    return { team: null, label: slot, resolved: false, projected: false };
  }

  if (slot.startsWith('3_')) {
    const eligibleGroups = parseThirdPlaceGroups(slot);
    const candidates = thirdPlaceRanking.filter((entry) => eligibleGroups.includes(entry.group));
    const best = candidates[0];
    return {
      team: best?.team?.name || null,
      label: slot,
      resolved: false,
      projected: !!best,
      eligibleGroups,
      candidates: candidates.map((entry) => ({
        group: entry.group,
        team: entry.team.name,
        thirdPlaceRank: entry.thirdPlaceRank,
        qualified: entry.thirdPlaceQualified,
      })),
    };
  }

  if (slot.startsWith('W')) {
    const matchNumber = parseInt(slot.slice(1), 10);
    const finished = knockoutByNumber.get(matchNumber);
    const winner = finished ? getKnockoutWinner(finished) : null;
    if (winner) {
      return { team: winner, label: slot, resolved: true, projected: false };
    }

    const bracketDef = WM2026_KNOCKOUT_BRACKET.find((entry) => entry.matchNumber === matchNumber);
    if (!bracketDef) {
      return { team: null, label: slot, resolved: false, projected: false };
    }

    const home = resolveSlot(bracketDef.home, standingsByGroup, knockoutByNumber, thirdPlaceRanking, depth + 1);
    const away = resolveSlot(bracketDef.away, standingsByGroup, knockoutByNumber, thirdPlaceRanking, depth + 1);
    return {
      team: null,
      label: slot,
      resolved: false,
      projected: home.team && away.team,
      projectedMatchup: { home: home.team, away: away.team },
    };
  }

  return { team: null, label: slot, resolved: false, projected: false };
}

function buildGroupOutlook(groups, thirdPlaceRanking) {
  const standingsByGroup = new Map(groups.map((block) => [block.group, block]));

  for (const block of groups) {
    block.outlook = [];

    for (const row of block.table) {
      if (row.position > 3) continue;

      if (row.position === 3) {
        const thirdMeta = thirdPlaceRanking.find((entry) => entry.group === block.group);
        block.outlook.push({
          position: 3,
          team: row.team.name,
          thirdPlaceRank: thirdMeta?.thirdPlaceRank || null,
          thirdPlaceQualified: thirdMeta?.thirdPlaceQualified ?? false,
        });
        continue;
      }

      const mapping = GROUP_POSITION_OUTLOOK[block.group]?.[row.position];
      if (!mapping) continue;

      const opponent = resolveSlot(
        mapping.opponentSlot,
        standingsByGroup,
        new Map(),
        thirdPlaceRanking,
      );

      block.outlook.push({
        position: row.position,
        team: row.team.name,
        knockoutMatchNumber: mapping.matchNumber,
        opponentSlot: mapping.opponentSlot,
        opponentTeam: opponent.team,
        opponentLabel: opponent.label,
        opponentCandidates: opponent.candidates || null,
        projected: opponent.projected,
      });
    }
  }
}

function buildKnockoutPath(groups, allMatches) {
  const standingsByGroup = new Map(groups.map((block) => [block.group, block]));
  const thirdPlaceRanking = rankThirdPlaceTeams(groups);
  const knockoutByNumber = new Map(
    allMatches
      .filter((match) => !match.groupName)
      .map((match) => [match.matchNumber, match]),
  );

  return WM2026_KNOCKOUT_BRACKET.map((entry) => {
    const dbMatch = knockoutByNumber.get(entry.matchNumber);
    const home = resolveSlot(entry.home, standingsByGroup, knockoutByNumber, thirdPlaceRanking);
    const away = resolveSlot(entry.away, standingsByGroup, knockoutByNumber, thirdPlaceRanking);

    let homeTeam = home.team;
    let awayTeam = away.team;
    if (!homeTeam && home.projectedMatchup) homeTeam = home.projectedMatchup.home;
    if (!awayTeam && away.projectedMatchup) awayTeam = away.projectedMatchup.away;

    return {
      matchNumber: entry.matchNumber,
      stage: entry.stage,
      kickoffTime: dbMatch?.kickoffTime || null,
      status: dbMatch?.status || 'scheduled',
      homeScore: dbMatch?.homeScore ?? null,
      awayScore: dbMatch?.awayScore ?? null,
      homeSlot: entry.home,
      awaySlot: entry.away,
      homeTeam,
      awayTeam,
      homeLabel: home.label,
      awayLabel: away.label,
      homeResolved: home.resolved,
      awayResolved: away.resolved,
      projected: (!home.resolved || !away.resolved) && (home.projected || away.projected),
      awayCandidates: away.candidates || null,
    };
  });
}

function buildUpcomingGroupMatches(matches, limit = 12) {
  return matches
    .filter((match) => match.groupName && isUpcomingMatch(match))
    .sort((a, b) => new Date(a.kickoffTime) - new Date(b.kickoffTime))
    .slice(0, limit)
    .map(normalizeMatchSummary);
}

async function getGroupStandings() {
  const [groupMatches, allMatches] = await Promise.all([
    Match.findAll({
      where: { groupName: { [Op.ne]: null } },
      attributes: [
        'id', 'matchNumber', 'groupName', 'homeTeam', 'awayTeam',
        'homeScore', 'awayScore', 'status', 'kickoffTime', 'stage',
      ],
      raw: true,
    }),
    Match.findAll({
      attributes: [
        'id', 'matchNumber', 'groupName', 'homeTeam', 'awayTeam',
        'homeScore', 'awayScore', 'status', 'kickoffTime', 'stage',
      ],
      raw: true,
    }),
  ]);

  const groups = buildGroupStandingsFromMatches(groupMatches);
  const thirdPlaceRanking = rankThirdPlaceTeams(groups);
  buildGroupOutlook(groups, thirdPlaceRanking);

  return {
    groups,
    upcomingGroupMatches: buildUpcomingGroupMatches(groupMatches),
    knockoutPath: buildKnockoutPath(groups, allMatches),
    thirdPlaceRanking,
  };
}

module.exports = {
  buildGroupStandingsFromMatches,
  buildKnockoutPath,
  buildUpcomingGroupMatches,
  rankThirdPlaceTeams,
  getGroupStandings,
};
