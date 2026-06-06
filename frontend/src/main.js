import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import i18n from './i18n';
import './styles/main.css';
import { useThemeStore } from './stores/themeStore';

// After a deploy, cached index.html may reference removed chunk files — reload once.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const reloaded = sessionStorage.getItem('chunk-reload');
  if (!reloaded) {
    sessionStorage.setItem('chunk-reload', '1');
    window.location.reload();
  }
});

router.onError((error) => {
  const message = error?.message || '';
  if (
    message.includes('Failed to fetch dynamically imported module')
    || message.includes('Importing a module script failed')
  ) {
    const reloaded = sessionStorage.getItem('chunk-reload');
    if (!reloaded) {
      sessionStorage.setItem('chunk-reload', '1');
      window.location.reload();
    }
  }
});

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(i18n);
app.use(router);
useThemeStore().initTheme();
app.mount('#app');
sessionStorage.removeItem('chunk-reload');
