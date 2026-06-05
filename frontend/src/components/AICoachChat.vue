<template>
  <ChatPanel
    :quick-items="quickQuestions"
    :placeholder="t('ai.askPlaceholder')"
    :send-label="t('ai.send')"
    :send-request="sendCoachRequest"
  />
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import ChatPanel from './ChatPanel.vue';

const { t, locale } = useI18n();

const quickQuestions = computed(() => [
  t('ai.suggestedQuestions.rules'),
  t('ai.suggestedQuestions.missingTips'),
  t('ai.suggestedQuestions.catchUp'),
  t('ai.suggestedQuestions.maxPoints'),
  t('ai.suggestedQuestions.openMatches'),
  t('ai.suggestedQuestions.teamMatches'),
]);

async function sendCoachRequest(question) {
  const { data } = await api.post('/ai/user-coach', {
    question,
    language: locale.value,
  });
  return data;
}
</script>
