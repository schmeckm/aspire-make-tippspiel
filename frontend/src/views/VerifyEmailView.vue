<template>
  <AuthImmersiveLayout
    :title="t('auth.verifyEmailTitle')"
    :welcome-text="t('auth.verifyEmailWelcomeText')"
  >
    <LoadingSpinner v-if="loading" />
    <AlertMessage v-if="error" :message="error" type="error" class="auth-immersive-alert" />
    <AlertMessage v-if="success" :message="success" type="success" class="auth-immersive-alert" />
    <p v-if="!token && !loading" class="auth-immersive-muted">{{ t('auth.verifyEmailInvalid') }}</p>

    <template #footer>
      <router-link v-if="success || error || !token" to="/login">{{ t('auth.toLogin') }}</router-link>
    </template>
  </AuthImmersiveLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import AlertMessage from '../components/AlertMessage.vue';
import AuthImmersiveLayout from '../components/AuthImmersiveLayout.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const error = ref('');
const success = ref('');
const token = route.query.token;

onMounted(async () => {
  if (!token) return;
  loading.value = true;
  try {
    const { data } = await api.post('/auth/verify-email', { token });
    authStore.setAuth(data.token, data.user);
    success.value = data.message || t('auth.verifyEmailSuccess');
    setTimeout(() => router.push('/dashboard'), 2000);
  } catch (err) {
    error.value = err.response?.data?.error || t('auth.verifyEmailFailed');
  } finally {
    loading.value = false;
  }
});
</script>
