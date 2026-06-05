<template>
  <div class="match-ref-cell">
    <span class="match-ref-internal">#{{ matchNumber ?? '–' }}</span>
    <span
      v-if="externalApiId"
      class="match-ref-external"
      :title="t('matchTable.externalRef')"
    >{{ externalApiId }}</span>
    <span v-else class="match-ref-external text-muted">–</span>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

defineProps({
  matchNumber: { type: [Number, String], default: null },
  externalApiId: { type: [Number, String], default: null },
});

const { t } = useI18n();
</script>
