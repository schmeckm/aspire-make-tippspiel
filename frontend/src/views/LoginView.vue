<template>
  <AuthImmersiveLayout :title="t('auth.signIn')">
    <AlertMessage v-if="error" :message="error" type="error" class="auth-immersive-alert" />
    <AlertMessage v-if="resendMessage" :message="resendMessage" type="success" class="auth-immersive-alert" />

    <form class="auth-immersive-form" @submit.prevent="handleLogin">
      <div class="auth-immersive-field">
        <label for="email">{{ t('auth.emailAddress') }}</label>
        <input
          id="email"
          v-model="email"
          type="email"
          class="auth-immersive-input"
          required
          autocomplete="email"
          :placeholder="t('auth.emailPlaceholder')"
        />
      </div>

      <div class="auth-immersive-field">
        <label for="password">{{ t('auth.password') }}</label>
        <div class="auth-immersive-input-wrap">
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            class="auth-immersive-input"
            required
            autocomplete="current-password"
            placeholder="••••••••"
          />
          <button
            type="button"
            class="auth-immersive-password-toggle"
            :aria-label="showPassword ? t('profile.hidePassword') : t('profile.showPassword')"
            @click="showPassword = !showPassword"
          >
            <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </div>

      <label class="auth-immersive-remember">
        <input v-model="rememberMe" type="checkbox" />
        <span>{{ t('auth.rememberMe') }}</span>
      </label>

      <button type="submit" class="auth-immersive-submit" :disabled="loading">
        {{ loading ? t('auth.signingIn') : t('auth.signInNow') }}
      </button>

      <button
        v-if="showResendVerification"
        type="button"
        class="auth-immersive-secondary"
        :disabled="resending"
        @click="handleResendVerification"
      >
        {{ resending ? t('auth.resendingVerification') : t('auth.resendVerification') }}
      </button>
    </form>

    <router-link to="/forgot-password" class="auth-immersive-link">{{ t('auth.forgotPassword') }}</router-link>

    <template #footer>
      {{ t('auth.noAccount') }}
      <router-link to="/register">{{ t('auth.registerNow') }}</router-link>
    </template>
  </AuthImmersiveLayout>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore';
import AlertMessage from '../components/AlertMessage.vue';
import AuthImmersiveLayout from '../components/AuthImmersiveLayout.vue';

const REMEMBER_EMAIL_KEY = 'rememberedEmail';

const { t } = useI18n();
const authStore = useAuthStore();
const router = useRouter();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const rememberMe = ref(false);
const loading = ref(false);
const error = ref('');
const showResendVerification = ref(false);
const resending = ref(false);
const resendMessage = ref('');

onMounted(() => {
  const rememberedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
  if (rememberedEmail) {
    email.value = rememberedEmail;
    rememberMe.value = true;
  }
});

async function handleLogin() {
  loading.value = true;
  error.value = '';
  showResendVerification.value = false;
  resendMessage.value = '';
  try {
    await authStore.login(email.value, password.value);
    if (rememberMe.value) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email.value);
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }
    router.push(authStore.isAdmin ? '/admin' : '/dashboard');
  } catch (err) {
    error.value = err.response?.data?.error || t('auth.loginFailed');
    if (err.response?.status === 403) {
      showResendVerification.value = true;
    }
  } finally {
    loading.value = false;
  }
}

async function handleResendVerification() {
  if (!email.value) return;
  resending.value = true;
  resendMessage.value = '';
  try {
    const data = await authStore.resendVerification(email.value);
    resendMessage.value = data.message || t('auth.verificationEmailSent');
  } catch (err) {
    error.value = err.response?.data?.error || t('auth.resendVerificationFailed');
  } finally {
    resending.value = false;
  }
}
</script>
