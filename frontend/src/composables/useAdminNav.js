import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

export function useAdminNavLinks() {
  const { t } = useI18n();

  return computed(() => [
    { to: '/admin', label: t('nav.adminDashboard'), icon: 'settings' },
    { to: '/admin/import', label: t('nav.csvImport'), icon: 'download' },
    { to: '/admin/results-copilot', label: t('nav.resultsCopilot'), icon: 'zap' },
    { to: '/admin/results', label: t('nav.results'), icon: 'chart' },
    { to: '/admin/matches', label: t('nav.matchAdmin'), icon: 'calendar' },
    { to: '/admin/sync', label: t('nav.sync'), icon: 'refresh' },
    { to: '/admin/bonus-questions', label: t('nav.bonus'), icon: 'target' },
    { to: '/admin/email', label: t('nav.email'), icon: 'mail' },
    { to: '/admin/users', label: t('nav.users'), icon: 'users' },
    { to: '/admin/teams', label: t('nav.teams'), icon: 'building' },
    { to: '/admin/team-performance', label: t('nav.teamPerformance'), icon: 'users' },
    { to: '/admin/player-images', label: t('nav.playerImages'), icon: 'image' },
    { to: '/admin/predictions', label: t('nav.predictions'), icon: 'clipboard' },
    { to: '/admin/favorites', label: t('nav.favorites'), icon: 'star' },
    { to: '/admin/scoring-rules', label: t('nav.scoringRules'), icon: 'award' },
    { to: '/admin/prizes', label: t('nav.prizesAdmin'), icon: 'trophy' },
    { to: '/admin/ai-assistant', label: t('nav.aiAssistant'), icon: 'bot' },
    { to: '/admin/statistics', label: t('nav.statistics'), icon: 'chart' },
    { to: '/admin/notifications', label: t('nav.notifications'), icon: 'bell' },
    { to: '/admin/audit-log', label: t('nav.auditLog'), icon: 'file-text' },
    { to: '/admin/backup', label: t('nav.dataBackup'), icon: 'backup' },
    { to: '/admin/system', label: t('nav.systemStatus'), icon: 'activity' },
  ]);
}

export function useAdminSidebarLinks() {
  const adminLinks = useAdminNavLinks();
  const { t } = useI18n();

  return computed(() => [
    ...adminLinks.value,
    { to: '/dashboard', label: t('nav.backToApp'), icon: 'arrow-left' },
  ]);
}
