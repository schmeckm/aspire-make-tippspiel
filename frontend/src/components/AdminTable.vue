<template>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th v-for="col in columns" :key="col.key">{{ col.label }}</th>
          <th v-if="showActions">Aktionen</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td v-for="col in columns" :key="col.key">
            <slot :name="`cell-${col.key}`" :item="item">
              {{ formatCell(item, col) }}
            </slot>
          </td>
          <td v-if="showActions">
            <div class="btn-group">
              <button class="btn btn-secondary btn-sm" @click="$emit('edit', item)">Bearbeiten</button>
              <button class="btn btn-danger btn-sm" @click="$emit('delete', item)">Löschen</button>
            </div>
          </td>
        </tr>
        <tr v-if="items.length === 0">
          <td :colspan="columns.length + (showActions ? 1 : 0)" class="text-center text-muted">
            Keine Einträge vorhanden.
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  columns: { type: Array, required: true },
  showActions: { type: Boolean, default: true },
});

defineEmits(['edit', 'delete']);

function formatCell(item, col) {
  const val = item[col.key];
  if (col.format === 'role') {
    return val === 'admin' ? 'Admin' : 'Benutzer';
  }
  if (val === null || val === undefined) return '–';
  return val;
}
</script>
