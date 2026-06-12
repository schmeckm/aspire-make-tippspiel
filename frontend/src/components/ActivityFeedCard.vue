<template>
  <div class="card">
    <div class="card-header">
      <h3>🧑‍🤝‍🧑 {{ t('activity.title') }}</h3>
      <div class="activity-scope">
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          :class="{ active: scope === 'team' }"
          @click="setScope('team')"
        >
          {{ t('activity.scopeTeam') }}
        </button>
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          :class="{ active: scope === 'global' }"
          @click="setScope('global')"
        >
          {{ t('activity.scopeGlobal') }}
        </button>
      </div>
    </div>

    <div class="card-body">
      <LoadingSpinner v-if="loading" />
      <ErrorState v-else-if="error" :message="error" @retry="load" />
      <EmptyState v-else-if="items.length === 0" icon="📰" :message="t('activity.empty')" />

      <div v-else class="activity-list">
        <div v-for="it in items" :key="it.id" class="activity-item">
          <UserAvatar
            :image-url="it.actor?.imageUrl"
            :avatar-color="it.actor?.avatarColor"
            :avatar-emoji="it.actor?.avatarEmoji"
            :first-name="it.actor?.firstName"
            :last-name="it.actor?.lastName"
            size="xs"
          />
          <div class="activity-body">
            <div class="activity-title">
              {{ renderTitle(it) }}
            </div>
            <div class="activity-meta">
              <span class="text-muted">{{ formatDateTime(it.createdAt) }}</span>
              <span v-if="it.actor?.teamName" class="text-muted">· {{ it.actor.teamName }}</span>
            </div>
          </div>
          <div v-if="renderBadge(it)" class="activity-badge">
            <span class="badge badge-info">{{ renderBadge(it) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner.vue';
import ErrorState from './ErrorState.vue';
import EmptyState from './EmptyState.vue';
import UserAvatar from './UserAvatar.vue';
import { useFormatters } from '../composables/useFormatters';

const { t } = useI18n();
const { formatDateTime } = useFormatters();

const scope = ref('team');
const loading = ref(true);
const error = ref('');
const items = ref([]);

function setScope(next) {
  if (scope.value === next) return;
  scope.value = next;
  load();
}

function renderTitle(it) {
  if (it.type === 'matchday_champion') {
    return t('activity.matchdayChampion', {
      name: `${it.actor?.firstName || ''} ${it.actor?.lastName || ''}`.trim(),
      points: it.data?.points ?? 0,
    });
  }
  if (it.type === 'rank_movement') {
    const movement = Number(it.data?.movement || 0);
    if (movement > 0) {
      return t('activity.rankUp', {
        name: `${it.actor?.firstName || ''} ${it.actor?.lastName || ''}`.trim(),
        delta: movement,
        rank: it.data?.currentRank ?? '–',
      });
    }
    return t('activity.rankDown', {
      name: `${it.actor?.firstName || ''} ${it.actor?.lastName || ''}`.trim(),
      delta: Math.abs(movement),
      rank: it.data?.currentRank ?? '–',
    });
  }
  return t('activity.unknown');
}

function renderBadge(it) {
  if (it.type === 'matchday_champion') {
    const exact = Number(it.data?.exactResults || 0);
    if (exact > 0) return t('activity.badgeExact', { count: exact });
    return null;
  }
  if (it.type === 'rank_movement') {
    const movement = Number(it.data?.movement || 0);
    return movement > 0 ? `▲${movement}` : `▼${Math.abs(movement)}`;
  }
  return null;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/activity', { params: { scope: scope.value, limit: 20 } });
    items.value = Array.isArray(data?.items) ? data.items : [];
  } catch (err) {
    error.value = err.response?.data?.error || t('activity.loadFailed');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.activity-scope {
  display: inline-flex;
  gap: 0.35rem;
}

.activity-list {
  display: grid;
  gap: 0.75rem;
}

.activity-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.02);
}

.activity-title {
  font-size: 0.9rem;
  font-weight: 600;
}

.activity-meta {
  margin-top: 0.15rem;
  font-size: 0.75rem;
}

.activity-badge {
  white-space: nowrap;
}
</style>

