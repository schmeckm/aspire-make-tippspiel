<template>
  <span :class="['live-score-badge', statusClass]">{{ label }}</span>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  status: { type: String, default: 'scheduled' },
});

const { t } = useI18n();

const label = computed(() => t(`matchStatus.${props.status}`, props.status));
const statusClass = computed(() => `badge-${props.status}`);
</script>
