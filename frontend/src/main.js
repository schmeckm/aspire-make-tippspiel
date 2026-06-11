import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { registerSW } from 'virtual:pwa-register';
import App from './App.vue';
import router from './router';
import i18n, { getStoredLocale, loadLocaleMessages } from './i18n';
import './styles/main.css';
import { useThemeStore } from './stores/themeStore';
import { initSentry } from './sentry';
import { useAuthStore } from './stores/authStore';

registerSW({ immediate: true });

const CHUNK_RELOAD_KEY = 'chunk-reload-attempts';
const MAX_CHUNK_RELOADS = 3;

async function recoverFromStaleBuild() {
  const attempts = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
  if (attempts >= MAX_CHUNK_RELOADS) return;

  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(attempts + 1));

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ('caches' in globalThis) {
    const keys = await globalThis.caches.keys();
    await Promise.all(keys.map((key) => globalThis.caches.delete(key)));
  }

  const url = new URL(globalThis.location.href);
  url.searchParams.set('_cb', String(Date.now()));
  globalThis.location.replace(url.toString());
}

function isChunkLoadError(message = '') {
  return message.includes('Failed to fetch dynamically imported module')
    || message.includes('Importing a module script failed');
}

globalThis.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  recoverFromStaleBuild();
});

router.onError((error) => {
  if (isChunkLoadError(error?.message || '')) {
    recoverFromStaleBuild();
  }
});

async function bootstrap() {
  const storedLocale = getStoredLocale();
  await loadLocaleMessages(storedLocale);
  i18n.global.locale.value = storedLocale;

  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);
  app.use(i18n);
  app.use(router);
  useThemeStore().initTheme();
  app.mount('#app');

  // Refresh persisted user payload (avoids stale localStorage image URLs → repeated 404s).
  const authStore = useAuthStore();
  if (authStore.isAuthenticated) {
    authStore.fetchMe().catch(() => {});
  }

  if ('requestIdleCallback' in globalThis) {
    requestIdleCallback(() => initSentry(app, router));
  } else {
    setTimeout(() => initSentry(app, router), 0);
  }
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
}

bootstrap().catch(() => {
  // If bootstrapping fails (e.g., locale chunk fails), try the same recovery
  // path as for chunk load errors.
  recoverFromStaleBuild();
});
