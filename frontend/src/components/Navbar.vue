<template>
  <nav class="navbar fiori-shell-bar">
    <div class="navbar-start">
      <button class="icon-btn mobile-menu-btn" @click="$emit('toggle-sidebar')" :aria-label="t('nav.menu')">
        <NavIcon name="menu" />
      </button>
      <span v-if="adminMode" class="badge badge-admin">{{ t('nav.adminArea') }}</span>
      <span v-else class="navbar-shell-title navbar-shell-title--mobile">{{ t('brand.title') }}</span>
    </div>
    <div class="navbar-user">
      <div class="navbar-actions">
        <router-link to="/help" class="icon-btn" :title="t('help.nav')">
          <NavIcon name="help" />
        </router-link>
        <button
          class="icon-btn"
          :title="t('profile.darkMode')"
          @click="themeStore.toggleTheme()"
        >
          <NavIcon :name="themeStore.theme === 'dark' ? 'sun' : 'moon'" />
        </button>
        <LanguageSwitcher />
        <NotificationBell v-if="!adminMode" />
      </div>
      <div class="navbar-user-block">
        <UserAvatar
          :image-url="authStore.user?.imageUrl"
          :image-cache="authStore.profileImageCache"
          :avatar-color="authStore.user?.avatarColor"
          :avatar-emoji="authStore.user?.avatarEmoji"
          :first-name="authStore.user?.firstName"
          :last-name="authStore.user?.lastName"
          size="sm"
        />
        <div class="navbar-user-text">
          <div class="navbar-user-name">{{ authStore.fullName }}</div>
          <div class="navbar-user-team">{{ authStore.user?.team?.name || t('common.noTeam') }}</div>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm navbar-logout" @click="handleLogout">{{ t('nav.logout') }}</button>
    </div>
  </nav>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import NotificationBell from './NotificationBell.vue';
import LanguageSwitcher from './LanguageSwitcher.vue';
import UserAvatar from './UserAvatar.vue';
import NavIcon from './NavIcon.vue';

defineProps({
  adminMode: { type: Boolean, default: false },
});

defineEmits(['toggle-sidebar']);

const { t } = useI18n();
const authStore = useAuthStore();
const themeStore = useThemeStore();
const router = useRouter();

async function handleLogout() {
  await authStore.logoutAsync();
  router.push('/login');
}
</script>

<style scoped>
.navbar-start {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.navbar-user {
  gap: 0.75rem;
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding-right: 0.75rem;
  border-right: 1px solid var(--color-border);
}

.navbar-user-block {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.navbar-user-text {
  line-height: 1.25;
}

.navbar-user-name {
  font-weight: 600;
  font-size: 0.8125rem;
}

.navbar-user-team {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.navbar-logout {
  margin-left: 0.25rem;
}

@media (max-width: 768px) {
  .navbar-user-text,
  .navbar-logout {
    display: none;
  }

  .navbar-actions {
    padding-right: 0;
    border-right: none;
  }
}
</style>
