<template>
  <AuthImmersiveLayout
    :title="registrationComplete ? t('auth.registerSuccessTitle') : t('auth.createAccount')"
    :welcome-text="registrationComplete ? t('auth.registerSuccessWelcomeText') : t('auth.registerWelcomeText')"
    :show-headline="!registrationComplete"
    :headline="t('auth.registerHeadline')"
    :headline-accent="t('auth.registerHeadlineAccent')"
  >
    <AlertMessage v-if="error" :message="error" type="error" inline class="auth-immersive-alert" />

    <div v-if="registrationComplete" class="auth-register-success">
      <p class="auth-register-success-lead">
        {{ registrationEmailSent ? t('auth.registerSuccessIntro', { email: registeredEmail }) : t('auth.registerSuccessNoEmail', { email: registeredEmail }) }}
      </p>
      <ol class="auth-register-success-steps">
        <li>{{ t('auth.registerSuccessStep1') }}</li>
        <li>{{ t('auth.registerSuccessStep2') }}</li>
        <li>{{ t('auth.registerSuccessStep3') }}</li>
      </ol>
      <p class="auth-register-success-hint">{{ t('auth.registerSuccessSpamHint') }}</p>
      <router-link to="/login" class="auth-immersive-submit auth-register-success-login">
        {{ t('auth.registerSuccessLoginCta') }}
      </router-link>
    </div>

    <form v-else class="auth-immersive-form" @submit.prevent="handleRegister">
      <div class="auth-immersive-form-row">
        <div class="auth-immersive-field">
          <label for="firstName">{{ t('auth.firstName') }}</label>
          <input id="firstName" v-model="form.firstName" type="text" class="auth-immersive-input" required />
        </div>
        <div class="auth-immersive-field">
          <label for="lastName">{{ t('auth.lastName') }}</label>
          <input id="lastName" v-model="form.lastName" type="text" class="auth-immersive-input" required />
        </div>
      </div>

      <div class="auth-immersive-field">
        <label for="email">{{ t('auth.emailAddress') }}</label>
        <input
          id="email"
          v-model="form.email"
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
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            class="auth-immersive-input"
            required
            minlength="6"
            autocomplete="new-password"
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

      <div class="auth-immersive-field">
        <label for="confirmPassword">{{ t('auth.confirmPassword') }}</label>
        <div class="auth-immersive-input-wrap">
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            class="auth-immersive-input"
            required
            minlength="6"
            autocomplete="new-password"
          />
          <button
            type="button"
            class="auth-immersive-password-toggle"
            :aria-label="showConfirmPassword ? t('profile.hidePassword') : t('profile.showPassword')"
            @click="showConfirmPassword = !showConfirmPassword"
          >
            <svg v-if="showConfirmPassword" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
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

      <div class="auth-immersive-field">
        <label for="team">{{ t('auth.teamDepartment') }} *</label>
        <select id="team" v-model="form.teamId" class="auth-immersive-input" required>
          <option :value="null" disabled>{{ t('auth.selectTeam') }}</option>
          <option v-for="team in teams" :key="team.id" :value="team.id">{{ team.name }}</option>
        </select>
      </div>

      <p class="auth-immersive-legal">
        {{ t('auth.privacyAgreement') }}
        <router-link to="/privacy">{{ t('auth.privacyPolicy') }}</router-link>.
      </p>

      <button type="submit" class="auth-immersive-submit" :disabled="loading">
        {{ loading ? t('auth.registering') : t('auth.registerNow') }}
      </button>
    </form>

    <template v-if="!registrationComplete" #footer>
      {{ t('auth.hasAccount') }}
      <router-link to="/login">{{ t('auth.toLogin') }}</router-link>
    </template>
  </AuthImmersiveLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore';
import { useLocaleStore } from '../stores/localeStore';
import api from '../services/api';
import AlertMessage from '../components/AlertMessage.vue';
import AuthImmersiveLayout from '../components/AuthImmersiveLayout.vue';

const { t } = useI18n();
const authStore = useAuthStore();
const localeStore = useLocaleStore();
const router = useRouter();

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  teamId: null,
  language: localeStore.locale,
});
const confirmPassword = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const teams = ref([]);
const loading = ref(false);
const error = ref('');
const registrationComplete = ref(false);
const registeredEmail = ref('');
const registrationEmailSent = ref(true);

onMounted(async () => {
  try {
    const { data } = await api.get('/teams');
    teams.value = data;
  } catch {
    // optional
  }
});

async function handleRegister() {
  if (!form.value.teamId) {
    error.value = t('auth.teamRequired');
    return;
  }
  if (form.value.password !== confirmPassword.value) {
    error.value = t('auth.passwordsDoNotMatch');
    return;
  }
  loading.value = true;
  error.value = '';
  registrationComplete.value = false;
  try {
    const data = await authStore.register({
      ...form.value,
      passwordConfirm: confirmPassword.value,
      language: localeStore.locale,
    });
    if (data.requiresVerification) {
      localeStore.applyLocale(form.value.language);
      registeredEmail.value = data.email || form.value.email;
      registrationEmailSent.value = data.emailSent !== false;
      registrationComplete.value = true;
      return;
    }
    router.push('/dashboard');
  } catch (err) {
    error.value = err.response?.data?.error || t('auth.registerFailed');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-register-success {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.auth-register-success-lead {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.92);
}

.auth-register-success-steps {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.9rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.88);
}

.auth-register-success-hint {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.72);
}

.auth-register-success-login {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  margin-top: 0.25rem;
}
</style>
