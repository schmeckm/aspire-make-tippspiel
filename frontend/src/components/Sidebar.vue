<template>
  <aside class="sidebar" :class="{ open: isOpen }">
    <div class="sidebar-brand">
      <AppBrandMark compact />
    </div>
    <nav class="sidebar-nav">
      <div v-if="!adminMode" class="sidebar-section">{{ t('nav.navigation') }}</div>
      <router-link
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="sidebar-link"
        active-class="active"
        @click="close"
      >
        <span class="icon"><NavIcon :name="link.icon" /></span>
        {{ link.label }}
      </router-link>

      <template v-if="!adminMode && authStore.isAdmin && adminLinks">
        <div class="sidebar-section">{{ t('nav.administration') }}</div>
        <router-link
          v-for="link in adminLinks"
          :key="link.to"
          :to="link.to"
          class="sidebar-link"
          active-class="active"
          @click="close"
        >
          <span class="icon"><NavIcon :name="link.icon" /></span>
          {{ link.label }}
        </router-link>
      </template>
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-footer-name">{{ authStore.fullName }}</div>
    </div>
  </aside>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore';
import AppBrandMark from './AppBrandMark.vue';
import NavIcon from './NavIcon.vue';

defineProps({
  links: { type: Array, required: true },
  adminLinks: { type: Array, default: () => [] },
  adminMode: { type: Boolean, default: false },
});

const { t } = useI18n();
const authStore = useAuthStore();
const isOpen = ref(false);

function toggle() {
  isOpen.value = !isOpen.value;
  return isOpen.value;
}

function close() {
  isOpen.value = false;
}

defineExpose({ toggle, close, isOpen });
</script>
