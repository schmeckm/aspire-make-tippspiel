<template>
  <div>
    <div class="page-header">
      <h1>{{ t('profile.title') }}</h1>
    </div>

    <AlertMessage v-if="success" :message="success" type="success" />
    <AlertMessage v-if="error" :message="error" type="error" />

    <div class="card" style="max-width: 640px;">
      <div class="card-body">
        <div class="profile-image-section">
          <UserAvatar
            :image-url="previewUrl || authStore.user?.imageUrl"
            :image-cache="previewUrl ? 0 : authStore.profileImageCache"
            :avatar-color="form.avatarColor"
            :avatar-emoji="form.avatarEmoji === 'initials' ? null : form.avatarEmoji"
            :first-name="form.firstName"
            :last-name="form.lastName"
            size="lg"
          />
          <div class="profile-image-actions">
            <label class="btn btn-secondary btn-sm profile-image-label">
              {{ t('profile.chooseImage') }}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                class="profile-image-input"
                @change="onImageSelected"
              />
            </label>
            <p class="text-muted profile-image-hint">{{ t('profile.imageHint') }}</p>
            <button
              v-if="authStore.user?.imageUrl && !selectedImage"
              type="button"
              class="btn btn-secondary btn-sm"
              :disabled="imageBusy"
              @click="removeImage"
            >
              {{ t('profile.removeImage') }}
            </button>
          </div>
        </div>

        <div class="profile-avatar-customize">
          <h3 class="profile-avatar-customize-title">{{ t('profile.avatarCustomize') }}</h3>
          <p class="text-muted profile-avatar-customize-hint">
            {{ hasProfileImage ? t('profile.avatarColorWithImage') : t('profile.avatarCustomizeHint') }}
          </p>

          <label class="profile-avatar-colors-label">{{ t('profile.avatarColor') }}</label>
          <div class="profile-avatar-colors-grid" role="radiogroup" :aria-label="t('profile.avatarColor')">
            <button
              v-for="option in avatarColorOptions"
              :key="option.id"
              type="button"
              class="profile-avatar-color-btn"
              :class="{ active: form.avatarColor === option.id }"
              :style="option.bg ? { backgroundColor: option.bg } : undefined"
              :title="t(option.labelKey)"
              :aria-label="t(option.labelKey)"
              :aria-checked="form.avatarColor === option.id"
              role="radio"
              @click="form.avatarColor = option.id"
            />
          </div>

          <label class="profile-avatar-colors-label profile-avatar-face-label">{{ t('profile.avatarFace') }}</label>
          <p class="text-muted profile-avatar-face-hint">{{ t('profile.avatarFaceHint') }}</p>
          <div class="profile-avatar-faces-grid" role="radiogroup" :aria-label="t('profile.avatarFace')">
            <button
              v-for="option in avatarFaceOptions"
              :key="option.id"
              type="button"
              class="profile-avatar-face-btn"
              :class="{ active: form.avatarEmoji === option.id }"
              :style="faceButtonStyle"
              :title="t(option.labelKey)"
              :aria-label="t(option.labelKey)"
              :aria-checked="form.avatarEmoji === option.id"
              role="radio"
              @click="form.avatarEmoji = option.id"
            >
              <span v-if="option.emoji" class="profile-avatar-face-emoji">{{ option.emoji }}</span>
              <span v-else class="profile-avatar-face-initials">{{ previewInitials }}</span>
            </button>
          </div>

          <div class="profile-avatar-preview-row">
            <span class="text-muted">{{ t('profile.avatarPreview') }}</span>
            <UserAvatar
              :image-url="null"
              :avatar-color="form.avatarColor"
              :avatar-emoji="form.avatarEmoji === 'initials' ? null : form.avatarEmoji"
              :first-name="form.firstName"
              :last-name="form.lastName"
              size="md"
            />
          </div>
        </div>

        <form @submit.prevent="handleSave">
          <div class="form-row">
            <div class="form-group">
              <label for="firstName">{{ t('auth.firstName') }}</label>
              <input id="firstName" v-model="form.firstName" type="text" class="form-control" required />
            </div>
            <div class="form-group">
              <label for="lastName">{{ t('auth.lastName') }}</label>
              <input id="lastName" v-model="form.lastName" type="text" class="form-control" required />
            </div>
          </div>
          <div class="form-group">
            <label for="email">{{ t('auth.email') }}</label>
            <input id="email" v-model="form.email" type="email" class="form-control" disabled />
          </div>
          <div class="form-group">
            <label for="language">{{ t('languages.label') }}</label>
            <LocalePicker v-model="form.language" />
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                :checked="themeStore.theme === 'dark'"
                @change="themeStore.toggleTheme()"
              />
              {{ t('profile.darkMode') }}
            </label>
          </div>
          <div class="form-group">
            <label for="team">{{ t('auth.teamDepartment') }}</label>
            <select id="team" v-model.number="form.teamId" class="form-control">
              <option :value="null">{{ t('common.noTeam') }}</option>
              <option v-for="team in teams" :key="team.id" :value="team.id">{{ team.name }}</option>
            </select>
          </div>

          <hr class="profile-divider" />
          <h3 class="profile-section-title">{{ t('profile.wmSection') }}</h3>
          <p class="text-muted profile-section-hint">{{ t('profile.wmSectionHint') }}</p>

          <div class="form-group">
            <label for="favoriteNationalTeam">{{ t('profile.favoriteNationalTeam') }}</label>
            <select id="favoriteNationalTeam" v-model.number="form.favoriteNationalTeamId" class="form-control">
              <option :value="null">{{ t('profile.noFavoriteTeam') }}</option>
              <option v-for="nt in nationalTeams" :key="nt.id" :value="nt.id">
                {{ nt.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="topScorerPlayer">{{ t('profile.topScorerPick') }}</label>
            <input
              id="topScorerSearch"
              v-model="playerSearch"
              type="search"
              name="top-scorer-filter"
              class="form-control mb-2"
              autocomplete="off"
              autocorrect="off"
              spellcheck="false"
              :placeholder="t('profile.topScorerSearch')"
            />
            <p v-if="playersLoading" class="text-muted players-hint">{{ t('profile.playersLoading') }}</p>
            <p v-else-if="playersError" class="players-error">{{ playersError }}</p>
            <p v-else-if="filteredPlayers.length === 0 && players.length > 0" class="text-muted players-hint">
              {{ t('profile.noPlayersMatch') }}
            </p>
            <select
              id="topScorerPlayer"
              v-model.number="form.topScorerPlayerId"
              class="form-control player-select"
              size="6"
              :disabled="playersLoading || filteredPlayers.length === 0"
            >
              <option :value="null">{{ t('profile.noTopScorerPick') }}</option>
              <option v-for="player in filteredPlayers" :key="player.id" :value="player.id">
                {{ player.name }} ({{ player.teamName }})
              </option>
            </select>
            <p v-if="!playersLoading && filteredPlayers.length > 0" class="text-muted players-hint">
              {{ t('profile.playersShown', { count: filteredPlayers.length }) }}
            </p>
          </div>

          <div class="form-group">
            <label for="password">{{ t('profile.newPassword') }}</label>
            <div class="password-input-wrap">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                class="form-control"
                minlength="6"
                autocomplete="new-password"
                :placeholder="t('profile.passwordHint')"
              />
              <button
                type="button"
                class="password-toggle"
                :aria-label="showPassword ? t('profile.hidePassword') : t('profile.showPassword')"
                @click="showPassword = !showPassword"
              >
                <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? t('common.saving') : t('profile.saveProfile') }}
          </button>
        </form>
      </div>
    </div>

    <div class="card profile-danger-card" style="max-width: 640px;">
      <div class="card-body">
        <h3 class="profile-danger-title">{{ t('profile.dangerZoneTitle') }}</h3>
        <p class="text-muted profile-danger-hint">{{ t('profile.dangerZoneHint') }}</p>
        <form class="profile-danger-form" @submit.prevent="handleDeleteAccount">
          <div class="form-group">
            <label for="deletePassword">{{ t('profile.deletePassword') }}</label>
            <input
              id="deletePassword"
              v-model="deletePassword"
              type="password"
              class="form-control"
              required
              autocomplete="current-password"
              :placeholder="t('profile.deletePasswordHint')"
            />
          </div>
          <button type="submit" class="btn btn-danger" :disabled="deletingAccount">
            {{ deletingAccount ? t('profile.deletingAccount') : t('profile.deleteAccount') }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore';
import { useLocaleStore } from '../stores/localeStore';
import { useThemeStore } from '../stores/themeStore';
import api from '../services/api';
import AlertMessage from '../components/AlertMessage.vue';
import LocalePicker from '../components/LocalePicker.vue';
import UserAvatar from '../components/UserAvatar.vue';
import { AVATAR_COLOR_OPTIONS, resolveAvatarColorStyle } from '../utils/avatarColors';
import { AVATAR_FACE_OPTIONS } from '../utils/avatarFaces';

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();
const themeStore = useThemeStore();
const localeStore = useLocaleStore();

const avatarColorOptions = AVATAR_COLOR_OPTIONS;
const avatarFaceOptions = AVATAR_FACE_OPTIONS;

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  teamId: null,
  language: localeStore.locale,
  favoriteNationalTeamId: null,
  topScorerPlayerId: null,
  avatarColor: 'default',
  avatarEmoji: 'initials',
  password: '',
});

const previewInitials = computed(() => {
  const first = form.value.firstName?.trim();
  const last = form.value.lastName?.trim();
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  return '??';
});

const faceButtonStyle = computed(() => {
  const style = resolveAvatarColorStyle(form.value.avatarColor);
  return style || {
    backgroundColor: 'var(--color-primary-bg, #e8f4fd)',
    color: 'var(--color-primary)',
  };
});
const teams = ref([]);
const nationalTeams = ref([]);
const players = ref([]);
const playerSearch = ref('');
const playersLoading = ref(true);
const playersError = ref('');
const loading = ref(false);
const success = ref('');
const error = ref('');
const showPassword = ref(false);
const selectedImage = ref(null);
const previewUrl = ref('');
const hasProfileImage = computed(
  () => Boolean(previewUrl.value || authStore.user?.imageUrl),
);
const imageBusy = ref(false);
const deletePassword = ref('');
const deletingAccount = ref(false);

function normalizeOptionalId(id) {
  if (id == null || id === '') return null;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

function applyFormFromUser(user) {
  form.value = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    teamId: normalizeOptionalId(user.teamId),
    language: user.language || localeStore.locale,
    favoriteNationalTeamId: normalizeOptionalId(user.favoriteNationalTeamId),
    topScorerPlayerId: normalizePlayerId(user.topScorerPlayerId),
    avatarColor: user.avatarColor || 'default',
    avatarEmoji: user.avatarEmoji || 'initials',
    password: '',
  };
}

function normalizePlayerId(id) {
  if (id == null || id === '') return null;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

function findPlayerById(id) {
  const normalized = normalizePlayerId(id);
  if (normalized == null) return null;
  return players.value.find((p) => Number(p.id) === normalized) || null;
}

function isValidPlayerSearch(q) {
  if (!q) return false;
  // Browser autofill often puts the e-mail address into nearby fields
  if (q.includes('@')) return false;
  return true;
}

const filteredPlayers = computed(() => {
  let list = players.value;
  const q = playerSearch.value.trim().toLowerCase();

  if (isValidPlayerSearch(q)) {
    list = list.filter((p) => (
      p.name.toLowerCase().includes(q) || p.teamName.toLowerCase().includes(q)
    ));
  }

  let result = list.slice(0, 200);
  const selected = findPlayerById(form.value.topScorerPlayerId);
  if (selected && !result.some((p) => Number(p.id) === Number(selected.id))) {
    result = [selected, ...result.slice(0, 199)];
  } else if (!selected && normalizePlayerId(form.value.topScorerPlayerId) && authStore.user?.topScorerPlayerName) {
    result = [{
      id: normalizePlayerId(form.value.topScorerPlayerId),
      name: authStore.user.topScorerPlayerName,
      teamName: '',
    }, ...result.slice(0, 199)];
  }

  return result;
});

onMounted(async () => {
  let user = authStore.user;
  try {
    user = await authStore.fetchMe();
  } catch {
    // fallback to cached user if refresh fails
  }

  applyFormFromUser(user);
  playerSearch.value = '';

  playersLoading.value = true;
  playersError.value = '';

  const [deptResult, ntResult, playersResult] = await Promise.allSettled([
    api.get('/teams'),
    api.get('/football/teams'),
    api.get('/football/players'),
  ]);

  if (deptResult.status === 'fulfilled') {
    teams.value = deptResult.value.data;
  } else {
    error.value = deptResult.reason?.response?.data?.error || t('profile.teamsLoadFailed');
  }

  if (ntResult.status === 'fulfilled') {
    nationalTeams.value = ntResult.value.data;
  } else {
    error.value = error.value || ntResult.reason?.response?.data?.error || t('profile.nationalTeamsLoadFailed');
  }

  if (playersResult.status === 'fulfilled') {
    players.value = Array.isArray(playersResult.value.data) ? playersResult.value.data : [];
    if (players.value.length === 0) {
      playersError.value = t('profile.playersLoadFailed');
    }
  } else {
    playersError.value = playersResult.reason?.response?.data?.error || t('profile.playersLoadFailed');
    players.value = [];
  }

  playersLoading.value = false;
});

watch(() => form.value.language, (code) => {
  localeStore.applyLocale(code);
});

function onImageSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    error.value = t('profile.imageTooLarge');
    return;
  }
  selectedImage.value = file;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = URL.createObjectURL(file);
}

async function uploadImage() {
  if (!selectedImage.value) return;
  const formData = new FormData();
  formData.append('image', selectedImage.value);
  const { data } = await api.post(`/users/${authStore.user.id}/image`, formData);
  authStore.syncUser(data, { bumpImage: true });
  selectedImage.value = null;
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = '';
}

async function removeImage() {
  imageBusy.value = true;
  error.value = '';
  try {
    const { data } = await api.delete(`/users/${authStore.user.id}/image`);
    authStore.syncUser(data, { bumpImage: true });
    success.value = t('profile.imageRemoved');
  } catch (err) {
    error.value = err.response?.data?.error || t('profile.imageUploadFailed');
  } finally {
    imageBusy.value = false;
  }
}

async function handleDeleteAccount() {
  if (!confirm(t('profile.deleteConfirm'))) return;

  deletingAccount.value = true;
  success.value = '';
  error.value = '';
  try {
    await authStore.deleteAccount(deletePassword.value);
    deletePassword.value = '';
    await router.replace('/login');
  } catch (err) {
    error.value = err.response?.data?.error || t('profile.deleteFailed');
  } finally {
    deletingAccount.value = false;
  }
}

async function handleSave() {
  loading.value = true;
  success.value = '';
  error.value = '';
  try {
    const favoriteTeam = nationalTeams.value.find(
      (nt) => Number(nt.id) === Number(form.value.favoriteNationalTeamId),
    );
    const playerId = normalizePlayerId(form.value.topScorerPlayerId);
    const topScorer = findPlayerById(playerId);

    const payload = {
      firstName: form.value.firstName,
      lastName: form.value.lastName,
      teamId: form.value.teamId,
      language: form.value.language,
      favoriteNationalTeamId: form.value.favoriteNationalTeamId,
      favoriteNationalTeamName: favoriteTeam?.name || null,
      topScorerPlayerId: playerId,
      topScorerPlayerName: topScorer?.name || (playerId ? authStore.user?.topScorerPlayerName : null) || null,
      avatarColor: form.value.avatarColor,
      avatarEmoji: form.value.avatarEmoji === 'initials' ? null : form.value.avatarEmoji,
    };
    if (form.value.password) payload.password = form.value.password;
    if (selectedImage.value) {
      await uploadImage();
    }
    const updated = await authStore.updateProfile(authStore.user.id, payload);
    applyFormFromUser(updated);
    showPassword.value = false;
    success.value = t('profile.updated');
  } catch (err) {
    error.value = err.response?.data?.error || t('profile.updateFailed');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.profile-image-section {
  display: flex;
  gap: 1.25rem;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.profile-image-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.profile-image-hint {
  font-size: 0.8rem;
  margin: 0;
}

.profile-image-label {
  cursor: pointer;
  margin: 0;
  width: fit-content;
}

.profile-avatar-customize {
  margin-bottom: 1.5rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--color-border);
}

.profile-avatar-customize-title {
  margin: 0 0 0.35rem;
  font-size: 1rem;
}

.profile-avatar-customize-hint {
  margin: 0 0 1rem;
  font-size: 0.9rem;
}

.profile-avatar-colors-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.profile-avatar-face-label {
  margin-top: 1rem;
}

.profile-avatar-face-hint {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
}

.profile-avatar-colors-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.profile-avatar-color-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  cursor: pointer;
  background: var(--color-primary-bg, #e8f4fd);
  padding: 0;
}

.profile-avatar-color-btn.active {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.profile-avatar-faces-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.profile-avatar-face-btn {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
}

.profile-avatar-face-btn.active {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.profile-avatar-face-emoji {
  font-size: 1.25rem;
  line-height: 1;
}

.profile-avatar-face-initials {
  font-size: 0.7rem;
  font-weight: 700;
}

.profile-avatar-preview-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
}

.profile-image-input {
  display: none;
}

.profile-divider {
  margin: 1.5rem 0 1rem;
  border: none;
  border-top: 1px solid var(--color-border);
}

.profile-section-title {
  font-size: 1.05rem;
  margin-bottom: 0.25rem;
}

.profile-section-hint {
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.players-hint {
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
}

.players-error {
  font-size: 0.85rem;
  color: var(--sapErrorColor);
  margin-bottom: 0.5rem;
}

.player-select {
  min-height: 9rem;
}

.password-input-wrap {
  position: relative;
}

.password-input-wrap .form-control {
  padding-right: 2.75rem;
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 0.5rem;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.password-toggle:hover {
  color: var(--color-text);
  background: var(--color-primary-soft);
}

.profile-danger-card {
  margin-top: 1.5rem;
  border-color: var(--sapErrorColor, #bb0000);
}

.profile-danger-title {
  margin: 0 0 0.5rem;
  color: var(--sapErrorColor, #bb0000);
  font-size: 1.05rem;
}

.profile-danger-hint {
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 1rem;
}

.profile-danger-form {
  margin-top: 0.5rem;
}
</style>
