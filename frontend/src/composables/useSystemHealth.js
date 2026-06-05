import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';

const POLL_INTERVAL_MS = 30000;

export function useSystemHealth() {
  const frontendAiEnabled = import.meta.env.VITE_AI_FEATURES_ENABLED !== 'false';
  const { t } = useI18n();

  const backendState = ref('checking');
  const frontendState = ref('checking');
  const aiBackendState = ref('checking');
  const aiFrontendState = ref(frontendAiEnabled ? 'online' : 'offline');

  function stateText(state, type = 'connection') {
    if (state === 'checking') return t('systemHealth.checking');
    if (type === 'ai') {
      return state === 'online' ? t('systemHealth.aiActive') : t('systemHealth.aiInactive');
    }
    return state === 'online' ? t('systemHealth.online') : t('systemHealth.offline');
  }

  const items = computed(() => [
    {
      key: 'backend',
      label: t('systemHealth.backend'),
      state: backendState.value,
      text: stateText(backendState.value),
    },
    {
      key: 'frontend',
      label: t('systemHealth.frontend'),
      state: frontendState.value,
      text: stateText(frontendState.value),
    },
    {
      key: 'aiBackend',
      label: t('systemHealth.aiBackend'),
      state: aiBackendState.value,
      text: stateText(aiBackendState.value, 'ai'),
    },
    {
      key: 'aiFrontend',
      label: t('systemHealth.aiFrontend'),
      state: aiFrontendState.value,
      text: stateText(aiFrontendState.value, 'ai'),
    },
  ]);

  async function checkHealth() {
    frontendState.value = 'online';

    try {
      const { data } = await api.get('/health', { timeout: 8000 });
      backendState.value = data?.status === 'ok' ? 'online' : 'offline';
      aiBackendState.value = data?.ai?.active ? 'online' : 'offline';
    } catch {
      backendState.value = 'offline';
      aiBackendState.value = 'offline';
    }
  }

  let intervalId;

  onMounted(() => {
    checkHealth();
    intervalId = setInterval(checkHealth, POLL_INTERVAL_MS);
  });

  onUnmounted(() => {
    if (intervalId) clearInterval(intervalId);
  });

  return { items };
}
