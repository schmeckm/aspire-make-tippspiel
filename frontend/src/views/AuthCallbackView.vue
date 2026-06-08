<template>
  <AuthImmersiveLayout :title="t('auth.signIn')">
    <p class="auth-immersive-muted">{{ t('auth.ssoSigningIn') }}</p>
    <AlertMessage v-if="error" :message="error" type="error" class="auth-immersive-alert" />
    <router-link v-if="error" to="/login" class="auth-immersive-link">{{ t('auth.toLogin') }}</router-link>
  </AuthImmersiveLayout>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore';
import AlertMessage from '../components/AlertMessage.vue';
import AuthImmersiveLayout from '../components/AuthImmersiveLayout.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const error = ref('');

function normalizeCode(raw) {
  if (Array.isArray(raw)) return raw[0] || '';
  return typeof raw === 'string' ? raw : '';
}

onMounted(async () => {
  const code = normalizeCode(route.query.code);
  if (!code) {
    error.value = t('auth.loginFailed');
    return;
  }

  if (authStore.isAuthenticated) {
    router.replace(authStore.isAdmin ? '/admin' : '/dashboard');
    return;
  }

  const exchangeKey = `sso-exchange:${code}`;
  if (sessionStorage.getItem(exchangeKey) === 'done') {
    router.replace(authStore.isAdmin ? '/admin' : '/dashboard');
    return;
  }
  if (sessionStorage.getItem(exchangeKey) === 'pending') {
    return;
  }
  sessionStorage.setItem(exchangeKey, 'pending');

  try {
    await authStore.exchangeSsoCode(code);
    sessionStorage.setItem(exchangeKey, 'done');
    router.replace(authStore.isAdmin ? '/admin' : '/dashboard');
  } catch (err) {
    sessionStorage.removeItem(exchangeKey);
    if (err.response?.data?.code === 'errors.ssoTeamRequired') {
      router.replace({ path: '/auth/complete-registration', query: { code } });
      return;
    }
    error.value = err.response?.data?.error || t('auth.loginFailed');
  }
});
</script>
