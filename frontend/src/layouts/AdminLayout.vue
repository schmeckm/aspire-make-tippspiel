<template>
  <div class="layout-app">
    <div v-if="sidebarOpen" class="sidebar-backdrop" @click="closeSidebar" />
    <Sidebar ref="sidebarRef" :links="adminSidebarLinks" admin-mode />
    <div class="layout-main">
      <Navbar admin-mode @toggle-sidebar="toggleSidebar" />
      <main class="layout-content">
        <router-view />
      </main>
      <SystemStatusBar />
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import Sidebar from '../components/Sidebar.vue';
import Navbar from '../components/Navbar.vue';
import SystemStatusBar from '../components/SystemStatusBar.vue';
import { useAdminSidebarLinks } from '../composables/useAdminNav';

const router = useRouter();
const authStore = useAuthStore();
const adminSidebarLinks = useAdminSidebarLinks();
const sidebarRef = ref(null);
const sidebarOpen = ref(false);

onMounted(async () => {
  try {
    await authStore.fetchMe();
  } catch {
    return;
  }
  if (!authStore.isAdmin) {
    router.replace('/dashboard');
  }
});

function toggleSidebar() {
  sidebarOpen.value = sidebarRef.value?.toggle() ?? false;
}

function closeSidebar() {
  sidebarOpen.value = false;
  sidebarRef.value?.close();
}
</script>
