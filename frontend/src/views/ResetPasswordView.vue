<template>
  <AuthImmersiveLayout
    :title="t('auth.resetPasswordTitle')"
    :welcome-text="t('auth.resetPasswordWelcomeText')"
  >
    <AlertMessage v-if="success" :message="success" type="success" class="auth-immersive-alert" />
    <AlertMessage v-if="error" :message="error" type="error" class="auth-immersive-alert" />

    <form v-if="!success && token" class="auth-immersive-form" @submit.prevent="handleSubmit">
      <div class="auth-immersive-field">
        <label for="password">{{ t('auth.newPassword') }}</label>
        <input
          id="password"
          v-model="password"
          type="password"
          class="auth-immersive-input"
          required
          minlength="6"
          autocomplete="new-password"
        />
      </div>

      <div class="auth-immersive-field">
        <label for="passwordConfirm">{{ t('auth.confirmPassword') }}</label>
        <input
          id="passwordConfirm"
          v-model="passwordConfirm"
          type="password"
          class="auth-immersive-input"
          required
          minlength="6"
          autocomplete="new-password"
        />
      </div>

      <button type="submit" class="auth-immersive-submit" :disabled="loading">
        {{ loading ? t('common.saving') : t('auth.resetPassword') }}
      </button>
    </form>

    <p v-if="!token" class="auth-immersive-muted">{{ t('auth.resetPasswordInvalid') }}</p>

    <template #footer>
      <router-link to="/login">{{ t('auth.toLogin') }}</router-link>
    </template>
  </AuthImmersiveLayout>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import AlertMessage from '../components/AlertMessage.vue';
import AuthImmersiveLayout from '../components/AuthImmersiveLayout.vue';

const { t } = useI18n();
const route = useRoute();
const token = route.query.token;
const password = ref('');
const passwordConfirm = ref('');
const loading = ref(false);
const error = ref('');
const success = ref('');

async function handleSubmit() {
  if (password.value !== passwordConfirm.value) {
    error.value = t('auth.passwordMismatch');
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.post('/auth/reset-password', { token, password: password.value });
    success.value = data.message || t('auth.resetPasswordSuccess');
  } catch (err) {
    error.value = err.response?.data?.error || t('auth.resetPasswordFailed');
  } finally {
    loading.value = false;
  }
}
</script>
