<template>
  <div class="chat-panel">
    <div v-if="quickItems.length" class="chat-quick-actions">
      <button
        v-for="(item, index) in quickItems"
        :key="itemKey(item, index)"
        type="button"
        class="filter-btn"
        @click="ask(itemQuestion(item))"
      >
        {{ itemLabel(item) }}
      </button>
    </div>

    <div class="chat-area">
      <div v-for="(msg, i) in messages" :key="i" :class="['chat-msg', msg.role]">
        <div class="chat-bubble">{{ msg.text }}</div>
        <div v-if="msg.disclaimer" class="ai-disclaimer">{{ msg.disclaimer }}</div>
      </div>
      <LoadingSpinner v-if="loading" />
    </div>

    <form class="chat-input" @submit.prevent="ask(input)">
      <input
        v-model="input"
        class="form-control"
        :placeholder="placeholder"
        :disabled="loading"
      />
      <button type="submit" class="btn btn-primary" :disabled="loading || !input.trim()">
        {{ sendLabel }}
      </button>
    </form>

    <AlertMessage v-if="error" :message="error" type="error" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import LoadingSpinner from './LoadingSpinner.vue';
import AlertMessage from './AlertMessage.vue';

const props = defineProps({
  quickItems: { type: Array, default: () => [] },
  placeholder: { type: String, required: true },
  sendLabel: { type: String, required: true },
  sendRequest: { type: Function, required: true },
  userBubbleClass: { type: String, default: '' },
});

const emit = defineEmits(['response']);

const input = ref('');
const loading = ref(false);
const error = ref('');
const messages = ref([]);

function itemKey(item, index) {
  return typeof item === 'string' ? item : item.label || item.question || index;
}

function itemLabel(item) {
  return typeof item === 'string' ? item : item.label;
}

function itemQuestion(item) {
  return typeof item === 'string' ? item : item.question;
}

async function ask(question) {
  if (!question?.trim()) return;
  loading.value = true;
  error.value = '';
  messages.value.push({ role: 'user', text: question });
  input.value = '';

  try {
    const data = await props.sendRequest(question);
    messages.value.push({
      role: 'assistant',
      text: data.answer,
      disclaimer: data.disclaimer,
    });
    emit('response', data);
  } catch (err) {
    error.value = err.response?.data?.error || err.message || 'Request failed';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.chat-panel { display: flex; flex-direction: column; gap: 1rem; }
.chat-quick-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.chat-area {
  min-height: 300px;
  max-height: 550px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-bg);
  border-radius: var(--radius);
}
.chat-msg.user { align-self: flex-end; }
.chat-msg.assistant { align-self: flex-start; }
.chat-bubble {
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  max-width: 90%;
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: pre-wrap;
}
.chat-msg.user .chat-bubble { background: var(--color-primary); color: white; }
.chat-msg.assistant .chat-bubble { background: var(--color-surface); border: 1px solid var(--color-border); }
.ai-disclaimer { font-size: 0.7rem; color: var(--color-text-muted); margin-top: 0.25rem; font-style: italic; }
.chat-input { display: flex; gap: 0.5rem; }
.chat-input input { flex: 1; }
</style>
