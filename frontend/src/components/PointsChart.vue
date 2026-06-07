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
import { CHART_PRIMARY, CHART_PRIMARY_FILL, baseChartOptions, getChartPalette } from '../utils/chartTheme';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const props = defineProps({
  data: { type: Array, default: () => [] },
  label: { type: String, default: '' },
  valueKey: { type: String, default: 'totalPoints' },
});

const { t } = useI18n();
const { formatDate } = useFormatters();
const themeStore = useThemeStore();
const chartPalette = computed(() => getChartPalette(themeStore.theme));

const chartData = computed(() => ({
  labels: props.data.map((d) => formatDate(d.time)),
  datasets: [{
    label: props.label || t('chart.points'),
    data: props.data.map((d) => d[props.valueKey]),
    borderColor: CHART_PRIMARY,
    backgroundColor: CHART_PRIMARY_FILL,
    pointBackgroundColor: CHART_PRIMARY,
    pointBorderColor: chartPalette.value.pointBorder,
    tension: 0.3,
    fill: true,
  }],
}));

const chartOptions = computed(() => baseChartOptions({
  y: { beginAtZero: true },
  theme: themeStore.theme,
}));
</script>
