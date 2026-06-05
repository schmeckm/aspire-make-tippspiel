<template>
  <AuthImmersiveLayout
    :title="t('auth.forgotPasswordTitle')"
    :hint="t('auth.forgotPasswordHint')"
    :welcome-text="t('auth.forgotPasswordWelcomeText')"
  >
    <AlertMessage v-if="success" :message="success" type="success" class="auth-immersive-alert" />
    <AlertMessage v-if="error" :message="error" type="error" class="auth-immersive-alert" />

    <form v-if="!success" class="auth-immersive-form" @submit.prevent="handleSubmit">
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

      <button type="submit" class="auth-immersive-submit" :disabled="loading">
        {{ loading ? t('common.saving') : t('auth.sendResetLink') }}
      </button>
    </form>

    <template #footer>
      <router-link to="/login">{{ t('auth.toLogin') }}</router-link>
    </template>
  </AuthImmersiveLayout>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import AlertMessage from '../components/AlertMessage.vue';
import AuthImmersiveLayout from '../components/AuthImmersiveLayout.vue';

const { t } = useI18n();
const email = ref('');
const loading = ref(false);
const error = ref('');
const success = ref('');

async function handleSubmit() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.post('/auth/forgot-password', { email: email.value });
    success.value = data.message || t('auth.forgotPasswordSent');
  } catch (err) {
    error.value = err.response?.data?.error || t('auth.forgotPasswordFailed');
  } finally {
    loading.value = false;
  }
}
</script>
