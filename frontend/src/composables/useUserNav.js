import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppSettingsStore } from '../stores/appSettingsStore';

export function useUserNavLinks() {
  const { t } = useI18n();
  const appSettings = useAppSettingsStore();

  return computed(() => {
    const links = [
      { to: '/dashboard', label: t('nav.dashboard'), icon: 'home' },
      { to: '/tip-copilot', label: t('nav.tipCopilot'), icon: 'zap' },
      { to: '/matches', label: t('nav.matches'), icon: 'matches' },
      { to: '/group-standings', label: t('nav.groupStandings'), icon: 'table' },
      { to: '/tournament-bracket', label: t('nav.tournamentBracket'), icon: 'bracket' },
      { to: '/national-teams', label: t('nav.nationalTeams'), icon: 'globe' },
      { to: '/my-predictions', label: t('nav.myPredictions'), icon: 'edit' },
      { to: '/bonus', label: t('nav.bonus'), icon: 'target' },
      { to: '/ai-coach', label: t('nav.aiCoach'), icon: 'bot' },
      { to: '/leaderboard', label: t('nav.leaderboard'), icon: 'trophy' },
    ];

    if (appSettings.showPrizesNav) {
      links.push({ to: '/prizes', label: t('nav.prizes'), icon: 'award' });
    }

    links.push(
      { to: '/team-ranking', label: t('nav.teamRanking'), icon: 'users' },
      { to: '/team-performance', label: t('nav.teamPerformance'), icon: 'users' },
      { to: '/statistics', label: t('nav.statistics'), icon: 'chart' },
      { to: '/notifications', label: t('nav.notifications'), icon: 'bell' },
      { to: '/profile', label: t('nav.profile'), icon: 'user' },
    );

    return links;
  });
}

export function useBottomNavLinks() {
  const { t } = useI18n();

  return computed(() => [
    { to: '/dashboard', label: t('nav.dashboard'), icon: 'home' },
    { to: '/matches', label: t('nav.matches'), icon: 'matches' },
    { to: '/bonus', label: t('nav.bonus'), icon: 'target' },
    { to: '/leaderboard', label: t('nav.leaderboard'), icon: 'trophy' },
  ]);
}
