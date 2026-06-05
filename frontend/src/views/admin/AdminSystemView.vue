<template>
  <div>
    <div class="page-header"><h1>{{ t('adminPages.system.title') }}</h1></div>
    <LoadingSpinner v-if="loading" />
    <AdminSystemHealth v-else :health="health" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner.vue';
import AdminSystemHealth from '../../components/AdminSystemHealth.vue';


const { t } = useI18n();

const health = ref({});
const loading = ref(true);

onMounted(async () => {
  try {
    const { data } = await api.get('/admin/system');
    health.value = data;
  } finally {
    loading.value = false;
  }
});
</script>
