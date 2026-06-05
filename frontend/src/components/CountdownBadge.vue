<template>
  <span v-if="remaining > 0" class="countdown-badge">{{ display }}</span>
  <span v-else-if="showExpired" class="countdown-badge expired">{{ t('countdown.started') }}</span>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  kickoffTime: { type: String, required: true },
  showExpired: { type: Boolean, default: true },
});

const { t } = useI18n();
const remaining = ref(0);
let timer = null;

function update() {
  remaining.value = Math.max(0, new Date(props.kickoffTime) - Date.now());
}

const display = computed(() => {
  const ms = remaining.value;
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}${t('countdown.days')} ${hours}${t('countdown.hours')}`;
  if (hours > 0) return `${hours}${t('countdown.hours')} ${mins}${t('countdown.minutes')}`;
  return `${mins}${t('countdown.minutes')}`;
});

onMounted(() => {
  update();
  timer = setInterval(update, 60000);
});

onUnmounted(() => clearInterval(timer));
</script>

<style scoped>
.countdown-badge {
  display: inline-flex;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: #fff3cd;
  color: #856404;
}
.countdown-badge.expired { background: #f8d7da; color: #721c24; }
</style>
