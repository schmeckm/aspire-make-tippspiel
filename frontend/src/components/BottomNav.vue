<template>
  <nav class="bottom-nav" :aria-label="t('nav.menu')">
    <router-link
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="bottom-nav-link"
      :class="{ active: isActive(item.to) }"
    >
      <NavIcon :name="item.icon" size="lg" />
      <span>{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import NavIcon from './NavIcon.vue';

const { t } = useI18n();
const route = useRoute();

const items = computed(() => [
  { to: '/dashboard', label: t('nav.dashboard'), icon: 'home' },
  { to: '/matches', label: t('nav.matches'), icon: 'matches' },
  { to: '/leaderboard', label: t('nav.leaderboard'), icon: 'trophy' },
  { to: '/profile', label: t('nav.profile'), icon: 'user' },
]);

function isActive(path) {
  return route.path === path || route.path.startsWith(`${path}/`);
}
</script>
