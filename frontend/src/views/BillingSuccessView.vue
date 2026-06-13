<template>
  <div class="billing-result">
    <h1 class="billing-title">{{ t('billing.successTitle') }}</h1>
    <p class="billing-text">{{ t('billing.successText') }}</p>
    <router-link class="billing-link" to="/login">{{ t('billing.goToLogin') }}</router-link>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<style scoped>
.billing-result {
  max-width: 720px;
  margin: 0 auto;
  padding: 2.25rem 1.25rem 3rem;
  text-align: center;
}

.billing-title {
  margin: 0;
  font-size: 1.85rem;
  letter-spacing: -0.02em;
}

.billing-text {
  margin: 0.75rem auto 1.25rem;
  max-width: 62ch;
  color: var(--color-text-muted);
}

.billing-link {
  display: inline-block;
  padding: 0.8rem 1rem;
  border-radius: 0.7rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  text-decoration: none;
  font-weight: 600;
}
</style>

