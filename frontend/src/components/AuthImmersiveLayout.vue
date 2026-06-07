<template>
  <div class="auth-immersive">
    <div class="auth-immersive-overlay" aria-hidden="true" />

    <div class="auth-immersive-container">
      <aside class="auth-immersive-welcome">
        <div class="auth-immersive-welcome-content">
          <LanguageSwitcher show-label class="auth-immersive-language" />
          <h1 v-if="showHeadline" class="auth-immersive-brand">
            {{ headline || t('auth.welcomeHeadline') }}
            <span class="auth-immersive-brand-accent">{{ headlineAccent || t('auth.welcomeHeadlineAccent') }}</span>
          </h1>
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
  headline: { type: String, default: '' },
  headlineAccent: { type: String, default: '' },
  showHeadline: { type: Boolean, default: true },
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
  position: relative;
}

.auth-immersive-welcome::before {
  content: '';
  position: absolute;
  top: -2rem;
  left: -2rem;
  width: 20rem;
  height: 20rem;
  background: radial-gradient(circle, rgba(0, 255, 127, 0.18) 0%, transparent 70%);
  pointer-events: none;
  z-index: -1;
}

.auth-immersive-brand {
  font-size: clamp(2.75rem, 6vw, 4.5rem);
  font-weight: 800;
  line-height: 1.05;
  color: #fff;
  margin: 1.5rem 0 1.25rem;
  letter-spacing: -0.03em;
}

.auth-immersive-brand-accent {
  display: block;
  color: var(--color-primary);
  text-shadow: 0 0 40px rgba(0, 255, 127, 0.45);
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
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  font-size: 0.875rem;
  font-family: inherit;
  min-height: 2.75rem;
  backdrop-filter: blur(8px);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.auth-immersive-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 3px rgba(0, 255, 127, 0.15);
}

.auth-immersive-input:-webkit-autofill,
.auth-immersive-input:-webkit-autofill:hover,
.auth-immersive-input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px #1a1a1a inset;
  -webkit-text-fill-color: #fff;
  caret-color: #fff;
}

.auth-immersive-input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.auth-immersive-input option {
  background: #1a1a1a;
  color: #fff;
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
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
}

.auth-immersive-password-toggle:hover {
  color: var(--color-primary);
  background: rgba(0, 255, 127, 0.1);
}

.auth-google-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  min-height: 2.75rem;
  backdrop-filter: blur(8px);
  transition: background 0.15s ease, border-color 0.15s ease;
}

.auth-google-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(0, 255, 127, 0.35);
}

.auth-google-icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.25rem 0 0.25rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.55);
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.15);
}

.auth-divider span {
  white-space: nowrap;
}

.auth-qr-card {
  margin-top: 1.25rem;
  padding: 1rem;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(8px);
}

.auth-immersive-submit {
  width: 100%;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius);
  background: var(--color-primary);
  color: var(--color-on-primary, #0A0A0A);
  font-size: 0.875rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease;
  min-height: 2.75rem;
}

.auth-immersive-submit:hover:not(:disabled) {
  background: var(--color-primary-dark);
  box-shadow: var(--glow-primary);
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

.auth-immersive-legal {
  margin-top: 1rem;
  font-size: 0.78rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.72);
}

.auth-immersive-legal a {
  color: #fff;
  font-weight: 600;
  text-decoration: underline;
}

.auth-immersive-legal a:hover {
  color: var(--color-primary-light);
}

@media (max-width: 600px) {
  .auth-immersive-form-row {
    grid-template-columns: 1fr;
  }
}
</style>
