<template>
  <div>
    <div class="page-header">
      <h1>🤖 {{ t('adminPages.aiAssistant.title') }}</h1>
      <span class="text-muted">Admin-Hilfe für Diagnose und Texte</span>
    </div>
    <div class="card"><div class="card-body"><AdminAIAssistant /></div></div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import AdminAIAssistant from '../../components/AdminAIAssistant.vue';

const { t } = useI18n();
</script>
