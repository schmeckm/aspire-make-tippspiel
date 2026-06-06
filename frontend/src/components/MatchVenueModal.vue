<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-overlay"
      @click.self="close"
    >
      <div
        class="modal match-venue-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="modalTitle"
      >
        <div class="modal-header">
          <h3>{{ modalTitle }}</h3>
          <button
            type="button"
            class="modal-close"
            :aria-label="t('common.close')"
            @click="close"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <img
            v-if="match.stadiumImageUrl"
            :src="match.stadiumImageUrl"
            :alt="match.stadium"
            class="match-venue-image"
            decoding="async"
          />
          <div class="match-venue-meta">
            <p v-if="match.city" class="match-venue-city">{{ match.city }}</p>
            <p class="match-venue-teams">
              {{ match.homeTeam }} {{ t('common.vs') }} {{ match.awayTeam }}
            </p>
            <p class="match-venue-kickoff">
              📅 {{ formatDate(match.kickoffTime) }} · 🕐 {{ formatTime(match.kickoffTime) }}
            </p>
            <p v-if="matchRoundLabel(match)" class="match-venue-round text-muted">
              {{ matchRoundLabel(match) }}
            </p>
          </div>

          <section class="match-venue-h2h">
            <HeadToHeadPanel
              :data="h2hData"
              :loading="h2hLoading"
              :error="h2hError"
              :subtitle="t('head2head.wcOnly')"
              :show-load-button="!h2hData && !h2hLoading && !h2hError"
              @load="loadHead2Head()"
            />
          </section>

          <section v-if="showAi" class="match-venue-ai">
            <div class="match-venue-ai-header">
              <h4>🤖 {{ t('ai.matchPreviewTitle') }}</h4>
              <button
                v-if="content && !loading && isAdmin"
                type="button"
                class="btn btn-secondary btn-sm"
                @click="loadPreview({ regenerate: true })"
              >
                {{ t('ai.regenerate') }}
              </button>
            </div>
            <LoadingSpinner v-if="loading" />
            <p v-else-if="content" class="match-venue-ai-text">{{ content }}</p>
            <button
              v-else-if="!error"
              type="button"
              class="btn btn-secondary btn-sm"
              @click="loadPreview()"
            >
              {{ t('ai.showPreview') }}
            </button>
            <AlertMessage v-if="error" :message="error" type="warning" />
            <p v-if="disclaimer" class="match-venue-ai-disclaimer">{{ disclaimer }}</p>
            <span v-if="cached && content" class="badge badge-info match-venue-ai-cached">
              {{ t('ai.cached') }}
            </span>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import {
  computed, watch, onMounted, onUnmounted,
} from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore';
import LoadingSpinner from './LoadingSpinner.vue';
import AlertMessage from './AlertMessage.vue';
import HeadToHeadPanel from './HeadToHeadPanel.vue';
import { useMatchPreview } from '../composables/useMatchPreview';
import { useHeadToHead } from '../composables/useHeadToHead';
import { useFormatters } from '../composables/useFormatters';
import { useMatchMeta } from '../composables/useMatchMeta';

const props = defineProps({
  open: { type: Boolean, default: false },
  match: { type: Object, required: true },
  showAi: { type: Boolean, default: true },
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.isAdmin);
const { formatDate, formatTime } = useFormatters();
const { matchRoundLabel } = useMatchMeta();

const matchId = computed(() => props.match?.id);

const {
  content,
  disclaimer,
  loading,
  error,
  cached,
  loadPreview,
  resetPreview,
} = useMatchPreview(matchId);

const {
  data: h2hData,
  loading: h2hLoading,
  error: h2hError,
  loadForMatch: loadHead2HeadRequest,
  reset: resetHead2Head,
} = useHeadToHead();

function loadHead2Head() {
  if (matchId.value) loadHead2HeadRequest(matchId.value);
}

const modalTitle = computed(() => {
  if (props.match?.stadium) return props.match.stadium;
  return t('matches.venueDetails');
});

function close() {
  emit('close');
}

function onKeydown(event) {
  if (event.key === 'Escape' && props.open) close();
}

watch(() => props.open, (isOpen) => {
  if (!isOpen) {
    resetPreview();
    resetHead2Head();
  }
});

onMounted(() => {
  globalThis.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  globalThis.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
.match-venue-modal {
  max-width: 640px;
}

.match-venue-image {
  width: 100%;
  max-height: 280px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  margin-bottom: 1rem;
}

.match-venue-meta {
  margin-bottom: 1.25rem;
}

.match-venue-meta p {
  margin: 0.25rem 0;
}

.match-venue-city {
  font-weight: 600;
}

.match-venue-teams {
  font-size: 1rem;
  font-weight: 700;
}

.match-venue-h2h {
  padding-top: 1rem;
  margin-bottom: 1rem;
  border-top: 1px solid var(--color-border);
}

.match-venue-ai {
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.match-venue-ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.match-venue-ai-header h4 {
  margin: 0;
  font-size: 0.95rem;
  color: var(--color-primary);
}

.match-venue-ai-text {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
  white-space: pre-wrap;
}

.match-venue-ai-disclaimer {
  margin: 0.75rem 0 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.match-venue-ai-cached {
  margin-top: 0.5rem;
}
</style>
