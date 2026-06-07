<template>
  <div class="page-qr" :title="url">
    <img
      v-if="dataUrl"
      :src="dataUrl"
      :alt="label"
      class="page-qr-image"
      width="96"
      height="96"
    />
    <p v-if="showLabel" class="page-qr-label">{{ label }}</p>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import QRCode from 'qrcode';

const props = defineProps({
  url: { type: String, required: true },
  label: { type: String, default: '' },
  showLabel: { type: Boolean, default: true },
});

const dataUrl = ref('');

async function renderQr() {
  if (!props.url) {
    dataUrl.value = '';
    return;
  }

  try {
    dataUrl.value = await QRCode.toDataURL(props.url, {
      width: 96,
      margin: 1,
      color: {
        dark: '#ffffff',
        light: '#00000000',
      },
    });
  } catch {
    dataUrl.value = '';
  }
}

onMounted(renderQr);
watch(() => props.url, renderQr);
</script>

<style scoped>
.page-qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.page-qr-image {
  display: block;
  border-radius: var(--radius-sm);
}

.page-qr-label {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.65);
  text-align: center;
}
</style>
