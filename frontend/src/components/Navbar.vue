<template>
  <nav class="navbar" :class="{ 'navbar--admin': adminMode }">
    <div class="navbar-start">
      <button class="icon-btn mobile-menu-btn" @click="$emit('toggle-sidebar')" :aria-label="t('nav.menu')">
        <NavIcon name="menu" />
      </button>
      <router-link
        v-if="adminMode"
        to="/dashboard"
        class="icon-btn navbar-back-btn"
        :title="t('nav.backToApp')"
      >
        <NavIcon name="arrow-left" />
      </router-link>
      <AppBrandMark v-if="!adminMode" compact :show-title="false" class="navbar-brand-mark" />
      <span v-if="adminMode" class="badge badge-admin">{{ t('nav.adminArea') }}</span>
      <span v-else class="navbar-shell-title navbar-shell-title--mobile">{{ t('brand.title') }}</span>
    </div>
    <div class="navbar-user">
      <div class="navbar-actions">
        <router-link to="/help" class="icon-btn navbar-action--desktop" :title="t('help.nav')">
          <NavIcon name="help" />
        </router-link>
        <button
          class="icon-btn navbar-theme-toggle"
          :title="t('profile.darkMode')"
          @click="themeStore.toggleTheme()"
        >
          <NavIcon :name="themeStore.theme === 'dark' ? 'sun' : 'moon'" />
        </button>
        <div class="navbar-action--desktop">
          <LanguageSwitcher />
        </div>
        <div v-if="!adminMode" class="navbar-notification">
          <NotificationBell />
        </div>
      </div>
      <router-link to="/profile" class="navbar-user-block" :title="t('nav.profile')">
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
      </router-link>
      <button class="btn btn-secondary btn-sm navbar-logout" @click="handleLogout">{{ t('nav.logout') }}</button>
    </div>
  </nav>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import AppBrandMark from './AppBrandMark.vue';
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
  text-decoration: none;
  color: inherit;
  border-radius: var(--radius-sm);
  padding: 0.2rem 0.4rem;
  margin: -0.2rem -0.4rem;
  transition: background 0.15s ease;
}

.navbar-user-block:hover {
  background: var(--color-bg);
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

.navbar-brand-mark {
  display: none;
}

.navbar-back-btn {
  color: var(--color-text-muted);
}

.navbar-back-btn:hover {
  color: var(--color-primary);
}

@media (max-width: 768px) {
  .navbar {
    min-height: 3.25rem;
    padding: 0 0.75rem;
  }

  .navbar-user-text,
  .navbar-logout {
    display: none;
  }

  .navbar-action--desktop {
    display: none;
  }

  .navbar-actions {
    padding-right: 0;
    border-right: none;
    gap: 0.125rem;
  }

  .navbar-user {
    gap: 0.5rem;
  }

  .navbar-user-block {
    padding: 0;
    margin: 0;
  }

  .navbar-shell-title--mobile {
    font-size: 0.9375rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
}
</style>
