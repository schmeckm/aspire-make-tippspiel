<template>
  <img
    v-if="flagUrl"
    :src="flagUrl"
    :alt="locale"
    class="locale-flag-img"
    loading="lazy"
  />
</template>

<script setup>
import { computed } from 'vue';
import { getLocaleFlagImage } from '../utils/flags';

const props = defineProps({
  locale: { type: String, required: true },
});

const flagUrl = computed(() => getLocaleFlagImage(props.locale));
</script>

<style scoped>
.locale-flag-img {
  width: 1.25rem;
  height: auto;
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
  object-fit: cover;
  aspect-ratio: 4 / 3;
}
</style>
