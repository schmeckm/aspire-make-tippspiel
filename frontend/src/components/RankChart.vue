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
});

const { t } = useI18n();
const { formatDate } = useFormatters();

const chartData = computed(() => ({
  labels: props.data.map((d) => formatDate(d.time)),
  datasets: [{
    label: t('chart.rank'),
    data: props.data.map((d) => d.rank),
    borderColor: '#006098',
    backgroundColor: 'rgba(0, 96, 152, 0.12)',
    tension: 0.3,
    fill: true,
  }],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { reverse: true, beginAtZero: false, ticks: { stepSize: 1 } } },
};
</script>
