import { useI18n } from 'vue-i18n';

const STAGE_KEYS = {
  'group stage': 'groupStage',
  'round of 16': 'roundOf16',
  'quarter-finals': 'quarterFinal',
  'quarter final': 'quarterFinal',
  'semi-finals': 'semiFinal',
  'semi final': 'semiFinal',
  'third place': 'thirdPlace',
  final: 'final',
};

export function useMatchMeta() {
  const { t } = useI18n();

  function stageLabel(stage) {
    if (!stage) return '';
    const key = STAGE_KEYS[String(stage).toLowerCase().trim()];
    if (key) return t(`matchStages.${key}`, stage);
    return stage;
  }

  function matchRoundLabel(match) {
    if (match?.groupName) {
      return `${t('matches.group')} ${match.groupName}`;
    }
    return stageLabel(match?.stage) || '–';
  }

  function matchRoundSortValue(match) {
    if (match?.groupName) return `0-${match.groupName}`;
    return `1-${String(match?.stage || '').toLowerCase()}`;
  }

  return { stageLabel, matchRoundLabel, matchRoundSortValue };
}
