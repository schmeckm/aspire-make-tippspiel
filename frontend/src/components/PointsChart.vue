<template>
  <Line :data="chartData" :options="chartOptions" />
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { useFormatters } from '../composables/useFormatters';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const props = defineProps({
  data: { type: Array, default: () => [] },
  label: { type: String, default: '' },
  valueKey: { type: String, default: 'totalPoints' },
});

const { t } = useI18n();
const { formatDate } = useFormatters();

const chartData = computed(() => ({
  labels: props.data.map((d) => formatDate(d.time)),
  datasets: [{
    label: props.label || t('chart.points'),
    data: props.data.map((d) => d[props.valueKey]),
    borderColor: '#007AC2',
    backgroundColor: 'rgba(0, 122, 194, 0.1)',
    tension: 0.3,
    fill: true,
  }],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true } },
};
</script>
