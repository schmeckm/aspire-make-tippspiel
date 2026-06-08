<template>
  <img
    v-if="imageSrc"
    :src="imageSrc"
    :alt="name"
    class="user-avatar"
    :class="sizeClass"
    loading="lazy"
    decoding="async"
  />
  <span
    v-else
    class="user-avatar user-avatar-fallback"
    :class="[sizeClass, { 'user-avatar-emoji': faceEmoji }]"
    :style="fallbackStyle"
  >
    {{ faceEmoji || initials }}
  </span>
</template>

<script setup>
import { computed } from 'vue';
import { resolveAvatarColorStyle } from '../utils/avatarColors';
import { resolveAvatarFaceEmoji } from '../utils/avatarFaces';

const props = defineProps({
  imageUrl: { type: String, default: null },
  imageCache: { type: Number, default: 0 },
  avatarColor: { type: String, default: 'default' },
  avatarEmoji: { type: String, default: null },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  name: { type: String, default: '' },
  size: { type: String, default: 'md' },
});

const displayName = computed(() => {
  if (props.name) return props.name;
  return `${props.firstName} ${props.lastName}`.trim();
});

const imageSrc = computed(() => {
  if (!props.imageUrl) return null;
  if (props.imageUrl.startsWith('blob:') || props.imageUrl.startsWith('data:')) {
    return props.imageUrl;
  }
  if (props.imageUrl.includes('?v=') || !props.imageCache) return props.imageUrl;
  const separator = props.imageUrl.includes('?') ? '&' : '?';
  return `${props.imageUrl}${separator}v=${props.imageCache}`;
});

const faceEmoji = computed(() => resolveAvatarFaceEmoji(props.avatarEmoji));

const initials = computed(() => {
  const first = props.firstName?.trim();
  const last = props.lastName?.trim();
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  const full = displayName.value;
  const parts = full.split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
});

const sizeClass = computed(() => `user-avatar-${props.size}`);

const fallbackStyle = computed(() => resolveAvatarColorStyle(props.avatarColor));
</script>

<style scoped>
.user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
}

.user-avatar-fallback {
  font-weight: 700;
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

.user-avatar-emoji {
  font-weight: normal;
  line-height: 1;
}

.user-avatar-xs {
  width: 1.5rem;
  height: 1.5rem;
  font-size: 0.55rem;
}

.user-avatar-sm {
  width: 2rem;
  height: 2rem;
  font-size: 0.65rem;
}

.user-avatar-md {
  width: 3rem;
  height: 3rem;
  font-size: 0.85rem;
}

.user-avatar-lg {
  width: 5rem;
  height: 5rem;
  font-size: 1.1rem;
}

.user-avatar-emoji.user-avatar-xs {
  font-size: 0.85rem;
}

.user-avatar-emoji.user-avatar-sm {
  font-size: 1.1rem;
}

.user-avatar-emoji.user-avatar-md {
  font-size: 1.6rem;
}

.user-avatar-emoji.user-avatar-lg {
  font-size: 2.6rem;
}
</style>
