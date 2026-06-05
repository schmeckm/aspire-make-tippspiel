/**
 * One-time migration helper: replace hardcoded German API errors with i18n keys.
 */
const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '../routes');

const REPLACEMENTS = [
  ["res.status(500).json({ error: 'Teams konnten nicht geladen werden.' })", "sendError(res, req, 500, 'errors.teamsLoadFailed')"],
  ["return res.status(400).json({ error: 'Teamname ist erforderlich.' })", "return sendError(res, req, 400, 'errors.teamNameRequired')"],
  ["return res.status(409).json({ error: 'Teamname bereits vergeben.' })", "return sendError(res, req, 409, 'errors.teamNameTaken')"],
  ["res.status(500).json({ error: 'Team konnte nicht erstellt werden.' })", "sendError(res, req, 500, 'errors.teamCreateFailed')"],
  ["return res.status(404).json({ error: 'Team nicht gefunden.' })", "return sendError(res, req, 404, 'errors.teamNotFound')"],
  ["res.status(500).json({ error: 'Team konnte nicht geladen werden.' })", "sendError(res, req, 500, 'errors.teamLoadFailed')"],
  ["res.status(500).json({ error: 'Team konnte nicht aktualisiert werden.' })", "sendError(res, req, 500, 'errors.teamUpdateFailed')"],
  ["res.status(500).json({ error: 'Team konnte nicht gelöscht werden.' })", "sendError(res, req, 500, 'errors.teamDeleteFailed')"],
  ["res.json({ message: 'Team gelöscht.' })", "res.json({ message: translate(req, 'messages.teamDeleted') })"],
  ["res.status(500).json({ error: 'Spiele konnten nicht geladen werden.' })", "sendError(res, req, 500, 'errors.matchesLoadFailed')"],
  ["return res.status(404).json({ error: 'Spiel nicht gefunden.' })", "return sendError(res, req, 404, 'errors.matchNotFound')"],
  ["if (!match) return res.status(404).json({ error: 'Spiel nicht gefunden.' })", "if (!match) return sendError(res, req, 404, 'errors.matchNotFound')"],
  ["res.status(500).json({ error: 'Spiel konnte nicht geladen werden.' })", "sendError(res, req, 500, 'errors.matchLoadFailed')"],
  ["return res.status(400).json({ error: 'Pflichtfelder fehlen.' })", "return sendError(res, req, 400, 'errors.requiredFields')"],
  ["return res.status(409).json({ error: 'Spielnummer bereits vergeben.' })", "return sendError(res, req, 409, 'errors.matchNumberTaken')"],
  ["res.status(500).json({ error: 'Spiel konnte nicht erstellt werden.' })", "sendError(res, req, 500, 'errors.matchCreateFailed')"],
  ["res.status(500).json({ error: 'Spiel konnte nicht aktualisiert werden.' })", "sendError(res, req, 500, 'errors.matchUpdateFailed')"],
  ["res.status(500).json({ error: 'Spiel konnte nicht gelöscht werden.' })", "sendError(res, req, 500, 'errors.matchDeleteFailed')"],
  ["return res.status(400).json({ error: 'Heim- und Auswärtstor sind erforderlich.' })", "return sendError(res, req, 400, 'errors.scoresRequired')"],
  ["res.status(500).json({ error: 'Ergebnis konnte nicht gespeichert werden.' })", "sendError(res, req, 500, 'errors.resultSaveFailed')"],
  ["res.status(500).json({ error: 'Spiel konnte nicht gesperrt werden.' })", "sendError(res, req, 500, 'errors.matchLockFailed')"],
  ["res.status(500).json({ error: 'Spiel konnte nicht entsperrt werden.' })", "sendError(res, req, 500, 'errors.matchUnlockFailed')"],
  ["res.status(500).json({ error: 'Aktion fehlgeschlagen.' })", "sendError(res, req, 500, 'errors.actionFailed')"],
  ["res.status(500).json({ error: 'Tipps konnten nicht geladen werden.' })", "sendError(res, req, 500, 'errors.predictionsLoadFailed')"],
  ["return res.status(400).json({ error: 'Spiel und Tipp sind erforderlich.' })", "return sendError(res, req, 400, 'errors.predictionRequired')"],
  ["return res.status(403).json({ error: 'Tippabgabe für dieses Spiel nicht mehr möglich.' })", "return sendError(res, req, 403, 'errors.predictionClosed')"],
  ["return res.status(409).json({ error: 'Tipp existiert bereits. Bitte bearbeiten.' })", "return sendError(res, req, 409, 'errors.predictionExists')"],
  ["res.status(500).json({ error: 'Tipp konnte nicht gespeichert werden.' })", "sendError(res, req, 500, 'errors.predictionSaveFailed')"],
  ["return res.status(404).json({ error: 'Tipp nicht gefunden.' })", "return sendError(res, req, 404, 'errors.predictionNotFound')"],
  ["return res.status(403).json({ error: 'Tipp kann nicht mehr bearbeitet werden.' })", "return sendError(res, req, 403, 'errors.predictionEditClosed')"],
  ["res.status(500).json({ error: 'Tipp konnte nicht aktualisiert werden.' })", "sendError(res, req, 500, 'errors.predictionUpdateFailed')"],
  ["res.status(500).json({ error: 'Tipp konnte nicht gelöscht werden.' })", "sendError(res, req, 500, 'errors.predictionDeleteFailed')"],
  ["return res.status(403).json({ error: 'Zugriff verweigert.' })", "return sendError(res, req, 403, 'errors.accessDenied')"],
  ["res.status(500).json({ error: 'Hitliste konnte nicht geladen werden.' })", "sendError(res, req, 500, 'errors.leaderboardLoadFailed')"],
  ["res.status(500).json({ error: 'Export fehlgeschlagen.' })", "sendError(res, req, 500, 'errors.exportFailed')"],
  ["res.status(500).json({ error: 'Teamwertung konnte nicht geladen werden.' })", "sendError(res, req, 500, 'errors.teamRankingLoadFailed')"],
  ["res.status(500).json({ error: 'Punkte-Regeln konnten nicht geladen werden.' })", "sendError(res, req, 500, 'errors.scoringRulesLoadFailed')"],
  ["res.status(500).json({ error: 'Punkte-Regeln konnten nicht aktualisiert werden.' })", "sendError(res, req, 500, 'errors.scoringRulesUpdateFailed')"],
  ["res.status(500).json({ error: 'Dashboard konnte nicht geladen werden.' })", "sendError(res, req, 500, 'errors.dashboardLoadFailed')"],
  ["res.status(500).json({ error: 'Punkte konnten nicht neu berechnet werden.' })", "sendError(res, req, 500, 'errors.recalculateFailed')"],
  ["res.status(500).json({ error: 'Senden fehlgeschlagen.' })", "sendError(res, req, 500, 'errors.sendFailed')"],
  ["return res.status(400).json({ error: 'Keine CSV-Datei hochgeladen.' })", "return sendError(res, req, 400, 'errors.noCsvFile')"],
  ["res.status(500).json({ error: error.message || 'CSV-Import fehlgeschlagen.' })", "sendError(res, req, 500, 'errors.csvImportFailed')"],
  ["res.status(500).json({ error: 'Sync-Status konnte nicht geladen werden.' })", "sendError(res, req, 500, 'errors.syncStatusLoadFailed')"],
  ["res.status(500).json({ error: 'Sync-Logs konnten nicht geladen werden.' })", "sendError(res, req, 500, 'errors.syncLogsLoadFailed')"],
  ["res.status(500).json({ error: 'Sync-Fehler konnten nicht geladen werden.' })", "sendError(res, req, 500, 'errors.syncErrorsLoadFailed')"],
  ["res.status(500).json({ error: 'Systemstatus konnte nicht geladen werden.' })", "sendError(res, req, 500, 'errors.systemStatusLoadFailed')"],
  ["res.status(500).json({ error: 'Einstellungen konnten nicht geladen werden.' })", "sendError(res, req, 500, 'errors.settingsLoadFailed')"],
  ["res.status(500).json({ error: 'Einstellungen konnten nicht gespeichert werden.' })", "sendError(res, req, 500, 'errors.settingsSaveFailed')"],
  ["res.status(500).json({ error: 'E-Mail-Status konnte nicht geladen werden.' })", "sendError(res, req, 500, 'errors.emailStatusLoadFailed')"],
  ["res.status(500).json({ error: error.message || 'Test-E-Mail fehlgeschlagen.' })", "sendError(res, req, 500, 'errors.testEmailFailed')"],
  ["res.status(500).json({ error: 'Erinnerungen konnten nicht gesendet werden.' })", "sendError(res, req, 500, 'errors.remindersSendFailed')"],
  ["res.status(500).json({ error: 'Audit-Log konnte nicht geladen werden.' })", "sendError(res, req, 500, 'errors.auditLogLoadFailed')"],
  ["res.status(500).json({ error: 'Benachrichtigungen konnten nicht geladen werden.' })", "sendError(res, req, 500, 'errors.notificationsLoadFailed')"],
  ["return res.status(404).json({ error: 'Benachrichtigung nicht gefunden.' })", "return sendError(res, req, 404, 'errors.notificationNotFound')"],
  ["if (!notification) return res.status(404).json({ error: 'Benachrichtigung nicht gefunden.' })", "if (!notification) return sendError(res, req, 404, 'errors.notificationNotFound')"],
  ["res.status(500).json({ error: 'Fehler beim Markieren.' })", "sendError(res, req, 500, 'errors.notificationMarkFailed')"],
  ["res.status(500).json({ error: 'Statistiken konnten nicht geladen werden.' })", "sendError(res, req, 500, 'errors.statisticsLoadFailed')"],
  ["if (!isAdmin && !isSelf) return res.status(403).json({ error: 'Zugriff verweigert.' })", "if (!isAdmin && !isSelf) return sendError(res, req, 403, 'errors.accessDenied')"],
  ["if (!stats) return res.status(404).json({ error: 'Benutzer nicht gefunden.' })", "if (!stats) return sendError(res, req, 404, 'errors.userNotFound')"],
  ["if (!stats) return res.status(404).json({ error: 'Team nicht gefunden.' })", "if (!stats) return sendError(res, req, 404, 'errors.teamNotFound')"],
  ["res.status(500).json({ error: 'Team-Statistiken konnten nicht geladen werden.' })", "sendError(res, req, 500, 'errors.statisticsLoadFailed')"],
  ["res.status(500).json({ error: 'Übersicht konnte nicht geladen werden.' })", "sendError(res, req, 500, 'errors.overviewLoadFailed')"],
  ["res.status(500).json({ error: 'Bonusfragen konnten nicht geladen werden.' })", "sendError(res, req, 500, 'errors.bonusQuestionsLoadFailed')"],
  ["return res.status(404).json({ error: 'Bonusfrage nicht gefunden.' })", "return sendError(res, req, 404, 'errors.bonusQuestionNotFound')"],
  ["if (!question) return res.status(404).json({ error: 'Bonusfrage nicht gefunden.' })", "if (!question) return sendError(res, req, 404, 'errors.bonusQuestionNotFound')"],
  ["return res.status(403).json({ error: 'Bonusfrage ist gesperrt.' })", "return sendError(res, req, 403, 'errors.bonusQuestionLocked')"],
  ["if (question.status !== 'open') return res.status(403).json({ error: 'Bonusfrage ist gesperrt.' })", "if (question.status !== 'open') return sendError(res, req, 403, 'errors.bonusQuestionLocked')"],
  ["if (prediction.bonusQuestion.status !== 'open') return res.status(403).json({ error: 'Bonusfrage ist gesperrt.' })", "if (prediction.bonusQuestion.status !== 'open') return sendError(res, req, 403, 'errors.bonusQuestionLocked')"],
  ["return res.status(403).json({ error: 'Abgabefrist abgelaufen.' })", "return sendError(res, req, 403, 'errors.bonusDeadlinePassed')"],
  ["return res.status(409).json({ error: 'Antwort existiert bereits. Bitte bearbeiten.' })", "return sendError(res, req, 409, 'errors.bonusAnswerExists')"],
  ["if (existing) return res.status(409).json({ error: 'Antwort existiert bereits. Bitte bearbeiten.' })", "if (existing) return sendError(res, req, 409, 'errors.bonusAnswerExists')"],
  ["res.status(500).json({ error: 'Antwort konnte nicht gespeichert werden.' })", "sendError(res, req, 500, 'errors.bonusAnswerSaveFailed')"],
  ["return res.status(404).json({ error: 'Antwort nicht gefunden.' })", "return sendError(res, req, 404, 'errors.bonusAnswerNotFound')"],
  ["if (!prediction) return res.status(404).json({ error: 'Antwort nicht gefunden.' })", "if (!prediction) return sendError(res, req, 404, 'errors.bonusAnswerNotFound')"],
  ["if (prediction.userId !== req.user.id) return res.status(403).json({ error: 'Zugriff verweigert.' })", "if (prediction.userId !== req.user.id) return sendError(res, req, 403, 'errors.accessDenied')"],
  ["res.status(500).json({ error: 'Antwort konnte nicht aktualisiert werden.' })", "sendError(res, req, 500, 'errors.bonusAnswerUpdateFailed')"],
  ["res.status(500).json({ error: 'Bonusfrage konnte nicht erstellt werden.' })", "sendError(res, req, 500, 'errors.bonusQuestionCreateFailed')"],
  ["return res.status(404).json({ error: 'Nicht gefunden.' })", "return sendError(res, req, 404, 'errors.notFound')"],
  ["if (!question) return res.status(404).json({ error: 'Nicht gefunden.' })", "if (!question) return sendError(res, req, 404, 'errors.notFound')"],
  ["res.status(500).json({ error: 'Fehler beim Laden.' })", "sendError(res, req, 500, 'errors.loadFailed')"],
  ["res.status(500).json({ error: 'Aktualisierung fehlgeschlagen.' })", "sendError(res, req, 500, 'errors.updateFailed')"],
  ["res.status(500).json({ error: 'Löschen fehlgeschlagen.' })", "sendError(res, req, 500, 'errors.deleteFailed')"],
  ["res.status(500).json({ error: 'Auflösung fehlgeschlagen.' })", "sendError(res, req, 500, 'errors.resolveFailed')"],
  ["res.status(500).json({ error: 'KI-Kommentare konnten nicht geladen werden.' })", "sendError(res, req, 500, 'errors.aiCommentsLoadFailed')"],
  ["res.status(500).json({ error: 'KI-Interaktionslog konnte nicht geladen werden.' })", "sendError(res, req, 500, 'errors.aiLogLoadFailed')"],
];

const IMPORT_LINE = "const { sendError, translate } = require('../utils/apiResponse');";

for (const file of fs.readdirSync(ROUTES_DIR)) {
  if (!file.endsWith('.js')) continue;
  const filePath = path.join(ROUTES_DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (file === 'authRoutes.js' || file === 'userRoutes.js') continue;

  let changed = false;
  for (const [from, to] of REPLACEMENTS) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed = true;
    }
  }

  if (changed && !content.includes("require('../utils/apiResponse')")) {
    const expressIdx = content.indexOf("const express = require('express');");
    if (expressIdx >= 0) {
      content = content.replace(
        "const express = require('express');",
        `const express = require('express');\n${IMPORT_LINE}`
      );
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log('Updated', file);
  }
}

console.log('Done');
