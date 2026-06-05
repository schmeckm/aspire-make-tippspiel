<template>
  <div ref="rootRef" class="locale-picker" :class="{ open: isOpen, compact }">
    <button
      :id="triggerId"
      type="button"
      class="locale-picker-trigger"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      @click="toggle"
    >
      <LocaleFlag :locale="modelValue" class="locale-picker-flag" />
      <span class="locale-picker-label">{{ t(`languages.${modelValue}`) }}</span>
      <span class="locale-picker-chevron" aria-hidden="true">▾</span>
    </button>

    <ul v-if="isOpen" class="locale-picker-menu" role="listbox" :aria-labelledby="triggerId">
      <li v-for="code in SUPPORTED_LOCALES" :key="code" role="option" :aria-selected="code === modelValue">
        <button
          type="button"
          class="locale-picker-option"
          :class="{ active: code === modelValue }"
          @click="select(code)"
        >
          <LocaleFlag :locale="code" class="locale-picker-flag" />
          <span>{{ t(`languages.${code}`) }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { SUPPORTED_LOCALES } from '../i18n';
import LocaleFlag from './LocaleFlag.vue';

const props = defineProps({
  modelValue: { type: String, required: true },
  compact: { type: Boolean, default: false },
  inputId: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);

const triggerId = props.inputId || `locale-picker-${Math.random().toString(36).slice(2, 9)}`;
const { t } = useI18n();
const isOpen = ref(false);
const rootRef = ref(null);

function toggle() {
  isOpen.value = !isOpen.value;
}

function select(code) {
  emit('update:modelValue', code);
  isOpen.value = false;
}

function onClickOutside(event) {
  if (rootRef.value && !rootRef.value.contains(event.target)) {
    isOpen.value = false;
  }
}

function onKeydown(event) {
  if (event.key === 'Escape') isOpen.value = false;
}

onMounted(() => {
  document.addEventListener('click', onClickOutside);
  document.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside);
  document.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
.locale-picker {
  position: relative;
  display: inline-block;
}

.locale-picker-trigger {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  min-width: 118px;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, 4px);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.85rem;
  cursor: pointer;
  text-align: left;
}

.locale-picker.compact .locale-picker-trigger {
  min-width: 108px;
  padding: 0.25rem 0.45rem;
}

.locale-picker-trigger:hover {
  border-color: var(--color-primary);
}

.locale-picker.open .locale-picker-trigger {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-soft, rgba(0, 80, 180, 0.12));
}

.locale-picker-label {
  flex: 1;
  white-space: nowrap;
}

.locale-picker-chevron {
  font-size: 0.65rem;
  color: var(--color-text-muted);
  transition: transform 0.15s ease;
}

.locale-picker.open .locale-picker-chevron {
  transform: rotate(180deg);
}

.locale-picker-flag {
  flex-shrink: 0;
}

.locale-picker-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 200;
  margin: 0;
  padding: 0.25rem;
  list-style: none;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, 4px);
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.12));
}

.locale-picker-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.45rem 0.5rem;
  border: none;
  border-radius: var(--radius-sm, 4px);
  background: transparent;
  color: var(--color-text);
  font-size: 0.85rem;
  cursor: pointer;
  text-align: left;
}

.locale-picker-option:hover,
.locale-picker-option.active {
  background: var(--color-primary-soft);
}

.locale-picker-option.active {
  font-weight: 600;
}
</style>