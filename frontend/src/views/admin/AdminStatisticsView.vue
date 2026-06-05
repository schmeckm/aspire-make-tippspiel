<template>
  <div>
    <div class="page-header"><h1>{{ t('adminPages.statistics.title') }}</h1></div>
    <LoadingSpinner v-if="loading" />
    <template v-else>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">{{ overview.totalUsers }}</div><div class="stat-label">Benutzer</div></div>
        <div class="stat-card"><div class="stat-value">{{ overview.activeUsers }}</div><div class="stat-label">Aktive Benutzer</div></div>
        <div class="stat-card"><div class="stat-value">{{ overview.completionRate }}%</div><div class="stat-label">Vollständigkeit</div></div>
        <div class="stat-card accent"><div class="stat-value">{{ overview.missingPredictionsToday }}</div><div class="stat-label">Fehlende Tipps heute</div></div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner.vue';


const { t } = useI18n();

const overview = ref({});
const loading = ref(true);

onMounted(async () => {
  try {
    const { data } = await api.get('/statistics/admin/overview');
    overview.value = data;
  } finally {
    loading.value = false;
  }
});
</script>
