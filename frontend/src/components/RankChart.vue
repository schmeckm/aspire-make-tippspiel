<template>
  <Line :data="chartData" :options="chartOptions" />
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { useFormatters } from '../composables/useFormatters';
import { useThemeStore } from '../stores/themeStore';
import { CHART_SECONDARY, CHART_SECONDARY_FILL, baseChartOptions, getChartPalette } from '../utils/chartTheme';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const props = defineProps({
  data: { type: Array, default: () => [] },
});

const { t } = useI18n();
const { formatDate } = useFormatters();
const themeStore = useThemeStore();
const chartPalette = computed(() => getChartPalette(themeStore.theme));

const chartData = computed(() => ({
  labels: props.data.map((d) => formatDate(d.time)),
  datasets: [{
    label: t('chart.rank'),
    data: props.data.map((d) => d.rank),
    borderColor: CHART_SECONDARY,
    backgroundColor: CHART_SECONDARY_FILL,
    pointBackgroundColor: CHART_SECONDARY,
    pointBorderColor: chartPalette.value.pointBorder,
    tension: 0.3,
    fill: true,
  }],
}));

const chartOptions = computed(() => baseChartOptions({
  y: { reverse: true, beginAtZero: false, ticks: { stepSize: 1 } },
  theme: themeStore.theme,
}));
</script>
