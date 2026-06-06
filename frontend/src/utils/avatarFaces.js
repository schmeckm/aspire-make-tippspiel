export const AVATAR_FACE_OPTIONS = [
  { id: 'initials', emoji: null, labelKey: 'profile.avatarFaces.initials' },
  { id: 'grin', emoji: '😁', labelKey: 'profile.avatarFaces.grin' },
  { id: 'cool', emoji: '😎', labelKey: 'profile.avatarFaces.cool' },
  { id: 'party', emoji: '🥳', labelKey: 'profile.avatarFaces.party' },
  { id: 'wink', emoji: '😉', labelKey: 'profile.avatarFaces.wink' },
  { id: 'tongue', emoji: '😜', labelKey: 'profile.avatarFaces.tongue' },
  { id: 'star', emoji: '🤩', labelKey: 'profile.avatarFaces.star' },
  { id: 'thinking', emoji: '🤔', labelKey: 'profile.avatarFaces.thinking' },
  { id: 'soccer', emoji: '⚽', labelKey: 'profile.avatarFaces.soccer' },
  { id: 'trophy', emoji: '🏆', labelKey: 'profile.avatarFaces.trophy' },
  { id: 'lion', emoji: '🦁', labelKey: 'profile.avatarFaces.lion' },
  { id: 'clown', emoji: '🤡', labelKey: 'profile.avatarFaces.clown' },
  { id: 'nerd', emoji: '🤓', labelKey: 'profile.avatarFaces.nerd' },
  { id: 'fire', emoji: '🔥', labelKey: 'profile.avatarFaces.fire' },
];

const FACE_BY_ID = Object.fromEntries(
  AVATAR_FACE_OPTIONS.map((option) => [option.id, option]),
);

export function resolveAvatarFaceEmoji(avatarEmoji) {
  if (!avatarEmoji || avatarEmoji === 'initials') return null;
  return FACE_BY_ID[avatarEmoji]?.emoji || null;
}
