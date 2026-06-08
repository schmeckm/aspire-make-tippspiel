<template>
  <img
    v-if="imageSrc"
    :src="imageSrc"
    :alt="name"
    class="team-avatar"
    :class="sizeClass"
    loading="lazy"
    decoding="async"
  />
  <span v-else class="team-avatar team-avatar-fallback" :class="sizeClass">
    {{ initials }}
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  imageUrl: { type: String, default: null },
  name: { type: String, default: '' },
  size: { type: String, default: 'md' },
});

const imageSrc = computed(() => props.imageUrl || null);

const initials = computed(() => {
  const parts = (props.name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
});

const sizeClass = computed(() => `team-avatar-${props.size}`);
</script>

<style scoped>
.team-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm, 0.25rem);
  object-fit: cover;
  flex-shrink: 0;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
}

.team-avatar-fallback {
  font-weight: 700;
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

.team-avatar-sm {
  width: 1.75rem;
  height: 1.75rem;
  font-size: 0.65rem;
}

.team-avatar-md {
  width: 2.5rem;
  height: 2.5rem;
  font-size: 0.75rem;
}

.team-avatar-lg {
  width: 4rem;
  height: 4rem;
  font-size: 1rem;
}
</style>
