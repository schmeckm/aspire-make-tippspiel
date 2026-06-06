const AVATAR_COLORS = [
  'default',
  'forest',
  'ocean',
  'sunset',
  'berry',
  'violet',
  'slate',
  'gold',
  'coral',
];

function normalizeAvatarColor(value) {
  if (value == null || value === '') return 'default';
  const id = String(value).toLowerCase().trim();
  return AVATAR_COLORS.includes(id) ? id : 'default';
}

module.exports = { AVATAR_COLORS, normalizeAvatarColor };
