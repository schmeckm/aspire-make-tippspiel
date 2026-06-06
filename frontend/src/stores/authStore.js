import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import api from '../services/api';
import { getStoredLocale, normalizeLocale, setStoredLocale } from '../i18n';
import { useLocaleStore } from './localeStore';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null);
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));
  const profileImageCache = ref(0);

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const fullName = computed(() => {
    if (!user.value) return '';
    return `${user.value.firstName} ${user.value.lastName}`;
  });

  function bumpProfileImageCache() {
    profileImageCache.value = Date.now();
  }

  function setAuth(newToken, newUser) {
    token.value = newToken;
    user.value = newUser;
    profileImageCache.value = newUser?.imageUrl ? Date.now() : 0;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));

    const localeStore = useLocaleStore();
    const userLocale = normalizeLocale(newUser?.language || getStoredLocale());
    setStoredLocale(userLocale);
    localeStore.applyLocale(userLocale);
  }

  function clearLocalAuth() {
    token.value = null;
    user.value = null;
    profileImageCache.value = 0;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  function logout() {
    clearLocalAuth();
  }

  async function logoutAsync() {
    const currentToken = token.value;
    clearLocalAuth();
    if (currentToken) {
      try {
        await axios.post('/api/auth/logout', {}, {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
      } catch {
        // ignore
      }
    }
  }

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    setAuth(data.token, data.user);
    return data;
  }

  async function register(formData) {
    const { data } = await api.post('/auth/register', formData);
    if (!data.requiresVerification && data.token) {
      setAuth(data.token, data.user);
    }
    return data;
  }

  async function resendVerification(email) {
    const { data } = await api.post('/auth/resend-verification', { email });
    return data;
  }

  async function verifyEmail(token) {
    const { data } = await api.post('/auth/verify-email', { token });
    setAuth(data.token, data.user);
    return data;
  }

  async function forgotPassword(email) {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  }

  async function resetPassword(token, password) {
    const { data } = await api.post('/auth/reset-password', { token, password });
    return data;
  }

  async function fetchMe() {
    const { data } = await api.get('/auth/me');
    user.value = data.user;
    localStorage.setItem('user', JSON.stringify(data.user));
    useLocaleStore().syncFromUser(data.user);
    return data.user;
  }

  async function updateProfile(userId, payload) {
    const { data } = await api.put(`/users/${userId}`, payload);
    syncUser(data);
    if (payload.language) {
      useLocaleStore().applyLocale(payload.language);
    }
    return data;
  }

  function syncUser(updatedUser, options = {}) {
    user.value = updatedUser;
    localStorage.setItem('user', JSON.stringify(updatedUser));
    useLocaleStore().syncFromUser(updatedUser);
    if (options.bumpImage) {
      bumpProfileImageCache();
    }
  }

  async function deleteAccount(password) {
    await api.delete('/users/me', { data: { password } });
    clearLocalAuth();
  }

  return {
    token,
    user,
    profileImageCache,
    isAuthenticated,
    isAdmin,
    fullName,
    login,
    register,
    resendVerification,
    verifyEmail,
    forgotPassword,
    resetPassword,
    logout,
    logoutAsync,
    fetchMe,
    updateProfile,
    syncUser,
    setAuth,
    deleteAccount,
  };
});
