<template>
  <AuthImmersiveLayout :title="t('auth.signIn')">
    <AlertMessage v-if="error" :message="error" type="error" class="auth-immersive-alert" />
    <AlertMessage v-if="resendMessage" :message="resendMessage" type="success" class="auth-immersive-alert" />

    <button
      v-if="googleEnabled"
      type="button"
      class="auth-google-btn"
      @click="authStore.loginWithGoogle()"
    >
      <svg class="auth-google-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      {{ t('auth.signInWithGoogle') }}
    </button>

    <p v-if="googleEnabled" class="auth-divider"><span>{{ t('auth.orContinueWith') }}</span></p>

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

    <p class="auth-immersive-legal">
      {{ t('auth.privacyAgreement') }}
      <router-link to="/privacy">{{ t('auth.privacyPolicy') }}</router-link>.
    </p>

    <template #footer>
      <div class="auth-login-footer">
        <p>
          {{ t('auth.noAccount') }}
          <router-link to="/register">{{ t('auth.registerNow') }}</router-link>
        </p>
        <div class="auth-qr-card">
          <PageQrCode :url="pageUrl" :label="t('auth.scanToOpen')" />
        </div>
      </div>
    </template>
  </AuthImmersiveLayout>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore';
import AlertMessage from '../components/AlertMessage.vue';
import AuthImmersiveLayout from '../components/AuthImmersiveLayout.vue';
import PageQrCode from '../components/PageQrCode.vue';

const REMEMBER_EMAIL_KEY = 'rememberedEmail';

const { t, te } = useI18n();
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const googleEnabled = ref(false);
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const rememberMe = ref(false);
const loading = ref(false);
const error = ref('');
const showResendVerification = ref(false);
const resending = ref(false);
const resendMessage = ref('');
const pageUrl = ref('');

onMounted(async () => {
  pageUrl.value = `${globalThis.location.origin}/login`;
  const rememberedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
  if (rememberedEmail) {
    email.value = rememberedEmail;
    rememberMe.value = true;
  }

  const ssoError = route.query.ssoError;
  if (ssoError) {
    const key = `auth.ssoErrors.${ssoError}`;
    error.value = te(key) ? t(key) : t('auth.loginFailed');
    router.replace({ path: '/login', query: {} });
  }

  try {
    const providers = await authStore.fetchAuthProviders();
    googleEnabled.value = !!providers.google;
  } catch {
    googleEnabled.value = false;
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

<style scoped>
.auth-login-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.auth-login-footer p {
  margin: 0;
}
</style>
