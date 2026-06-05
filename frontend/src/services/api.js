import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { getStoredLocale } from '../i18n';
import i18n from '../i18n';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`;
  }
  const locale = authStore.user?.language || getStoredLocale();
  config.headers['X-Language'] = locale;

  const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
  if (isFormData) {
    // Let the browser set multipart boundary; default application/json breaks file uploads.
    delete config.headers['Content-Type'];
  } else if (config.method === 'get') {
    config.params = { ...config.params, lang: locale };
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      const isAuthRequest = /\/auth\/(login|register)(\/|$|\?)/.test(requestUrl);
      if (!isAuthRequest) {
        const authStore = useAuthStore();
        const errorText = error.response?.data?.error || '';
        const isSessionExpired = /session|expired|abgelaufen|Sitzung|sesión|session/i.test(errorText);
        if (isSessionExpired) {
          const toastStore = useToastStore();
          const message = i18n.global.t('auth.sessionExpired');
          toastStore.warning(message);
        }
        authStore.logout();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export async function downloadAuthenticatedFile(url, filename = 'download.csv') {
  const response = await api.get(url, { responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}
