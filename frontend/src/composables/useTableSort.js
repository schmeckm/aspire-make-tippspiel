import { ref, computed, unref } from 'vue';

export function useTableSort(items, { getters, defaultKey = null, defaultDir = 'asc' } = {}) {
  const sortKey = ref(defaultKey);
  const sortDir = ref(defaultDir);

  function toggleSort(key) {
    if (sortKey.value === key) {
      sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
      return;
    }
    sortKey.value = key;
    sortDir.value = 'asc';
  }

  const sortedItems = computed(() => {
    const list = [...(unref(items) ?? [])];
    const key = sortKey.value;
    const getter = getters?.[key];
    if (!getter) return list;

    const dir = sortDir.value === 'asc' ? 1 : -1;

    return list.sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);

      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;

      if (typeof va === 'string' && typeof vb === 'string') {
        return va.localeCompare(vb, undefined, { sensitivity: 'base' }) * dir;
      }

      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  });

  return { sortKey, sortDir, sortedItems, toggleSort };
}
