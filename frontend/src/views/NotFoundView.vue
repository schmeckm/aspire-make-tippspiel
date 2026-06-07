<template>
  <div class="not-found">
    <h1>404</h1>
    <p>{{ t('errors.notFound') }}</p>
    <router-link to="/dashboard" class="btn btn-primary">{{ t('errors.backToDashboard') }}</router-link>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<style scoped>
.not-found {
  text-align: center;
  padding: 4rem 1rem;
}
.not-found h1 {
  font-size: 5rem;
  margin-bottom: 0.5rem;
  color: var(--color-primary);
  font-weight: 800;
  text-shadow: var(--glow-primary);
  line-height: 1;
}

.not-found p {
  font-size: 1.125rem;
  color: var(--color-text-muted);
  margin-bottom: 1.5rem;
}
</style>
