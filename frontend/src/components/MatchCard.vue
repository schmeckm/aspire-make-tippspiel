<template>
  <div class="match-card">
    <div class="match-card-header">
      <span>{{ matchRoundLabel(match) }}</span>
      <div class="match-card-header-end">
        <div class="match-card-ref">
          <span class="match-ref">#{{ match.matchNumber }}</span>
          <span
            v-if="match.externalApiId"
            class="match-ref-external"
            :title="t('matchTable.externalRef')"
          >{{ match.externalApiId }}</span>
        </div>
        <span :class="['badge', `badge-${match.status}`]"><LiveScoreBadge :status="match.status" /></span>
      </div>
    </div>
    <div class="match-teams">
      <div class="match-team">
        <TeamFlag :name="match.homeTeam" link-to-squad />
      </div>
      <div class="match-score-display">
        <template v-if="match.status === 'finished'">
          {{ match.homeScore }} : {{ match.awayScore }}
        </template>
        <template v-else>{{ t('common.vs') }}</template>
      </div>
      <div class="match-team">
        <TeamFlag :name="match.awayTeam" link-to-squad />
      </div>
    </div>
    <div class="match-meta">
      📅 {{ formatDate(match.kickoffTime) }} · 🕐 {{ formatTime(match.kickoffTime) }}
      <span v-if="match.stadium" class="match-venue">
        ·
        <button
          v-if="match.stadiumImageUrl"
          type="button"
          class="match-stadium-thumb-btn"
          :title="t('matches.stadiumPreview')"
          :aria-label="t('matches.stadiumPreview')"
          @click="showVenueModal = true"
        >
          <img
            :src="match.stadiumImageUrl"
            :alt="match.stadium"
            class="match-stadium-thumb"
            loading="lazy"
            decoding="async"
          />
        </button>
        <span v-else class="match-stadium-thumb-placeholder" aria-hidden="true">🏟️</span>
        <span class="match-venue-text">
          {{ match.stadium }}<template v-if="match.city">, {{ match.city }}</template>
        </span>
      </span>
      <CountdownBadge v-if="match.status === 'scheduled'" :kickoff-time="match.kickoffTime" />
    </div>
    <div v-if="match.prediction" class="text-center mb-2">
      <span class="badge badge-info">{{ t('matches.yourTip') }}: {{ match.prediction.predictedHomeScore }} : {{ match.prediction.predictedAwayScore }}</span>
      <span v-if="match.prediction.points !== null" class="badge badge-success" style="margin-left: 0.5rem;">
        {{ formatPoints(match.prediction.points) }} {{ t('common.points') }}
      </span>
    </div>
    <div v-if="showForm && match.canPredict" class="match-actions">
      <PredictionForm
        :match="match"
        :prediction="match.prediction"
        @saved="$emit('saved')"
      />
    </div>
    <div v-else-if="!match.canPredict" class="match-locked text-center">
      <span class="match-lock-icon" :title="t('predictions.locked')">🔒</span>
      <span v-if="match.prediction" class="badge badge-info">
        {{ t('matches.yourTip') }}: {{ match.prediction.predictedHomeScore }} : {{ match.prediction.predictedAwayScore }}
      </span>
      <span v-else class="text-muted">{{ t('matches.noTipGiven') }}</span>
    </div>
    <div v-else-if="!match.hasPrediction" class="text-center text-muted">
      {{ t('matches.noTipGiven') }}
    </div>
    <AIMatchPreview v-if="showAiPreview && !match.stadiumImageUrl" :match-id="match.id" />
    <MatchVenueModal
      :open="showVenueModal"
      :match="match"
      :show-ai="showAiPreview"
      @close="showVenueModal = false"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import PredictionForm from './PredictionForm.vue';
import LiveScoreBadge from './LiveScoreBadge.vue';
import CountdownBadge from './CountdownBadge.vue';
import TeamFlag from './TeamFlag.vue';
import AIMatchPreview from './AIMatchPreview.vue';
import MatchVenueModal from './MatchVenueModal.vue';
import { useFormatters } from '../composables/useFormatters';
import { useMatchMeta } from '../composables/useMatchMeta';

const showVenueModal = ref(false);

defineProps({
  match: { type: Object, required: true },
  showForm: { type: Boolean, default: true },
  showAiPreview: { type: Boolean, default: true },
});

defineEmits(['saved']);

const { t } = useI18n();
const { formatDate, formatTime, formatPoints } = useFormatters();
const { matchRoundLabel } = useMatchMeta();
</script>
