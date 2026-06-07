<template>
  <span v-if="remaining > 0" class="countdown-badge">{{ display }}</span>
  <span v-else-if="showExpired" class="countdown-badge expired">{{ t('countdown.started') }}</span>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
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

function getIntervalMs() {
  return remaining.value <= 3600000 ? 1000 : 60000;
}

function scheduleUpdate() {
  if (timer) clearInterval(timer);
  update();
  timer = setInterval(() => {
    update();
    if (remaining.value <= 3600000 && getIntervalMs() === 1000) {
      scheduleUpdate();
    }
  }, getIntervalMs());
}

const display = computed(() => {
  const ms = remaining.value;
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (days > 0) return `${days}${t('countdown.days')} ${hours}${t('countdown.hours')}`;
  if (hours > 0) return `${hours}${t('countdown.hours')} ${mins}${t('countdown.minutes')}`;
  if (mins > 0) return `${mins}${t('countdown.minutes')} ${secs}${t('countdown.seconds')}`;
  return `${secs}${t('countdown.seconds')}`;
});

watch(() => props.kickoffTime, scheduleUpdate);

onMounted(scheduleUpdate);

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.countdown-badge {
  display: inline-flex;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--color-warning-bg);
  color: var(--color-warning);
}
.countdown-badge.expired {
  background: var(--sapErrorBackground);
  color: var(--color-danger);
}
</style>
