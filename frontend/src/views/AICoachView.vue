<template>
  <div>
    <div class="page-header">
      <h1>{{ t('ai.coachTitle') }}</h1>
      <span class="text-muted">{{ t('ai.coachSubtitle') }}</span>
    </div>
    <div class="card"><div class="card-body"><AICoachChat /></div></div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import AICoachChat from '../components/AICoachChat.vue';

const { t } = useI18n();
</script>
