import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';

const POLL_INTERVAL_ONLINE_MS = 30000;
const POLL_INTERVAL_OFFLINE_MS = 5000;

const EXTERNAL_API_LABEL_KEYS = {
  football: 'systemHealth.externalFootball',
  theSportsDb: 'systemHealth.externalTheSportsDb',
  email: 'systemHealth.externalEmail',
  google: 'systemHealth.externalGoogle',
};

export function useSystemHealth() {
  const frontendAiEnabled = import.meta.env.VITE_AI_FEATURES_ENABLED !== 'false';
  const { t, locale } = useI18n();

  const backendState = ref('checking');
  const frontendState = ref('checking');
  const aiBackendState = ref('checking');
  const backupState = ref('checking');
  const externalApiItems = ref([]);
  const version = ref(import.meta.env.VITE_APP_VERSION || null);
  const commitSha = ref((import.meta.env.VITE_APP_COMMIT_SHA || '').trim() || null);
  const expandedKey = ref(null);

  const backendDetail = ref('');
  const aiBackendDetail = ref('');
  const backupDetail = ref('');
  const backupLastRunAt = ref(null);
  const externalApiDetails = ref({});

  const BACKUP_STALE_MS = 90 * 60 * 1000;

  function stateText(state, type = 'connection') {
    if (state === 'checking') return t('systemHealth.checking');
    if (state === 'inactive') return t('systemHealth.inactive');
    if (type === 'ai') {
      return state === 'online' ? t('systemHealth.aiActive') : t('systemHealth.aiInactive');
    }
    return state === 'online' ? t('systemHealth.online') : t('systemHealth.offline');
  }

  function aiReasonDetail(reason) {
    if (reason === 'disabled') return t('systemHealth.detailAiDisabled');
    if (reason === 'no_api_key') return t('systemHealth.detailAiNoApiKey');
    return '';
  }

  function externalReasonDetail(api) {
    if (api.reason === 'not_configured') {
      if (api.id === 'football') return t('systemHealth.detailFootballNotConfigured');
      if (api.id === 'email') return t('systemHealth.detailEmailNotConfigured');
      if (api.id === 'google') return t('systemHealth.detailGoogleNotConfigured');
      return t('systemHealth.detailExternalNotConfigured');
    }
    if (api.reason === 'disabled') return t('systemHealth.detailExternalDisabled');
    if (api.reason === 'rate_limited') return t('systemHealth.detailExternalRateLimited');
    if (api.reason === 'unreachable') {
      return api.detail || t('systemHealth.detailExternalUnreachable');
    }
    return '';
  }

  function formatBackupTime(value) {
    if (!value) return t('systemHealth.backupNever');
    return new Date(value).toLocaleString(locale.value, {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function resolveBackupState(info) {
    if (!info?.enabled) {
      return {
        state: 'inactive',
        text: t('systemHealth.backupDisabled'),
        detail: t('systemHealth.detailBackupDisabled'),
      };
    }
    if (!info.lastRunAt) {
      return {
        state: 'offline',
        text: t('systemHealth.backupNever'),
        detail: t('systemHealth.detailBackupNever'),
      };
    }

    const ageMs = Date.now() - new Date(info.lastRunAt).getTime();
    const text = formatBackupTime(info.lastRunAt);
    if (ageMs > BACKUP_STALE_MS) {
      return {
        state: 'offline',
        text,
        detail: t('systemHealth.detailBackupStale'),
      };
    }

    return {
      state: 'online',
      text,
      detail: info.source === 'auto'
        ? t('systemHealth.detailBackupAuto', { time: text })
        : t('systemHealth.detailBackupManual', { time: text }),
    };
  }

  const backupText = ref('');

  const coreItems = computed(() => [
    {
      key: 'backend',
      label: t('systemHealth.backend'),
      state: backendState.value,
      text: stateText(backendState.value),
      detail: backendDetail.value,
      clickable: backendState.value === 'offline' && !!backendDetail.value,
    },
    {
      key: 'frontend',
      label: t('systemHealth.frontend'),
      state: frontendState.value,
      text: stateText(frontendState.value),
      detail: '',
      clickable: false,
    },
    {
      key: 'llm',
      label: t('systemHealth.llm'),
      state: aiBackendState.value,
      text: stateText(aiBackendState.value, 'ai'),
      detail: aiBackendDetail.value,
      clickable: aiBackendState.value === 'offline' && !!aiBackendDetail.value,
    },
  ]);

  const backupItem = computed(() => ({
    key: 'backup',
    label: t('systemHealth.playerBackup'),
    state: backupState.value,
    text: backupState.value === 'checking' ? stateText('checking') : backupText.value,
    detail: backupDetail.value,
    clickable: (backupState.value === 'offline' || backupState.value === 'inactive')
      && !!backupDetail.value,
  }));

  const items = computed(() => [
    ...coreItems.value,
    ...externalApiItems.value,
    backupItem.value,
  ]);

  const expandedItem = computed(() => {
    if (!expandedKey.value) return null;
    return items.value.find((item) => item.key === expandedKey.value) || null;
  });

  const commitShort = computed(() => (commitSha.value ? commitSha.value.slice(0, 7) : null));
  const commitUrl = computed(() => (
    commitSha.value ? `https://github.com/schmeckm/aspire-make-tippspiel/commit/${commitSha.value}` : null
  ));

  const hasIssues = computed(() => items.value.some(
    (item) => item.state === 'offline' || item.state === 'checking',
  ));

  function toggleDetail(key) {
    const item = items.value.find((entry) => entry.key === key);
    if (!item?.clickable) return;
    expandedKey.value = expandedKey.value === key ? null : key;
  }

  function isTransientHealthError(error) {
    const status = error?.response?.status;
    return !status || status === 502 || status === 503 || status === 504 || error?.code === 'ECONNABORTED';
  }

  async function fetchHealth() {
    return api.get('/health', { timeout: 12000 });
  }

  function applyExternalApis(apis = []) {
    const details = {};
    externalApiItems.value = apis.map((apiStatus) => {
      const detail = externalReasonDetail(apiStatus);
      details[apiStatus.id] = detail;
      const state = apiStatus.state || 'inactive';
      return {
        key: `external-${apiStatus.id}`,
        label: t(EXTERNAL_API_LABEL_KEYS[apiStatus.id] || 'systemHealth.externalApi'),
        state,
        text: stateText(state),
        detail,
        clickable: (state === 'offline' || state === 'inactive') && !!detail,
      };
    });
    externalApiDetails.value = details;
  }

  function applyBackupInfo(info) {
    const resolved = resolveBackupState(info || {});
    backupState.value = resolved.state;
    backupText.value = resolved.text;
    backupDetail.value = resolved.detail;
    backupLastRunAt.value = info?.lastRunAt || null;
  }

  async function checkHealth() {
    frontendState.value = 'online';
    backendDetail.value = '';
    aiBackendDetail.value = '';

    try {
      let response;
      try {
        response = await fetchHealth();
      } catch (firstError) {
        if (!isTransientHealthError(firstError)) throw firstError;
        await new Promise((resolve) => { setTimeout(resolve, 2500); });
        response = await fetchHealth();
      }

      const { data } = response;
      backendState.value = data?.status === 'ok' ? 'online' : 'offline';
      if (backendState.value === 'offline') {
        backendDetail.value = data?.reason === 'database_unavailable'
          ? t('systemHealth.detailDatabaseUnavailable')
          : t('systemHealth.detailBackendOffline');
      }

      aiBackendState.value = data?.ai?.active ? 'online' : 'offline';
      if (aiBackendState.value === 'offline') {
        aiBackendDetail.value = aiReasonDetail(data?.ai?.reason) || t('systemHealth.detailAiInactive');
      }

      applyExternalApis(Array.isArray(data?.externalApis) ? data.externalApis : []);
      applyBackupInfo(data?.playerDataBackup);

      if (data?.version) version.value = data.version;
    } catch {
      backendState.value = 'offline';
      backendDetail.value = t('systemHealth.detailBackendOffline');
      aiBackendState.value = 'checking';
      aiBackendDetail.value = t('systemHealth.detailBackendOfflineAi');
      backupState.value = 'checking';
      backupText.value = stateText('checking');
      backupDetail.value = '';
      externalApiItems.value = externalApiItems.value.map((item) => ({
        ...item,
        state: 'checking',
        text: stateText('checking'),
        clickable: false,
      }));
    }

    if (expandedKey.value) {
      const stillClickable = items.value.some(
        (item) => item.key === expandedKey.value && item.clickable,
      );
      if (!stillClickable) expandedKey.value = null;
    }
  }

  let intervalId;

  function scheduleNextPoll() {
    if (intervalId) clearInterval(intervalId);
    const anyOffline = items.value.some(
      (item) => item.state === 'offline' || item.state === 'checking',
    );
    const delay = anyOffline ? POLL_INTERVAL_OFFLINE_MS : POLL_INTERVAL_ONLINE_MS;
    intervalId = setTimeout(async () => {
      await checkHealth();
      scheduleNextPoll();
    }, delay);
  }

  onMounted(async () => {
    await checkHealth();
    scheduleNextPoll();
  });

  onUnmounted(() => {
    if (intervalId) clearTimeout(intervalId);
  });

  return {
    items,
    version,
    commitShort,
    commitUrl,
    expandedItem,
    toggleDetail,
    hasIssues,
  };
}
