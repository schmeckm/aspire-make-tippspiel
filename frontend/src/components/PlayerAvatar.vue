<template>
  <img
    v-if="showImage"
    :src="imageSrc"
    :alt="name"
    class="player-avatar"
    :class="sizeClass"
    :title="attributionTitle"
    @error="onImageError"
  />
  <span
    v-else
    class="player-avatar player-avatar-fallback"
    :class="sizeClass"
    :title="name || undefined"
  >
    {{ initials }}
  </span>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const ATTRIBUTION_SOURCES = new Set(['wikidata', 'wikipedia']);

const props = defineProps({
  imageUrl: { type: String, default: null },
  name: { type: String, default: '' },
  size: { type: String, default: 'sm' },
  attributionText: { type: String, default: null },
  imageSource: { type: String, default: null },
});

const imageFailed = ref(false);

watch(() => props.imageUrl, () => {
  imageFailed.value = false;
});

const imageSrc = computed(() => props.imageUrl || null);
const showImage = computed(() => !!imageSrc.value && !imageFailed.value);

const initials = computed(() => {
  const parts = (props.name || '').split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
});

const sizeClass = computed(() => `player-avatar-${props.size}`);

const attributionTitle = computed(() => {
  if (!showImage.value) return props.name || undefined;
  if (props.attributionText) return props.attributionText;
  if (props.imageSource && ATTRIBUTION_SOURCES.has(props.imageSource)) {
    return `Image source: ${props.imageSource}`;
  }
  return props.name || undefined;
});

function onImageError() {
  imageFailed.value = true;
}
</script>

<style scoped>
.player-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
}

.player-avatar-fallback {
  font-weight: 700;
  color: var(--color-primary);
  background: var(--color-primary-bg, #e8f4fd);
}

.player-avatar-xs {
  width: 1.5rem;
  height: 1.5rem;
  font-size: 0.55rem;
}

.player-avatar-sm {
  width: 2rem;
  height: 2rem;
  font-size: 0.65rem;
}

.player-avatar-md {
  width: 3rem;
  height: 3rem;
  font-size: 0.85rem;
}

.player-avatar-lg {
  width: 5rem;
  height: 5rem;
  font-size: 1.1rem;
}
</style>
