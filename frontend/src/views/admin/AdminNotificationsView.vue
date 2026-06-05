<template>
  <div>
    <div class="page-header"><h1>{{ t('adminPages.notifications.title') }}</h1></div>
    <AlertMessage v-if="message" :message="message" type="success" />
    <div class="card" style="max-width: 600px;">
      <div class="card-body">
        <form @submit.prevent="send">
          <div class="form-group"><label>Titel</label><input v-model="form.title" class="form-control" required /></div>
          <div class="form-group"><label>Nachricht</label><textarea v-model="form.message" class="form-control" rows="3" required /></div>
          <div class="form-group"><label>Link (optional)</label><input v-model="form.link" class="form-control" placeholder="/matches" /></div>
          <button type="submit" class="btn btn-primary" :disabled="loading">{{ loading ? 'Senden...' : 'An alle Benutzer senden' }}</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';
import AlertMessage from '../../components/AlertMessage.vue';


const { t } = useI18n();

const form = ref({ title: '', message: '', link: '' });
const loading = ref(false);
const message = ref('');

async function send() {
  loading.value = true;
  try {
    await api.post('/admin/notifications/send', form.value);
    message.value = 'Benachrichtigung gesendet.';
    form.value = { title: '', message: '', link: '' };
  } finally {
    loading.value = false;
  }
}
</script>
