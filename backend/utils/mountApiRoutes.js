function mountApiRoutes(app, basePath, routes) {
  const {
    authRoutes,
    userRoutes,
    teamRoutes,
    matchRoutes,
    predictionRoutes,
    leaderboardRoutes,
    scoringRuleRoutes,
    adminRoutes,
    syncRoutes,
    bonusRoutes,
    bonusAdminRoutes,
    statisticsRoutes,
    notificationRoutes,
    auditRoutes,
    emailRoutes,
    settingsRoutes,
    systemRoutes,
    aiRoutes,
    footballRoutes,
    playerImageRoutes,
    adminPlayerImageRoutes,
    displayRoutes,
    prizeRoutes,
    adminAiRoutes,
    challengeRoutes,
    achievementRoutes,
    whatIfRoutes,
    activityRoutes,
    feedbackRoutes,
    adminFeedbackRoutes,
    authMiddleware,
    adminMiddleware,
    settingsUpdateHandler,
    publicReadLimiter,
    leaderboardLimiter,
    displayLimiter,
  } = routes;

  app.use(`${basePath}/auth`, authRoutes);
  app.use(`${basePath}/users`, userRoutes);
  app.use(`${basePath}/teams`, publicReadLimiter, teamRoutes);
  app.use(`${basePath}/matches`, matchRoutes);
  app.use(`${basePath}/predictions`, predictionRoutes);
  app.use(`${basePath}/leaderboard`, leaderboardLimiter, leaderboardRoutes);
  app.use(`${basePath}/scoring-rules`, scoringRuleRoutes);
  app.use(`${basePath}/admin`, adminRoutes);
  app.use(`${basePath}/admin/sync`, syncRoutes);
  app.use(`${basePath}/bonus-questions`, bonusRoutes);
  app.use(`${basePath}/admin/bonus-questions`, bonusAdminRoutes);
  app.use(`${basePath}/statistics`, statisticsRoutes);
  app.use(`${basePath}/notifications`, notificationRoutes);
  app.use(`${basePath}/admin/audit-log`, auditRoutes);
  app.use(`${basePath}/admin/email`, emailRoutes);
  app.use(`${basePath}/settings`, settingsRoutes);
  app.put(`${basePath}/admin/settings`, authMiddleware, adminMiddleware, settingsUpdateHandler);
  app.use(`${basePath}/admin/system`, systemRoutes);
  app.use(`${basePath}/ai`, aiRoutes);
  app.use(`${basePath}/football`, footballRoutes);
  app.use(`${basePath}/player-images`, playerImageRoutes);
  app.use(`${basePath}/admin/player-images`, adminPlayerImageRoutes);
  app.use(`${basePath}/display`, displayLimiter, displayRoutes);
  app.use(`${basePath}/admin/prizes`, prizeRoutes);
  app.use(`${basePath}/admin/ai`, adminAiRoutes);
  app.use(`${basePath}/challenges`, challengeRoutes);
  app.use(`${basePath}/achievements`, achievementRoutes);
  app.use(`${basePath}/what-if`, whatIfRoutes);
  app.use(`${basePath}/activity`, activityRoutes);
  app.use(`${basePath}/feedback`, feedbackRoutes);
  app.use(`${basePath}/admin/feedback`, adminFeedbackRoutes);
}

module.exports = { mountApiRoutes };
