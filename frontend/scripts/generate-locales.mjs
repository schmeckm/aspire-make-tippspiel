import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const locales = {
  de: {
    brand: { title: 'WM 2026 Tippspiel', subtitle: 'Tippspiel' },
    languages: { de: 'Deutsch', en: 'English', es: 'Español', fr: 'Français', label: 'Sprache' },
    common: {
      save: 'Speichern', saving: 'Speichern...', cancel: 'Abbrechen', delete: 'Löschen', edit: 'Bearbeiten',
      create: 'Erstellen', loading: 'Laden...', search: 'Suchen', yes: 'Ja', no: 'Nein', actions: 'Aktionen',
      back: 'Zurück', close: 'Schließen', confirm: 'Bestätigen', noTeam: 'Kein Team', vs: 'vs',
      points: 'Pkt.', all: 'Alle', none: 'Keine', optional: 'optional', required: 'Pflichtfeld',
    },
    nav: {
      navigation: 'Navigation', administration: 'Administration', dashboard: 'Dashboard', matches: 'Spiele',
      myPredictions: 'Meine Tipps', bonus: 'Bonusfragen', aiCoach: 'KI Coach', leaderboard: 'Hitliste',
      teamRanking: 'Teamwertung', statistics: 'Statistiken', notifications: 'Benachrichtigungen', profile: 'Profil',
      adminDashboard: 'Admin Dashboard', aiAssistant: 'KI Assistent', sync: 'Synchronisierung', email: 'E-Mail',
      users: 'Benutzerverwaltung', teams: 'Teamverwaltung', matchAdmin: 'Spielverwaltung', results: 'Ergebnisverwaltung',
      predictions: 'Tippübersicht', scoringRules: 'Punkte-Regeln', csvImport: 'CSV Import', auditLog: 'Audit Log',
      systemStatus: 'Systemstatus', backToApp: 'Zur App', logout: 'Abmelden', adminArea: 'Admin-Bereich',
    },
    auth: {
      welcomeBack: 'Willkommen zurück!', createAccount: 'Konto erstellen', email: 'E-Mail', password: 'Passwort',
      firstName: 'Vorname', lastName: 'Nachname', signIn: 'Anmelden', signingIn: 'Anmelden...', register: 'Registrieren',
      registering: 'Registrieren...', noAccount: 'Noch kein Konto?', hasAccount: 'Bereits registriert?',
      registerNow: 'Jetzt registrieren', toLogin: 'Zum Login', loginFailed: 'Anmeldung fehlgeschlagen.',
      registerFailed: 'Registrierung fehlgeschlagen.', teamDepartment: 'Team / Abteilung',
    },
    profile: {
      title: 'Profil', newPassword: 'Neues Passwort (optional)', passwordHint: 'Leer lassen, um beizubehalten',
      saveProfile: 'Profil speichern', updated: 'Profil erfolgreich aktualisiert.', updateFailed: 'Profil konnte nicht gespeichert werden.',
    },
    dashboard: {
      welcome: 'Willkommen, {name}!', nextMatches: 'Nächste Spiele', allMatches: 'Alle Spiele', topPlayers: 'Top Spieler',
      openPredictions: 'Offene Tipps', myRank: 'Mein Rang', myPoints: 'Meine Punkte', completion: 'Vollständigkeit',
      currentRank: 'Aktueller Rang', totalPoints: 'Gesamtpunkte', tipsSubmitted: 'Tipps abgegeben', missingTips: 'Fehlende Tipps',
      noUpcoming: 'Keine anstehenden Spiele.', top5: 'Top 5 Hitliste', fullLeaderboard: 'Vollständige Hitliste',
    },
    matches: {
      title: 'Spiele', filters: {
        all: 'Alle Spiele', open: 'Offene Tipps', finished: 'Beendet', missing: 'Meine fehlenden Tipps',
        group: 'Gruppenphase', knockout: 'K.o.-Phase',
      },
      empty: 'Keine Spiele für diesen Filter gefunden.', group: 'Gruppe', yourTip: 'Ihr Tipp',
      noTip: 'Kein Tipp abgegeben', noTipGiven: 'Kein Tipp abgegeben',
    },
    matchTable: {
      number: '#', date: 'Datum', time: 'Zeit', stage: 'Phase', group: 'Gruppe', home: 'Heim', away: 'Auswärts',
      result: 'Ergebnis', status: 'Status', tip: 'Tipp', points: 'Punkte', empty: 'Keine Spiele gefunden.',
    },
    matchStatus: { scheduled: 'Geplant', locked: 'Gesperrt', finished: 'Beendet', live: 'Läuft', halftime: 'Halbzeit', postponed: 'Verschoben', cancelled: 'Abgesagt' },
    predictions: { title: 'Meine Tipps', save: 'Tipp speichern', saved: 'Tipp gespeichert.', submit: 'Tipp abgeben', myTip: 'Mein Tipp', game: 'Spiel', empty: 'Noch keine Tipps abgegeben.' },
    leaderboard: {
      title: 'Hitliste', rank: 'Rang', name: 'Name', team: 'Team', matchPts: 'Spielpkt.', bonus: 'Bonus',
      total: 'Gesamt', exact: 'Exakt', goalDiff: 'Tordiff.', tendency: 'Tendenz', tips: 'Tipps', completion: 'Vollst. %', empty: 'Keine Einträge.',
      exportCsv: 'CSV Export',
      filters: { overall: 'Gesamt', match: 'Spielpunkte', bonus: 'Bonuspunkte', group: 'Gruppenphase', knockout: 'K.o.-Phase' },
    },
    teamRanking: {
      title: 'Teamwertung', team: 'Team', members: 'Mitglieder', totalPoints: 'Gesamtpunkte', avgPoints: 'Ø Punkte',
      exactTips: 'Exakte Tipps', empty: 'Keine Teams vorhanden.',
    },
    bonus: { title: 'Bonusfragen', submit: 'Antwort senden', locked: 'Gesperrt', open: 'Offen', resolved: 'Aufgelöst', empty: 'Keine Bonusfragen verfügbar.' },
    ai: { coachTitle: 'KI Coach', coachSubtitle: 'Dein persönlicher Tipp-Assistent', askPlaceholder: 'Frage stellen...', send: 'Senden', preview: 'KI-Vorschau', regenerate: 'Neu generieren' },
    notifications: { title: 'Benachrichtigungen', empty: 'Keine Benachrichtigungen', markAllRead: 'Alle gelesen', markAllReadLong: 'Alle als gelesen markieren' },
    statistics: { title: 'Statistiken', rankTrend: 'Rangverlauf', pointsTrend: 'Punkteverlauf', pointsOverTime: 'Punkte über Zeit', rankOverTime: 'Rang über Zeit', accuracyByStage: 'Genauigkeit nach Phase', phase: 'Phase', tips: 'Tipps', exact: 'Exakt', points: 'Punkte' },
    admin: {
      manualMode: 'Manueller CSV-Modus', apiMode: 'API-Modus aktiv', syncFixtures: 'Spielplan synchronisieren',
      syncResults: 'Ergebnisse synchronisieren', recalculate: 'Punkte neu berechnen', importCsv: 'CSV importieren',
    },
    countdown: { started: 'Gestartet', days: 'd', hours: 'h', minutes: 'm' },
    chart: { rank: 'Rang', points: 'Punkte' },
  },
  en: {
    brand: { title: 'WM 2026 Prediction Game', subtitle: 'Prediction Game' },
    languages: { de: 'German', en: 'English', es: 'Spanish', fr: 'French', label: 'Language' },
    common: {
      save: 'Save', saving: 'Saving...', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
      create: 'Create', loading: 'Loading...', search: 'Search', yes: 'Yes', no: 'No', actions: 'Actions',
      back: 'Back', close: 'Close', confirm: 'Confirm', noTeam: 'No team', vs: 'vs',
      points: 'Pts', all: 'All', none: 'None', optional: 'optional', required: 'Required',
    },
    nav: {
      navigation: 'Navigation', administration: 'Administration', dashboard: 'Dashboard', matches: 'Matches',
      myPredictions: 'My Predictions', bonus: 'Bonus Questions', aiCoach: 'AI Coach', leaderboard: 'Leaderboard',
      teamRanking: 'Team Ranking', statistics: 'Statistics', notifications: 'Notifications', profile: 'Profile',
      adminDashboard: 'Admin Dashboard', aiAssistant: 'AI Assistant', sync: 'Synchronization', email: 'Email',
      users: 'User Management', teams: 'Team Management', matchAdmin: 'Match Management', results: 'Result Management',
      predictions: 'Prediction Overview', scoringRules: 'Scoring Rules', csvImport: 'CSV Import', auditLog: 'Audit Log',
      systemStatus: 'System Status', backToApp: 'Back to App', logout: 'Sign out', adminArea: 'Admin Area',
    },
    auth: {
      welcomeBack: 'Welcome back!', createAccount: 'Create account', email: 'Email', password: 'Password',
      firstName: 'First name', lastName: 'Last name', signIn: 'Sign in', signingIn: 'Signing in...', register: 'Register',
      registering: 'Registering...', noAccount: 'No account yet?', hasAccount: 'Already registered?',
      registerNow: 'Register now', toLogin: 'Go to login', loginFailed: 'Login failed.',
      registerFailed: 'Registration failed.', teamDepartment: 'Team / Department',
    },
    profile: {
      title: 'Profile', newPassword: 'New password (optional)', passwordHint: 'Leave blank to keep current password',
      saveProfile: 'Save profile', updated: 'Profile updated successfully.', updateFailed: 'Profile could not be saved.',
    },
    dashboard: {
      welcome: 'Welcome, {name}!', nextMatches: 'Upcoming matches', allMatches: 'All matches', topPlayers: 'Top players',
      openPredictions: 'Open predictions', myRank: 'My rank', myPoints: 'My points', completion: 'Completion',
      currentRank: 'Current rank', totalPoints: 'Total points', tipsSubmitted: 'Predictions submitted', missingTips: 'Missing predictions',
      noUpcoming: 'No upcoming matches.', top5: 'Top 5 leaderboard', fullLeaderboard: 'Full leaderboard',
    },
    matches: {
      title: 'Matches', filters: {
        all: 'All matches', open: 'Open predictions', finished: 'Finished', missing: 'My missing predictions',
        group: 'Group stage', knockout: 'Knockout stage',
      },
      empty: 'No matches found for this filter.', group: 'Group', yourTip: 'Your prediction',
      noTip: 'No prediction submitted', noTipGiven: 'No prediction submitted',
    },
    matchTable: {
      number: '#', date: 'Date', time: 'Time', stage: 'Stage', group: 'Group', home: 'Home', away: 'Away',
      result: 'Result', status: 'Status', tip: 'Prediction', points: 'Points', empty: 'No matches found.',
    },
    matchStatus: { scheduled: 'Scheduled', locked: 'Locked', finished: 'Finished', live: 'Live', halftime: 'Halftime', postponed: 'Postponed', cancelled: 'Cancelled' },
    predictions: { title: 'My Predictions', save: 'Save prediction', saved: 'Prediction saved.', submit: 'Submit prediction', myTip: 'My prediction', game: 'Match', empty: 'No predictions submitted yet.' },
    leaderboard: {
      title: 'Leaderboard', rank: 'Rank', name: 'Name', team: 'Team', matchPts: 'Match pts', bonus: 'Bonus',
      total: 'Total', exact: 'Exact', goalDiff: 'Goal diff.', tendency: 'Tendency', tips: 'Tips', completion: 'Complete %', empty: 'No entries.',
      exportCsv: 'CSV Export',
      filters: { overall: 'Overall', match: 'Match points', bonus: 'Bonus points', group: 'Group stage', knockout: 'Knockout stage' },
    },
    teamRanking: {
      title: 'Team Ranking', team: 'Team', members: 'Members', totalPoints: 'Total points', avgPoints: 'Avg points',
      exactTips: 'Exact predictions', empty: 'No teams available.',
    },
    bonus: { title: 'Bonus Questions', submit: 'Submit answer', locked: 'Locked', open: 'Open', resolved: 'Resolved', empty: 'No bonus questions available.' },
    ai: { coachTitle: 'AI Coach', coachSubtitle: 'Your personal prediction assistant', askPlaceholder: 'Ask a question...', send: 'Send', preview: 'AI preview', regenerate: 'Regenerate' },
    notifications: { title: 'Notifications', empty: 'No notifications', markAllRead: 'Mark all read', markAllReadLong: 'Mark all as read' },
    statistics: { title: 'Statistics', rankTrend: 'Rank trend', pointsTrend: 'Points trend', pointsOverTime: 'Points over time', rankOverTime: 'Rank over time', accuracyByStage: 'Accuracy by stage', phase: 'Stage', tips: 'Tips', exact: 'Exact', points: 'Points' },
    admin: {
      manualMode: 'Manual CSV mode', apiMode: 'API mode active', syncFixtures: 'Sync schedule',
      syncResults: 'Sync results', recalculate: 'Recalculate points', importCsv: 'Import CSV',
    },
    countdown: { started: 'Started', days: 'd', hours: 'h', minutes: 'm' },
    chart: { rank: 'Rank', points: 'Points' },
  },
  es: {
    brand: { title: 'Juego de Pronósticos WM 2026', subtitle: 'Juego de Pronósticos' },
    languages: { de: 'Alemán', en: 'Inglés', es: 'Español', fr: 'Francés', label: 'Idioma' },
    common: {
      save: 'Guardar', saving: 'Guardando...', cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar',
      create: 'Crear', loading: 'Cargando...', search: 'Buscar', yes: 'Sí', no: 'No', actions: 'Acciones',
      back: 'Volver', close: 'Cerrar', confirm: 'Confirmar', noTeam: 'Sin equipo', vs: 'vs',
      points: 'Pts', all: 'Todos', none: 'Ninguno', optional: 'opcional', required: 'Obligatorio',
    },
    nav: {
      navigation: 'Navegación', administration: 'Administración', dashboard: 'Panel', matches: 'Partidos',
      myPredictions: 'Mis Pronósticos', bonus: 'Preguntas Bonus', aiCoach: 'Coach IA', leaderboard: 'Clasificación',
      teamRanking: 'Ranking por Equipos', statistics: 'Estadísticas', notifications: 'Notificaciones', profile: 'Perfil',
      adminDashboard: 'Panel Admin', aiAssistant: 'Asistente IA', sync: 'Sincronización', email: 'Correo',
      users: 'Gestión de Usuarios', teams: 'Gestión de Equipos', matchAdmin: 'Gestión de Partidos', results: 'Gestión de Resultados',
      predictions: 'Resumen de Pronósticos', scoringRules: 'Reglas de Puntos', csvImport: 'Importar CSV', auditLog: 'Registro de Auditoría',
      systemStatus: 'Estado del Sistema', backToApp: 'Volver a la App', logout: 'Cerrar sesión', adminArea: 'Área Admin',
    },
    auth: {
      welcomeBack: '¡Bienvenido de nuevo!', createAccount: 'Crear cuenta', email: 'Correo', password: 'Contraseña',
      firstName: 'Nombre', lastName: 'Apellido', signIn: 'Iniciar sesión', signingIn: 'Iniciando sesión...', register: 'Registrarse',
      registering: 'Registrando...', noAccount: '¿No tienes cuenta?', hasAccount: '¿Ya registrado?',
      registerNow: 'Regístrate ahora', toLogin: 'Ir al login', loginFailed: 'Inicio de sesión fallido.',
      registerFailed: 'Registro fallido.', teamDepartment: 'Equipo / Departamento',
    },
    profile: {
      title: 'Perfil', newPassword: 'Nueva contraseña (opcional)', passwordHint: 'Dejar en blanco para mantener la actual',
      saveProfile: 'Guardar perfil', updated: 'Perfil actualizado correctamente.', updateFailed: 'No se pudo guardar el perfil.',
    },
    dashboard: {
      welcome: '¡Bienvenido, {name}!', nextMatches: 'Próximos partidos', allMatches: 'Todos los partidos', topPlayers: 'Mejores jugadores',
      openPredictions: 'Pronósticos abiertos', myRank: 'Mi posición', myPoints: 'Mis puntos', completion: 'Completitud',
      currentRank: 'Posición actual', totalPoints: 'Puntos totales', tipsSubmitted: 'Pronósticos enviados', missingTips: 'Pronósticos faltantes',
      noUpcoming: 'No hay partidos próximos.', top5: 'Top 5 clasificación', fullLeaderboard: 'Clasificación completa',
    },
    matches: {
      title: 'Partidos', filters: {
        all: 'Todos los partidos', open: 'Pronósticos abiertos', finished: 'Finalizados', missing: 'Mis pronósticos faltantes',
        group: 'Fase de grupos', knockout: 'Fase eliminatoria',
      },
      empty: 'No se encontraron partidos para este filtro.', group: 'Grupo', yourTip: 'Tu pronóstico',
      noTip: 'Sin pronóstico', noTipGiven: 'Sin pronóstico enviado',
    },
    matchTable: {
      number: '#', date: 'Fecha', time: 'Hora', stage: 'Fase', group: 'Grupo', home: 'Local', away: 'Visitante',
      result: 'Resultado', status: 'Estado', tip: 'Pronóstico', points: 'Puntos', empty: 'No se encontraron partidos.',
    },
    matchStatus: { scheduled: 'Programado', locked: 'Bloqueado', finished: 'Finalizado', live: 'En vivo', halftime: 'Descanso', postponed: 'Aplazado', cancelled: 'Cancelado' },
    predictions: { title: 'Mis Pronósticos', save: 'Guardar pronóstico', saved: 'Pronóstico guardado.', submit: 'Enviar pronóstico', myTip: 'Mi pronóstico', game: 'Partido', empty: 'Aún no hay pronósticos enviados.' },
    leaderboard: {
      title: 'Clasificación', rank: 'Pos.', name: 'Nombre', team: 'Equipo', matchPts: 'Pts partido', bonus: 'Bonus',
      total: 'Total', exact: 'Exacto', goalDiff: 'Dif. goles', tendency: 'Tendencia', tips: 'Pronósticos', completion: 'Compl. %', empty: 'Sin entradas.',
      exportCsv: 'Exportar CSV',
      filters: { overall: 'General', match: 'Puntos de partido', bonus: 'Puntos bonus', group: 'Fase de grupos', knockout: 'Fase eliminatoria' },
    },
    teamRanking: {
      title: 'Ranking por Equipos', team: 'Equipo', members: 'Miembros', totalPoints: 'Puntos totales', avgPoints: 'Pts promedio',
      exactTips: 'Pronósticos exactos', empty: 'No hay equipos disponibles.',
    },
    bonus: { title: 'Preguntas Bonus', submit: 'Enviar respuesta', locked: 'Bloqueado', open: 'Abierto', resolved: 'Resuelto', empty: 'No hay preguntas bonus disponibles.' },
    ai: { coachTitle: 'Coach IA', coachSubtitle: 'Tu asistente personal de pronósticos', askPlaceholder: 'Haz una pregunta...', send: 'Enviar', preview: 'Vista previa IA', regenerate: 'Regenerar' },
    notifications: { title: 'Notificaciones', empty: 'Sin notificaciones', markAllRead: 'Marcar todo leído', markAllReadLong: 'Marcar todo como leído' },
    statistics: { title: 'Estadísticas', rankTrend: 'Tendencia de posición', pointsTrend: 'Tendencia de puntos', pointsOverTime: 'Puntos en el tiempo', rankOverTime: 'Posición en el tiempo', accuracyByStage: 'Precisión por fase', phase: 'Fase', tips: 'Pronósticos', exact: 'Exacto', points: 'Puntos' },
    admin: {
      manualMode: 'Modo CSV manual', apiMode: 'Modo API activo', syncFixtures: 'Sincronizar calendario',
      syncResults: 'Sincronizar resultados', recalculate: 'Recalcular puntos', importCsv: 'Importar CSV',
    },
    countdown: { started: 'Iniciado', days: 'd', hours: 'h', minutes: 'm' },
    chart: { rank: 'Posición', points: 'Puntos' },
  },
  fr: {
    brand: { title: 'Jeu de Pronostics CM 2026', subtitle: 'Jeu de Pronostics' },
    languages: { de: 'Allemand', en: 'Anglais', es: 'Espagnol', fr: 'Français', label: 'Langue' },
    common: {
      save: 'Enregistrer', saving: 'Enregistrement...', cancel: 'Annuler', delete: 'Supprimer', edit: 'Modifier',
      create: 'Créer', loading: 'Chargement...', search: 'Rechercher', yes: 'Oui', no: 'Non', actions: 'Actions',
      back: 'Retour', close: 'Fermer', confirm: 'Confirmer', noTeam: 'Aucune équipe', vs: 'vs',
      points: 'Pts', all: 'Tous', none: 'Aucun', optional: 'optionnel', required: 'Obligatoire',
    },
    nav: {
      navigation: 'Navigation', administration: 'Administration', dashboard: 'Tableau de bord', matches: 'Matchs',
      myPredictions: 'Mes Pronostics', bonus: 'Questions Bonus', aiCoach: 'Coach IA', leaderboard: 'Classement',
      teamRanking: 'Classement par Équipe', statistics: 'Statistiques', notifications: 'Notifications', profile: 'Profil',
      adminDashboard: 'Tableau de bord Admin', aiAssistant: 'Assistant IA', sync: 'Synchronisation', email: 'E-mail',
      users: 'Gestion des Utilisateurs', teams: 'Gestion des Équipes', matchAdmin: 'Gestion des Matchs', results: 'Gestion des Résultats',
      predictions: 'Aperçu des Pronostics', scoringRules: 'Règles de Points', csvImport: 'Import CSV', auditLog: 'Journal d\'Audit',
      systemStatus: 'État du Système', backToApp: 'Retour à l\'App', logout: 'Déconnexion', adminArea: 'Espace Admin',
    },
    auth: {
      welcomeBack: 'Bon retour !', createAccount: 'Créer un compte', email: 'E-mail', password: 'Mot de passe',
      firstName: 'Prénom', lastName: 'Nom', signIn: 'Se connecter', signingIn: 'Connexion...', register: 'S\'inscrire',
      registering: 'Inscription...', noAccount: 'Pas encore de compte ?', hasAccount: 'Déjà inscrit ?',
      registerNow: 'S\'inscrire maintenant', toLogin: 'Aller à la connexion', loginFailed: 'Connexion échouée.',
      registerFailed: 'Inscription échouée.', teamDepartment: 'Équipe / Département',
    },
    profile: {
      title: 'Profil', newPassword: 'Nouveau mot de passe (optionnel)', passwordHint: 'Laisser vide pour conserver l\'actuel',
      saveProfile: 'Enregistrer le profil', updated: 'Profil mis à jour avec succès.', updateFailed: 'Impossible d\'enregistrer le profil.',
    },
    dashboard: {
      welcome: 'Bienvenue, {name} !', nextMatches: 'Prochains matchs', allMatches: 'Tous les matchs', topPlayers: 'Meilleurs joueurs',
      openPredictions: 'Pronostics ouverts', myRank: 'Mon rang', myPoints: 'Mes points', completion: 'Complétion',
      currentRank: 'Rang actuel', totalPoints: 'Points totaux', tipsSubmitted: 'Pronostics soumis', missingTips: 'Pronostics manquants',
      noUpcoming: 'Aucun match à venir.', top5: 'Top 5 classement', fullLeaderboard: 'Classement complet',
    },
    matches: {
      title: 'Matchs', filters: {
        all: 'Tous les matchs', open: 'Pronostics ouverts', finished: 'Terminés', missing: 'Mes pronostics manquants',
        group: 'Phase de groupes', knockout: 'Phase à élimination',
      },
      empty: 'Aucun match trouvé pour ce filtre.', group: 'Groupe', yourTip: 'Votre pronostic',
      noTip: 'Aucun pronostic', noTipGiven: 'Aucun pronostic soumis',
    },
    matchTable: {
      number: '#', date: 'Date', time: 'Heure', stage: 'Phase', group: 'Groupe', home: 'Domicile', away: 'Extérieur',
      result: 'Résultat', status: 'Statut', tip: 'Pronostic', points: 'Points', empty: 'Aucun match trouvé.',
    },
    matchStatus: { scheduled: 'Programmé', locked: 'Verrouillé', finished: 'Terminé', live: 'En cours', halftime: 'Mi-temps', postponed: 'Reporté', cancelled: 'Annulé' },
    predictions: { title: 'Mes Pronostics', save: 'Enregistrer le pronostic', saved: 'Pronostic enregistré.', submit: 'Soumettre le pronostic', myTip: 'Mon pronostic', game: 'Match', empty: 'Aucun pronostic soumis pour le moment.' },
    leaderboard: {
      title: 'Classement', rank: 'Rang', name: 'Nom', team: 'Équipe', matchPts: 'Pts match', bonus: 'Bonus',
      total: 'Total', exact: 'Exact', goalDiff: 'Diff. buts', tendency: 'Tendance', tips: 'Pronostics', completion: 'Compl. %', empty: 'Aucune entrée.',
      exportCsv: 'Export CSV',
      filters: { overall: 'Global', match: 'Points match', bonus: 'Points bonus', group: 'Phase de groupes', knockout: 'Phase à élimination' },
    },
    teamRanking: {
      title: 'Classement par Équipe', team: 'Équipe', members: 'Membres', totalPoints: 'Points totaux', avgPoints: 'Pts moyens',
      exactTips: 'Pronostics exacts', empty: 'Aucune équipe disponible.',
    },
    bonus: { title: 'Questions Bonus', submit: 'Envoyer la réponse', locked: 'Verrouillé', open: 'Ouvert', resolved: 'Résolu', empty: 'Aucune question bonus disponible.' },
    ai: { coachTitle: 'Coach IA', coachSubtitle: 'Votre assistant pronostics personnel', askPlaceholder: 'Poser une question...', send: 'Envoyer', preview: 'Aperçu IA', regenerate: 'Régénérer' },
    notifications: { title: 'Notifications', empty: 'Aucune notification', markAllRead: 'Tout marquer lu', markAllReadLong: 'Tout marquer comme lu' },
    statistics: { title: 'Statistiques', rankTrend: 'Évolution du rang', pointsTrend: 'Évolution des points', pointsOverTime: 'Points dans le temps', rankOverTime: 'Rang dans le temps', accuracyByStage: 'Précision par phase', phase: 'Phase', tips: 'Pronostics', exact: 'Exact', points: 'Points' },
    admin: {
      manualMode: 'Mode CSV manuel', apiMode: 'Mode API actif', syncFixtures: 'Synchroniser le calendrier',
      syncResults: 'Synchroniser les résultats', recalculate: 'Recalculer les points', importCsv: 'Importer CSV',
    },
    countdown: { started: 'Commencé', days: 'j', hours: 'h', minutes: 'm' },
    chart: { rank: 'Rang', points: 'Points' },
  },
};

const dir = path.join(__dirname, '..', 'src', 'locales');
fs.mkdirSync(dir, { recursive: true });
for (const [code, data] of Object.entries(locales)) {
  fs.writeFileSync(path.join(dir, `${code}.json`), JSON.stringify(data, null, 2));
}
console.log('Generated', Object.keys(locales).length, 'locale files');
