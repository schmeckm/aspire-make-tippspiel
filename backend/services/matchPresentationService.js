const { resolveVenueImageFromStadium } = require('../data/wm2026Venues');
const { resolveVenueFromWm2026Schedule } = require('../data/wm2026ScheduleLookup');

function resolveStadiumImageUrl(match) {
  if (!match || typeof match !== 'object') return null;

  const fromStadiumName = resolveVenueImageFromStadium(match.stadium);
  if (fromStadiumName) return fromStadiumName;

  const scheduleVenue = resolveVenueFromWm2026Schedule(match.homeTeam, match.awayTeam);
  if (!scheduleVenue?.stadium) return null;

  return resolveVenueImageFromStadium(scheduleVenue.stadium);
}

function attachStadiumImage(match) {
  if (!match || typeof match !== 'object') return match;
  const stadiumImageUrl = resolveStadiumImageUrl(match);
  if (!stadiumImageUrl) return match;
  return { ...match, stadiumImageUrl };
}

function attachStadiumImages(matches) {
  return matches.map(attachStadiumImage);
}

module.exports = {
  resolveStadiumImageUrl,
  attachStadiumImage,
  attachStadiumImages,
};
