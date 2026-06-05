<template>
  <div>
    <div class="page-header"><h1>{{ t('adminPages.auditLog.title') }}</h1></div>
    <div class="filter-bar mb-2">
      <input v-model="filters.action" placeholder="Aktion filtern..." class="form-control" style="max-width: 200px;" @input="load" />
      <input v-model="filters.entityType" placeholder="Entität filtern..." class="form-control" style="max-width: 200px;" @input="load" />
    </div>
    <LoadingSpinner v-if="loading" />
    <div v-else class="card"><div class="card-body"><AuditLogTable :logs="logs" /></div></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner.vue';
import AuditLogTable from '../../components/AuditLogTable.vue';


const { t } = useI18n();

const logs = ref([]);
const loading = ref(true);
const filters = ref({ action: '', entityType: '' });

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/admin/audit-log', { params: filters.value });
    logs.value = data.rows || data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.mb-2 { margin-bottom: 1rem; }
</style>
