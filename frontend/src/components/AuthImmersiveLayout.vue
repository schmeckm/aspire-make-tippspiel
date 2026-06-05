<template>
  <div class="auth-immersive">
    <div class="auth-immersive-overlay" aria-hidden="true" />

    <div class="auth-immersive-container">
      <aside class="auth-immersive-welcome">
        <div class="auth-immersive-welcome-content">
          <LanguageSwitcher show-label class="auth-immersive-language" />
          <h1 class="auth-immersive-brand">{{ t('auth.welcomeBack') }}</h1>
          <p class="auth-immersive-text">{{ welcomeText || t('auth.loginWelcomeText') }}</p>
        </div>
      </aside>

      <section class="auth-immersive-panel">
        <h2 v-if="title" class="auth-immersive-title">{{ title }}</h2>
        <p v-if="hint" class="auth-immersive-hint">{{ hint }}</p>
        <slot />
        <div v-if="$slots.footer" class="auth-immersive-footer">
          <slot name="footer" />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import LanguageSwitcher from './LanguageSwitcher.vue';

defineProps({
  title: { type: String, default: '' },
  hint: { type: String, default: '' },
  welcomeText: { type: String, default: '' },
});

const { t } = useI18n();
</script>

<style scoped>
.auth-immersive {
  position: relative;
  flex: 1;
  min-height: 100%;
  display: flex;
  background: var(--auth-bg) url('/images/login-bg.jpg') center / cover no-repeat;
  color: #fff;
  font-family: inherit;
}

.auth-immersive-overlay {
  position: absolute;
  inset: 0;
  background: var(--auth-overlay);
  pointer-events: none;
}

.auth-immersive-container {
  position: relative;
  z-index: 1;
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: center;
  max-width: 72rem;
  width: 100%;
  margin: 0 auto;
  padding: 3rem 4rem;
}

.auth-immersive-welcome {
  padding-right: 2rem;
}

.auth-immersive-brand {
  font-size: clamp(3.25rem, 7vw, 5.5rem);
  font-weight: 700;
  line-height: 1.05;
  color: #fff;
  margin: 1.5rem 0 1.25rem;
  letter-spacing: -0.02em;
}

.auth-immersive-text {
  font-size: 0.95rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.82);
  max-width: 22rem;
}

.auth-immersive-panel {
  display: flex;
  flex-direction: column;
  padding-left: 2rem;
}

.auth-immersive-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 1.5rem;
}

.auth-immersive-hint {
  font-size: 0.9rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.78);
  margin-bottom: 1.25rem;
}

.auth-immersive-footer {
  margin-top: 1.25rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
}

.auth-immersive-footer :deep(a) {
  color: #fff;
  font-weight: 600;
  text-decoration: underline;
}

.auth-immersive-footer :deep(a:hover) {
  color: var(--color-primary-light);
}

.auth-immersive-language {
  justify-content: flex-start;
}

.auth-immersive-language :deep(.language-label) {
  color: rgba(255, 255, 255, 0.75);
}

.auth-immersive-language :deep(.locale-picker-trigger) {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  color: #fff;
}

.auth-immersive-language :deep(.locale-picker-trigger:hover) {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.4);
}

@media (max-width: 900px) {
  .auth-immersive-container {
    grid-template-columns: 1fr;
    padding: 2rem 1.5rem;
    gap: 2rem;
  }

  .auth-immersive-welcome {
    padding-right: 0;
  }

  .auth-immersive-panel {
    padding-left: 0;
  }
}
</style>

<style>
.auth-immersive-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.auth-immersive-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.auth-immersive-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.auth-immersive-field label {
  font-size: 0.8rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.auth-immersive-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-sm);
  background: #fff;
  color: var(--sapTitleColor);
  font-size: 0.875rem;
  font-family: inherit;
  min-height: 2.75rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.auth-immersive-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent);
}

.auth-immersive-input:-webkit-autofill,
.auth-immersive-input:-webkit-autofill:hover,
.auth-immersive-input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px #fff inset;
  -webkit-text-fill-color: var(--sapTitleColor);
  caret-color: var(--sapTitleColor);
}

.auth-immersive-input::placeholder {
  color: #9aa0a6;
}

.auth-immersive-input-wrap {
  position: relative;
}

.auth-immersive-input-wrap .auth-immersive-input {
  padding-right: 2.75rem;
}

.auth-immersive-password-toggle {
  position: absolute;
  top: 50%;
  right: 0.5rem;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  border-radius: 0.25rem;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
}

.auth-immersive-password-toggle:hover {
  color: var(--auth-bg);
  background: rgba(0, 0, 0, 0.05);
}

.auth-immersive-submit {
  width: 100%;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s ease;
  min-height: 2.75rem;
}

.auth-immersive-submit:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.auth-immersive-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.auth-immersive-secondary {
  width: 100%;
  padding: 0.65rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 0.5rem;
  background: transparent;
  color: #fff;
  font-size: 0.85rem;
  font-family: inherit;
  cursor: pointer;
}

.auth-immersive-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
}

.auth-immersive-link {
  margin-top: 1rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
}

.auth-immersive-link:hover {
  color: #fff;
  text-decoration: underline;
}

.auth-immersive-remember {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  user-select: none;
}

.auth-immersive-remember input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.auth-immersive-alert {
  margin-bottom: 0.5rem;
}

.auth-immersive-muted {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.75);
  text-align: center;
}

@media (max-width: 600px) {
  .auth-immersive-form-row {
    grid-template-columns: 1fr;
  }
}
</style>
