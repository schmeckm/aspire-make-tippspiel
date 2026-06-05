<template>
  <ChatPanel
    :quick-items="suggestedActions"
    :placeholder="t('admin.ai.placeholder')"
    :send-label="t('ai.send')"
    :send-request="sendAdminRequest"
    @response="onResponse"
  />
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import ChatPanel from './ChatPanel.vue';

const { t } = useI18n();

const suggestedActions = ref([
  { label: t('admin.ai.actions.missingTips'), question: t('admin.ai.questions.missingTips') },
  { label: t('admin.ai.actions.pointsIssue'), question: t('admin.ai.questions.pointsIssue') },
  { label: t('admin.ai.actions.csvImport'), question: t('admin.ai.questions.csvImport') },
  { label: t('admin.ai.actions.reminderText'), question: t('admin.ai.questions.reminderText') },
  { label: t('admin.ai.actions.bonusSuggestions'), question: t('admin.ai.questions.bonusSuggestions') },
]);

async function sendAdminRequest(question) {
  const { data } = await api.post('/admin/ai/assistant', { question });
  return data;
}

function onResponse(data) {
  if (data.suggestedActions) {
    suggestedActions.value = data.suggestedActions;
  }
}
</script>
