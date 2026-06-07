<template>
  <span class="team-label">
    <img v-if="crest" :src="crest" :alt="displayName" class="team-label-crest" />
    <span>{{ displayName }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue';
import { useFootballTeamStore } from '../stores/footballTeamStore';

const props = defineProps({
  name: { type: String, required: true },
});

const footballTeamStore = useFootballTeamStore();

const crest = computed(() => footballTeamStore.crestFor(props.name));
const displayName = computed(() => footballTeamStore.canonicalFor(props.name));
</script>

<style scoped>
.team-label {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.team-label-crest {
  width: 16px;
  height: 16px;
  object-fit: contain;
}
</style>
