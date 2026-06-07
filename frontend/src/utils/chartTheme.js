export const CHART_PRIMARY = '#00FF7F';
export const CHART_PRIMARY_FILL = 'rgba(0, 255, 127, 0.12)';
export const CHART_SECONDARY = '#00CC66';
export const CHART_SECONDARY_FILL = 'rgba(0, 204, 102, 0.12)';

const DARK = {
  grid: 'rgba(255, 255, 255, 0.06)',
  tick: '#B8C0CC',
  tooltipBg: '#1A1A1A',
  tooltipTitle: '#FFFFFF',
  pointBorder: '#0A0A0A',
};

const LIGHT = {
  grid: 'rgba(85, 107, 130, 0.12)',
  tick: '#556B82',
  tooltipBg: '#FFFFFF',
  tooltipTitle: '#131E29',
  pointBorder: '#FFFFFF',
};

export function getChartPalette(theme = 'dark') {
  return theme === 'light' ? LIGHT : DARK;
}

export function baseChartOptions({ y = {}, plugins = {}, theme = 'dark', ...rest } = {}) {
  const palette = getChartPalette(theme);

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: palette.tooltipBg,
        borderColor: 'rgba(0, 255, 127, 0.3)',
        borderWidth: 1,
        titleColor: palette.tooltipTitle,
        bodyColor: palette.tick,
      },
      ...plugins,
    },
    scales: {
      x: {
        ticks: { color: palette.tick },
        grid: { color: palette.grid },
        border: { color: palette.grid },
      },
      y: {
        ticks: { color: palette.tick },
        grid: { color: palette.grid },
        border: { color: palette.grid },
        ...y,
      },
    },
    ...rest,
  };
}
