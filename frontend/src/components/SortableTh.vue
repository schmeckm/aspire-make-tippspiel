<template>
  <th
    class="sortable-th"
    :class="{ active: sortKey === columnKey }"
    :aria-sort="ariaSort"
    scope="col"
    @click="$emit('sort', columnKey)"
  >
    <span class="sortable-th-label">{{ label }}</span>
    <span v-if="sortKey === columnKey" class="sortable-th-icon" aria-hidden="true">
      {{ sortDir === 'asc' ? '▲' : '▼' }}
    </span>
  </th>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: { type: String, required: true },
  columnKey: { type: String, required: true },
  sortKey: { type: String, default: null },
  sortDir: { type: String, default: 'asc' },
});

defineEmits(['sort']);

const ariaSort = computed(() => {
  if (props.sortKey !== props.columnKey) return 'none';
  return props.sortDir === 'asc' ? 'ascending' : 'descending';
});
</script>
