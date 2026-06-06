const AVATAR_EMOJI_IDS = [
  'grin',
  'cool',
  'party',
  'wink',
  'tongue',
  'star',
  'thinking',
  'soccer',
  'trophy',
  'lion',
  'clown',
  'nerd',
  'fire',
];

function normalizeAvatarEmoji(value) {
  if (value == null || value === '' || value === 'initials') return null;
  const id = String(value).toLowerCase().trim();
  return AVATAR_EMOJI_IDS.includes(id) ? id : null;
}

module.exports = { AVATAR_EMOJI_IDS, normalizeAvatarEmoji };
