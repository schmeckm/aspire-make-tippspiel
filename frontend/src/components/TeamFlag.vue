<template>
  <component
    :is="linkToSquad ? 'router-link' : 'span'"
    :to="linkToSquad ? squadLink : undefined"
    class="team-with-flag"
    :class="{ inline, clickable: linkToSquad, 'has-crest': !!displayCrest }"
  >
    <img
      v-if="displayCrest"
      :key="displayCrest"
      :src="displayCrest"
      :alt="name"
      class="team-crest"
      loading="lazy"
      referrerpolicy="no-referrer"
      @error="onCrestError"
    />
    <span v-else class="team-tla">{{ teamTla }}</span>
    <span v-if="!hideName" class="team-name">{{ name }}</span>
  </component>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { getTeamIso } from '../utils/flags';
import { useFootballTeamStore } from '../stores/footballTeamStore';

const props = defineProps({
  name: { type: String, required: true },
  inline: { type: Boolean, default: false },
  linkToSquad: { type: Boolean, default: false },
  crest: { type: String, default: '' },
  hideName: { type: Boolean, default: false },
});

const footballTeamStore = useFootballTeamStore();
const crestFailed = ref(false);

onMounted(() => {
  footballTeamStore.ensureLoaded();
});

watch(() => footballTeamStore.loaded, () => {
  crestFailed.value = false;
});

watch(() => props.name, () => {
  crestFailed.value = false;
});

const teamTla = computed(() => getTeamIso(props.name) || props.name.slice(0, 3).toUpperCase());

const displayCrest = computed(() => {
  if (crestFailed.value) return '';
  if (props.crest) return props.crest;
  if (!footballTeamStore.loaded && !footballTeamStore.loading) {
    footballTeamStore.ensureLoaded();
  }
  void footballTeamStore.loaded;
  return footballTeamStore.crestFor(props.name);
});

const squadLink = computed(() => ({
  path: '/national-teams',
  query: { team: footballTeamStore.canonicalFor(props.name) },
}));

function onCrestError() {
  crestFailed.value = true;
}
</script>

<style scoped>
.team-with-flag {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: inherit;
  text-decoration: none;
}

.team-with-flag:not(.inline) {
  flex-direction: column;
  gap: 0.35rem;
}

.team-with-flag.has-crest:not(.inline) .team-crest {
  width: 3rem;
  height: 3rem;
}

.team-with-flag.clickable:hover .team-name {
  color: var(--color-primary);
  text-decoration: underline;
}

.team-tla {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.25rem;
  height: 2.25rem;
  padding: 0 0.35rem;
  border-radius: var(--radius-sm);
  background: var(--color-primary-soft);
  border: 1px solid var(--color-border);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--color-primary-dark);
}

.team-with-flag.has-crest:not(.inline) .team-tla {
  min-width: 3rem;
  height: 3rem;
  font-size: 0.75rem;
}

.team-crest {
  width: 1.75rem;
  height: 1.75rem;
  object-fit: contain;
}

.team-with-flag.inline .team-crest,
.team-with-flag.inline .team-tla {
  width: 1.25rem;
  height: 1.25rem;
  min-width: 1.25rem;
  font-size: 0.65rem;
}

.team-name {
  font-weight: inherit;
  text-align: center;
}
</style>
