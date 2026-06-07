/**
 * FIFA WM 2026 knockout bracket (Regulations §12.6–12.9).
 * Slots: 1X/2X = group winner/runner-up, 3_XXX = best third from listed groups, WX = winner match X.
 */
const WM2026_KNOCKOUT_BRACKET = [
  { stage: 'LAST_32', matchNumber: 73, home: '2A', away: '2B' },
  { stage: 'LAST_32', matchNumber: 74, home: '1E', away: '3_ABCDF' },
  { stage: 'LAST_32', matchNumber: 75, home: '1F', away: '2C' },
  { stage: 'LAST_32', matchNumber: 76, home: '1C', away: '2F' },
  { stage: 'LAST_32', matchNumber: 77, home: '1I', away: '3_CDFGH' },
  { stage: 'LAST_32', matchNumber: 78, home: '2E', away: '2I' },
  { stage: 'LAST_32', matchNumber: 79, home: '1A', away: '3_CEFHI' },
  { stage: 'LAST_32', matchNumber: 80, home: '1L', away: '3_EHIJK' },
  { stage: 'LAST_32', matchNumber: 81, home: '1D', away: '3_BEFIJ' },
  { stage: 'LAST_32', matchNumber: 82, home: '1G', away: '3_AEHIJ' },
  { stage: 'LAST_32', matchNumber: 83, home: '2K', away: '2L' },
  { stage: 'LAST_32', matchNumber: 84, home: '1H', away: '2J' },
  { stage: 'LAST_32', matchNumber: 85, home: '1B', away: '3_EFGIJ' },
  { stage: 'LAST_32', matchNumber: 86, home: '1J', away: '2H' },
  { stage: 'LAST_32', matchNumber: 87, home: '1K', away: '3_DEIJL' },
  { stage: 'LAST_32', matchNumber: 88, home: '2D', away: '2G' },
  { stage: 'LAST_16', matchNumber: 89, home: 'W74', away: 'W77' },
  { stage: 'LAST_16', matchNumber: 90, home: 'W73', away: 'W75' },
  { stage: 'LAST_16', matchNumber: 91, home: 'W76', away: 'W78' },
  { stage: 'LAST_16', matchNumber: 92, home: 'W79', away: 'W80' },
  { stage: 'LAST_16', matchNumber: 93, home: 'W83', away: 'W84' },
  { stage: 'LAST_16', matchNumber: 94, home: 'W81', away: 'W82' },
  { stage: 'LAST_16', matchNumber: 95, home: 'W86', away: 'W88' },
  { stage: 'LAST_16', matchNumber: 96, home: 'W85', away: 'W87' },
];

const GROUP_POSITION_OUTLOOK = {
  A: { 1: { matchNumber: 79, opponentSlot: '3_CEFHI' }, 2: { matchNumber: 73, opponentSlot: '2B' } },
  B: { 1: { matchNumber: 85, opponentSlot: '3_EFGIJ' }, 2: { matchNumber: 73, opponentSlot: '2A' } },
  C: { 1: { matchNumber: 76, opponentSlot: '2F' }, 2: { matchNumber: 75, opponentSlot: '2C' } },
  D: { 1: { matchNumber: 81, opponentSlot: '3_BEFIJ' }, 2: { matchNumber: 88, opponentSlot: '2G' } },
  E: { 1: { matchNumber: 74, opponentSlot: '3_ABCDF' }, 2: { matchNumber: 78, opponentSlot: '2I' } },
  F: { 1: { matchNumber: 75, opponentSlot: '2C' }, 2: { matchNumber: 76, opponentSlot: '2F' } },
  G: { 1: { matchNumber: 82, opponentSlot: '3_AEHIJ' }, 2: { matchNumber: 88, opponentSlot: '2D' } },
  H: { 1: { matchNumber: 84, opponentSlot: '2J' }, 2: { matchNumber: 86, opponentSlot: '2H' } },
  I: { 1: { matchNumber: 77, opponentSlot: '3_CDFGH' }, 2: { matchNumber: 78, opponentSlot: '2E' } },
  J: { 1: { matchNumber: 86, opponentSlot: '2H' }, 2: { matchNumber: 84, opponentSlot: '2J' } },
  K: { 1: { matchNumber: 87, opponentSlot: '3_DEIJL' }, 2: { matchNumber: 83, opponentSlot: '2L' } },
  L: { 1: { matchNumber: 80, opponentSlot: '3_EHIJK' }, 2: { matchNumber: 83, opponentSlot: '2K' } },
};

module.exports = {
  WM2026_KNOCKOUT_BRACKET,
  GROUP_POSITION_OUTLOOK,
};
