<template>
  <div class="layout-app" data-area="app">
    <div v-if="sidebarOpen" class="sidebar-backdrop" @click="closeSidebar" />
    <Sidebar ref="sidebarRef" :links="userLinks" :admin-links="adminLinks" />
    <div class="layout-main">
      <Navbar @toggle-sidebar="toggleSidebar" />
      <main class="layout-content">
        <router-view />
      </main>
      <SystemStatusBar />
      <BottomNav />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Sidebar from '../components/Sidebar.vue';
import Navbar from '../components/Navbar.vue';
import BottomNav from '../components/BottomNav.vue';
import SystemStatusBar from '../components/SystemStatusBar.vue';
import { useFootballTeamStore } from '../stores/footballTeamStore';
import { useAdminNavLinks } from '../composables/useAdminNav';

const { t } = useI18n();
const footballTeamStore = useFootballTeamStore();
const adminLinks = useAdminNavLinks();
const sidebarRef = ref(null);
const sidebarOpen = ref(false);

onMounted(() => {
  footballTeamStore.ensureLoaded();
});

function toggleSidebar() {
  sidebarOpen.value = sidebarRef.value?.toggle() ?? false;
}

function closeSidebar() {
  sidebarOpen.value = false;
  sidebarRef.value?.close();
}

const userLinks = computed(() => [
  { to: '/dashboard', label: t('nav.dashboard'), icon: 'home' },
  { to: '/matches', label: t('nav.matches'), icon: 'matches' },
  { to: '/group-standings', label: t('nav.groupStandings'), icon: 'table' },
  { to: '/national-teams', label: t('nav.nationalTeams'), icon: 'globe' },
  { to: '/my-predictions', label: t('nav.myPredictions'), icon: 'edit' },
  { to: '/bonus', label: t('nav.bonus'), icon: 'target' },
  { to: '/ai-coach', label: t('nav.aiCoach'), icon: 'bot' },
  { to: '/leaderboard', label: t('nav.leaderboard'), icon: 'trophy' },
  { to: '/team-ranking', label: t('nav.teamRanking'), icon: 'users' },
  { to: '/statistics', label: t('nav.statistics'), icon: 'chart' },
  { to: '/notifications', label: t('nav.notifications'), icon: 'bell' },
  { to: '/profile', label: t('nav.profile'), icon: 'user' },
]);
</script>
