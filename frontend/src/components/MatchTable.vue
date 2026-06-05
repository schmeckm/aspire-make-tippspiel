<template>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>{{ t('matchTable.date') }}</th>
          <th>{{ t('matchTable.time') }}</th>
          <th>{{ t('matchTable.stage') }}</th>
          <th>{{ t('matchTable.group') }}</th>
          <th>{{ t('matchTable.home') }}</th>
          <th>{{ t('matchTable.away') }}</th>
          <th>{{ t('matchTable.result') }}</th>
          <th>{{ t('matchTable.status') }}</th>
          <th v-if="showPrediction">{{ t('matchTable.tip') }}</th>
          <th v-if="showPrediction">{{ t('matchTable.points') }}</th>
          <th v-if="showActions">{{ t('common.actions') }}</th>
          <th v-if="showMatchRef" class="match-table-ref">{{ t('matchTable.ref') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="match in matches" :key="match.id">
          <td>{{ formatDate(match.kickoffTime) }}</td>
          <td>{{ formatTime(match.kickoffTime) }}</td>
          <td>{{ stageLabel(match.stage) }}</td>
          <td>{{ match.groupName ? `${t('matches.group')} ${match.groupName}` : '–' }}</td>
          <td><TeamFlag :name="match.homeTeam" inline /></td>
          <td><TeamFlag :name="match.awayTeam" inline /></td>
          <td>
            <span v-if="match.status === 'finished'">{{ match.homeScore }} : {{ match.awayScore }}</span>
            <span v-else class="text-muted">–</span>
          </td>
          <td><span :class="['badge', `badge-${match.status}`]">{{ statusLabel(match.status) }}</span></td>
          <td v-if="showPrediction">
            <span v-if="match.prediction">{{ match.prediction.predictedHomeScore }} : {{ match.prediction.predictedAwayScore }}</span>
            <span v-else class="text-muted">–</span>
          </td>
          <td v-if="showPrediction">
            <span v-if="match.prediction?.points !== null && match.prediction?.points !== undefined">{{ formatPoints(match.prediction.points) }}</span>
            <span v-else class="text-muted">–</span>
          </td>
          <td v-if="showActions">
            <div class="btn-group">
              <button class="btn btn-secondary btn-sm" @click="$emit('edit', match)">{{ t('common.edit') }}</button>
              <button class="btn btn-danger btn-sm" @click="$emit('delete', match)">{{ t('common.delete') }}</button>
            </div>
          </td>
          <td v-if="showMatchRef" class="match-table-ref">
            <MatchRefCell
              :match-number="match.matchNumber"
              :external-api-id="match.externalApiId"
            />
          </td>
        </tr>
        <tr v-if="matches.length === 0">
          <td :colspan="colspan" class="text-center text-muted">{{ t('matchTable.empty') }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFormatters } from '../composables/useFormatters';
import { useMatchMeta } from '../composables/useMatchMeta';
import TeamFlag from './TeamFlag.vue';
import MatchRefCell from './MatchRefCell.vue';

const props = defineProps({
  matches: { type: Array, default: () => [] },
  showPrediction: { type: Boolean, default: false },
  showActions: { type: Boolean, default: false },
  showMatchRef: { type: Boolean, default: true },
});

defineEmits(['edit', 'delete']);

const { t } = useI18n();
const { formatDate, formatTime, formatPoints } = useFormatters();
const { stageLabel } = useMatchMeta();

const colspan = computed(() => {
  let cols = 8;
  if (props.showPrediction) cols += 2;
  if (props.showActions) cols += 1;
  if (props.showMatchRef) cols += 1;
  return cols;
});

function statusLabel(status) {
  return t(`matchStatus.${status}`, status);
}
</script>
