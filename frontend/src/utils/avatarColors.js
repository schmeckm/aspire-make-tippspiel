export const AVATAR_COLOR_OPTIONS = [
  { id: 'default', labelKey: 'profile.avatarColors.default', bg: null, text: null },
  { id: 'forest', labelKey: 'profile.avatarColors.forest', bg: '#0d4f3c', text: '#ffffff' },
  { id: 'ocean', labelKey: 'profile.avatarColors.ocean', bg: '#1565a8', text: '#ffffff' },
  { id: 'sunset', labelKey: 'profile.avatarColors.sunset', bg: '#c45c26', text: '#ffffff' },
  { id: 'berry', labelKey: 'profile.avatarColors.berry', bg: '#8e3a6a', text: '#ffffff' },
  { id: 'violet', labelKey: 'profile.avatarColors.violet', bg: '#5b4ba8', text: '#ffffff' },
  { id: 'slate', labelKey: 'profile.avatarColors.slate', bg: '#4a5568', text: '#ffffff' },
  { id: 'gold', labelKey: 'profile.avatarColors.gold', bg: '#b8860b', text: '#ffffff' },
  { id: 'coral', labelKey: 'profile.avatarColors.coral', bg: '#d45d5d', text: '#ffffff' },
];

const COLOR_BY_ID = Object.fromEntries(
  AVATAR_COLOR_OPTIONS.map((option) => [option.id, option]),
);

export function resolveAvatarColorStyle(avatarColor) {
  const option = COLOR_BY_ID[avatarColor] || COLOR_BY_ID.default;
  if (!option.bg) return null;
  return { backgroundColor: option.bg, color: option.text, borderColor: option.bg };
}
