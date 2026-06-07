import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { useFootballTeamStore } from '../stores/footballTeamStore';
import { connectSocket, disconnectSocket } from '../services/socket';

const PublicLayout = () => import('../layouts/PublicLayout.vue');
const AppLayout = () => import('../layouts/AppLayout.vue');
const AdminLayout = () => import('../layouts/AdminLayout.vue');

const routes = [
  {
    path: '/display',
    name: 'Display',
    component: () => import('../views/DisplayView.vue'),
    meta: { publicDisplay: true },
  },
  {
    path: '/login',
    component: PublicLayout,
    children: [{ path: '', name: 'Login', component: () => import('../views/LoginView.vue'), meta: { guest: true } }],
  },
  {
    path: '/register',
    component: PublicLayout,
    children: [{ path: '', name: 'Register', component: () => import('../views/RegisterView.vue'), meta: { guest: true } }],
  },
  {
    path: '/verify-email',
    component: PublicLayout,
    children: [{ path: '', name: 'VerifyEmail', component: () => import('../views/VerifyEmailView.vue'), meta: { guest: true } }],
  },
  {
    path: '/auth/callback',
    component: PublicLayout,
    children: [{ path: '', name: 'AuthCallback', component: () => import('../views/AuthCallbackView.vue'), meta: { guest: true } }],
  },
  {
    path: '/auth/complete-registration',
    component: PublicLayout,
    children: [{ path: '', name: 'SsoComplete', component: () => import('../views/SsoCompleteView.vue'), meta: { guest: true } }],
  },
  {
    path: '/forgot-password',
    component: PublicLayout,
    children: [{ path: '', name: 'ForgotPassword', component: () => import('../views/ForgotPasswordView.vue'), meta: { guest: true } }],
  },
  {
    path: '/reset-password',
    component: PublicLayout,
    children: [{ path: '', name: 'ResetPassword', component: () => import('../views/ResetPasswordView.vue'), meta: { guest: true } }],
  },
  {
    path: '/privacy',
    component: PublicLayout,
    children: [{ path: '', name: 'Privacy', component: () => import('../views/PrivacyPolicyView.vue'), meta: { guest: true } }],
  },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/DashboardView.vue') },
      { path: 'matches', name: 'Matches', component: () => import('../views/MatchesView.vue') },
      { path: 'group-standings', name: 'GroupStandings', component: () => import('../views/GroupStandingsView.vue') },
      { path: 'national-teams', name: 'NationalTeams', component: () => import('../views/NationalTeamsView.vue') },
      { path: 'my-predictions', name: 'MyPredictions', component: () => import('../views/MyPredictionsView.vue') },
      { path: 'leaderboard', name: 'Leaderboard', component: () => import('../views/LeaderboardView.vue') },
      { path: 'team-ranking', name: 'TeamRanking', component: () => import('../views/TeamRankingView.vue') },
      { path: 'profile', name: 'Profile', component: () => import('../views/ProfileView.vue') },
      { path: 'statistics', name: 'Statistics', component: () => import('../views/StatisticsView.vue') },
      { path: 'bonus', name: 'Bonus', component: () => import('../views/BonusView.vue') },
      { path: 'notifications', name: 'Notifications', component: () => import('../views/NotificationsView.vue') },
      { path: 'ai-coach', name: 'AICoach', component: () => import('../views/AICoachView.vue') },
      { path: 'help', name: 'Help', component: () => import('../views/RulesHelpView.vue') },
    ],
  },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      { path: '', name: 'AdminDashboard', component: () => import('../views/admin/AdminDashboardView.vue') },
      { path: 'users', name: 'AdminUsers', component: () => import('../views/admin/AdminUsersView.vue') },
      { path: 'teams', name: 'AdminTeams', component: () => import('../views/admin/AdminTeamsView.vue') },
      { path: 'player-images', name: 'AdminPlayerImages', component: () => import('../views/admin/AdminPlayerImagesView.vue') },
      { path: 'matches', name: 'AdminMatches', component: () => import('../views/admin/AdminMatchesView.vue') },
      { path: 'results', name: 'AdminResults', component: () => import('../views/admin/AdminResultsView.vue') },
      { path: 'predictions', name: 'AdminPredictions', component: () => import('../views/admin/AdminPredictionsView.vue') },
      { path: 'favorites', name: 'AdminFavorites', component: () => import('../views/admin/AdminFavoritesView.vue') },
      { path: 'scoring-rules', name: 'AdminScoringRules', component: () => import('../views/admin/AdminScoringRulesView.vue') },
      { path: 'import', name: 'AdminImport', component: () => import('../views/admin/AdminImportView.vue') },
      { path: 'sync', name: 'AdminSync', component: () => import('../views/admin/AdminSyncView.vue') },
      { path: 'bonus-questions', name: 'AdminBonus', component: () => import('../views/admin/AdminBonusView.vue') },
      { path: 'email', name: 'AdminEmail', component: () => import('../views/admin/AdminEmailView.vue') },
      { path: 'statistics', name: 'AdminStatistics', component: () => import('../views/admin/AdminStatisticsView.vue') },
      { path: 'notifications', name: 'AdminNotifications', component: () => import('../views/admin/AdminNotificationsView.vue') },
      { path: 'audit-log', name: 'AdminAuditLog', component: () => import('../views/admin/AdminAuditLogView.vue') },
      { path: 'backup', name: 'AdminBackup', component: () => import('../views/admin/AdminBackupView.vue') },
      { path: 'system', name: 'AdminSystem', component: () => import('../views/admin/AdminSystemView.vue') },
      { path: 'ai-assistant', name: 'AdminAIAssistant', component: () => import('../views/admin/AdminAIAssistantView.vue') },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundView.vue'),
  },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.publicDisplay) return next();
  if (to.meta.requiresAuth && !authStore.isAuthenticated) return next('/login');
  if (to.meta.guest && authStore.isAuthenticated) return next('/dashboard');
  if (to.meta.requiresAdmin && !authStore.isAdmin) return next('/dashboard');

  if (to.meta.requiresAuth) {
    connectSocket();
    useFootballTeamStore().ensureLoaded();
  } else disconnectSocket();

  next();
});

export default router;
