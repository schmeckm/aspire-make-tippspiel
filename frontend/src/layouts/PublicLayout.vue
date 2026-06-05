<template>
  <div class="layout-public" :class="{ 'layout-public--immersive': isImmersive }">
    <div class="layout-public-content">
      <router-view />
    </div>
    <SystemStatusBar v-if="!isImmersive" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import SystemStatusBar from '../components/SystemStatusBar.vue';

const route = useRoute();
const IMMERSIVE_ROUTES = new Set(['Login', 'Register', 'ForgotPassword', 'ResetPassword', 'VerifyEmail']);
const isImmersive = computed(() => IMMERSIVE_ROUTES.has(route.name));
</script>
