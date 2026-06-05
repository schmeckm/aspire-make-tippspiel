# WM 2026 Tippspiel – MVP 2.5

Private Fußball-Tipp-Webanwendung für die FIFA Weltmeisterschaft 2026 mit automatischer API-Synchronisierung, Live-Ergebnissen, Bonusfragen, E-Mail-Erinnerungen, KI-Funktionen und PWA-Unterstützung.

## Neu in MVP 2.5 – KI-Funktionen

- **KI-Spielvorschau** – neutrale Vorschau pro Spiel (Meinung, keine Garantie)
- **Persönlicher KI-Tipp-Coach** – Chat zu fehlenden Tipps, Rang und Strategie
- **KI-Hitlisten-Kommentar** – kurze Zusammenfassung der Rangbewegungen
- **Admin-KI-Assistent** – Diagnose, Empfehlungen und Admin-Texte
- **KI-Bonusfragen-Vorschläge** – Vorschläge für Bonusfragen
- **KI-Reminder-Texte** – E-Mail- und In-App-Texte für Erinnerungen
- **Dashboard-KI-Insights** – personalisierte Hinweiskarten

### Wichtiger Grundsatz

**Die KI ist keine Quelle der Wahrheit.** Sie berechnet keine offiziellen Punkte, erfindet keine Ergebnisse und ändert keine Tipps. Alle offiziellen Berechnungen (Punkte, Hitliste, Sperrung) bleiben im deterministischen Backend.

## Neu in MVP 2.0

- **Automatische Spielplan-Synchronisierung** über konfigurierbare Fußball-APIs
- **Automatische Ergebnis-Synchronisierung** mit Live-Score-Updates via WebSocket
- **Geplante Cron-Jobs** für Sync und Erinnerungen
- **Bonusfragen** mit separater Punktevergabe
- **Erweiterte Hitliste** mit Rangbewegung, Filtern und CSV-Export
- **Benutzer- und Team-Statistiken** mit Chart.js-Diagrammen
- **E-Mail-Erinnerungen** via nodemailer (SMTP)
- **In-App-Benachrichtigungen** mit WebSocket-Push
- **Audit Log** für alle wichtigen Admin-Aktionen
- **Systemstatus-Dashboard** für Admins
- **PWA-Unterstützung** – installierbar auf Mobilgeräten
- **PostgreSQL-Option** für Produktionsumgebungen

## Technologie-Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | Vue 3, Vite, Pinia, Vue Router, Axios, Chart.js, Socket.IO Client, PWA |
| Backend | Node.js, Express.js, Sequelize, Socket.IO, node-cron, nodemailer, OpenAI |
| Datenbank | SQLite (Entwicklung) / PostgreSQL (Produktion) |
| Auth | JWT, bcrypt |

## Schnellstart

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Health: http://localhost:3000/api/health

## Datenbank-Befehle

```bash
cd backend
npm run db:migrate    # Fehlende Spalten/Indizes ergänzen (ohne Datenverlust)
npm run db:reset -- --confirm   # Vollständiger Reset mit Backup (nur Dev)
npm run db:seed-teams           # Standard-Firmen-Teams laden
npm run seed                    # Demo-Daten (nur leere DB)
```

PostgreSQL für Produktion: `DB_DIALECT=postgres` und `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` setzen. Siehe `docker-compose.yml --profile postgres`.

### Standard-Logins

| Rolle | E-Mail | Passwort |
|-------|--------|----------|
| Admin | admin@example.com | admin123 |
| User | max.mueller@example.com | user123 |

## Umgebungsvariablen

### Backend (.env)

```env
PORT=3000
JWT_SECRET=ihr-geheimer-schlüssel
DB_DIALECT=sqlite
DB_PATH=./database/wm2026.sqlite

# Fußball-API (optional – football-data.org v4)
FOOTBALL_API_PROVIDER=football-data
FOOTBALL_API_BASE_URL=https://api.football-data.org/v4
FOOTBALL_API_KEY=
FOOTBALL_API_COMPETITION_CODE=WC
FOOTBALL_API_COMPETITION_NUMERIC_ID=2000
FOOTBALL_API_COMPETITION_ID=WC
FOOTBALL_API_SEASON=2026
FOOTBALL_API_TIMEZONE=Europe/Zurich
FOOTBALL_API_SYNC_ENABLED=false
FOOTBALL_API_RESULT_SYNC_ENABLED=false

# E-Mail (SMTP)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@tippspiel.local
APP_URL=http://localhost:5173

# KI / OpenAI (MVP 2.5)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
AI_FEATURES_ENABLED=true
AI_CACHE_ENABLED=true
AI_MAX_TOKENS=800
AI_TEMPERATURE=0.4
AI_ADMIN_FEATURES_ENABLED=true
AI_USER_COACH_ENABLED=true
AI_MATCH_PREVIEW_ENABLED=true
AI_LEADERBOARD_COMMENTARY_ENABLED=true
```

### Frontend (.env)

```env
VITE_API_URL=/api
VITE_SOCKET_URL=
```

## Fußball-API einrichten (optional)

**Standard-Betriebsmodus:** CSV-Import durch Admin + manuelle Ergebniserfassung. Die App startet **ohne API-Key** und funktioniert vollständig.

**Optional:** Football-API-Synchronisierung kann später per Umgebungsvariablen aktiviert werden. Das Frontend ruft externe APIs **niemals** direkt auf.

Ohne API-Key zeigt der Admin-Bereich:
> *Keine Football API konfiguriert. Die App läuft im manuellen CSV-Modus.*

### Manueller Betrieb (MVP 1.0 / intern)

1. **CSV Import** – offiziellen Spielplan importieren (`/admin/import`)
2. **Ergebnisverwaltung** – Ergebnisse manuell eintragen (`/admin/results`)
3. **Spielverwaltung** – Spiele korrigieren (`/admin/matches`)
4. **Punkte neu berechnen** – auf Admin-Dashboard oder Sync-Seite

Punkte, Hitliste und Teamwertung werden automatisch aktualisiert.

### Unterstützte API-Provider (optional)

| Provider | Wert für `FOOTBALL_API_PROVIDER` | API-Key nötig |
|----------|-----------------------------------|---------------|
| **football-data.org v4** | `football-data` | Ja (**empfohlen**) |
| API-Football / API-Sports | `api-football` | Ja |
| Sportmonks | `sportmonks` | Ja |
| TheStatsAPI | `thestatsapi` | Ja |

### football-data.org v4 (empfohlen)

Authentifizierung nur im Backend via Header `X-Auth-Token`. Das Frontend ruft football-data.org **niemals** direkt auf.

```env
FOOTBALL_API_PROVIDER=football-data
FOOTBALL_API_BASE_URL=https://api.football-data.org/v4
FOOTBALL_API_KEY=ihr-api-key
FOOTBALL_API_COMPETITION_CODE=WC
FOOTBALL_API_COMPETITION_NUMERIC_ID=2000
FOOTBALL_API_COMPETITION_ID=WC
FOOTBALL_API_SEASON=2026
FOOTBALL_API_TIMEZONE=Europe/Zurich
FOOTBALL_API_SYNC_ENABLED=true
FOOTBALL_API_RESULT_SYNC_ENABLED=true
```

Verwendete Endpunkte (WM 2026):
- `GET /competitions/WC/matches?season=2026` – Spielplan (primär)
- `GET /competitions/2000/matches?season=2026` – Fallback wenn `WC` fehlschlägt
- `GET /competitions/WC/matches?season=2026&status=FINISHED` – Ergebnisse
- `GET /matches?competitions=WC&status=LIVE` – Live-Spiele (Fallback: `competitions=2000`)

Rate-Limits werden aus Response-Headern gelesen und in `SyncLog.rateLimitJson` gespeichert. Bei niedrigem Kontingent pausiert der Sync automatisch.

Ohne API-Key (Sync-Versuch): *Football-data.org API-Key ist nicht konfiguriert.*

### API-Football

```env
FOOTBALL_API_PROVIDER=api-football
FOOTBALL_API_BASE_URL=https://v3.football.api-sports.io
FOOTBALL_API_KEY=ihr-api-key
FOOTBALL_API_COMPETITION_ID=1
FOOTBALL_API_SEASON=2026
FOOTBALL_API_TIMEZONE=Europe/Zurich
FOOTBALL_API_SYNC_ENABLED=true
FOOTBALL_API_RESULT_SYNC_ENABLED=true
```

### Sportmonks

```env
FOOTBALL_API_PROVIDER=sportmonks
FOOTBALL_API_BASE_URL=https://api.sportmonks.com/v3/football
FOOTBALL_API_KEY=ihr-api-token
FOOTBALL_API_COMPETITION_ID=LEAGUE_OR_SEASON_ID
FOOTBALL_API_SEASON=2026
```

### TheStatsAPI

```env
FOOTBALL_API_PROVIDER=thestatsapi
FOOTBALL_API_BASE_URL=https://api.thestatsapi.com/api
FOOTBALL_API_KEY=ihr-bearer-token
FOOTBALL_API_COMPETITION_ID=comp_3039
FOOTBALL_API_SEASON=2026
```

**Ohne API-Key:** App läuft im manuellen CSV-Modus. Automatische Sync-Jobs werden übersprungen.

Zum Aktivieren der API-Synchronisierung:

```env
FOOTBALL_API_KEY=ihr-api-key
FOOTBALL_API_COMPETITION_ID=WC
FOOTBALL_API_SYNC_ENABLED=true
FOOTBALL_API_RESULT_SYNC_ENABLED=true
```

### Admin-Sync-Funktionen (nur mit API-Key)

Im Admin-Bereich unter **Synchronisierung**:

- Football-API-Provider auswählen und speichern
- API-Verbindung testen
- Spielplan, Ergebnisse und Live-Scores manuell synchronisieren
- Sync-Logs und Fehler einsehen
- Punkte nach Ergebnis-Sync neu berechnen

### Überschreib-Regeln

- `isManuallyLocked = true` → API-Sync überschreibt keine admin-korrigierten Werte
- `isApiManaged = false` → Spiel wird beim Sync übersprungen (z. B. CSV-Notfallimport)
- Beendete Spiele mit bestätigtem Ergebnis werden nicht erneut überschrieben
- Alle Sync-Vorgänge werden in `SyncLog` protokolliert

Die Provider-Abstraktion (`footballProviderService` + Provider-Module) bleibt für spätere API-Integration erhalten.

## KI-Funktionen einrichten (MVP 2.5)

### OpenAI API Key konfigurieren

1. API-Key unter [platform.openai.com](https://platform.openai.com) erstellen
2. In `backend/.env` eintragen:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
AI_FEATURES_ENABLED=true
```

3. Backend neu starten

**Ohne API-Key** laufen alle Kernfunktionen weiter. KI-Endpunkte liefern dann eine klare Fehlermeldung (`OPENAI_API_KEY ist nicht konfiguriert.`).

### KI komplett deaktivieren

```env
AI_FEATURES_ENABLED=false
```

Einzelne Features können separat deaktiviert werden:

```env
AI_USER_COACH_ENABLED=false
AI_MATCH_PREVIEW_ENABLED=false
AI_LEADERBOARD_COMMENTARY_ENABLED=false
AI_ADMIN_FEATURES_ENABLED=false
```

### Kostenkontrolle

| Maßnahme | Beschreibung |
|----------|--------------|
| Caching | Spielvorschauen und Hitlisten-Kommentare werden in `AICommentary` gespeichert |
| Token-Limit | `AI_MAX_TOKENS=800` (Standard) |
| Rate-Limits | Coach: 20/Tag, Admin-Assistent: 50/Tag, Bonus-Vorschläge: 20/Tag |
| Modellwahl | `gpt-4o-mini` als kostengünstiger Standard |
| Kurzer Kontext | Nur relevante JSON-Daten, keine vollständigen DB-Dumps |

Token-Nutzung wird in `AICommentary` und `AIInteractionLog` protokolliert.

### Datenschutz

- Der OpenAI-API-Key bleibt ausschließlich im Backend
- Private Tipps anderer Nutzer werden vor Anpfiff nicht an die KI übergeben
- KI-Antworten werden auf Secrets gefiltert (Guardrails)
- Interaktionen können im Admin-Bereich eingesehen werden (`/api/admin/ai/interaction-log`)

### Limitierungen

- KI liefert **Meinungen und Erklärungen**, keine garantierten Vorhersagen
- KI **berechnet keine Punkte** und **ändert keine Daten**
- Bei API-Ausfall: *„Die KI-Antwort konnte gerade nicht erstellt werden. Bitte später erneut versuchen.“*
- Bei deaktivierten Features: *„KI-Funktionen sind aktuell deaktiviert.“*

### Manuelle Admin-Overrides

- Spiele mit `isManuallyLocked = true` werden **nicht** von der API überschrieben
- Spiele mit `isApiManaged = false` werden beim Sync übersprungen
- Manuell eingegebene Ergebnisse haben immer Vorrang

## Cron-Jobs

| Job | Zeitplan | Beschreibung |
|-----|----------|--------------|
| Spielplan-Sync | Täglich 06:00 | Fixe Spielpläne aktualisieren |
| Spielplan-Sync (Turnier) | Alle 6 Stunden | Während WM-Zeitraum |
| Ergebnis-Sync | Alle 15 Minuten | Während WM-Zeitraum |
| Live-Sync | Alle 5 Minuten | Nur bei laufenden Spielen (rate-limit-freundlich) |
| E-Mail-Erinnerungen | Täglich 09:00 | Fehlende Tipps & Bonusfragen |
| Hitliste-Snapshot | Stündlich | Rangverlauf speichern |

## E-Mail einrichten

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=benutzer@example.com
SMTP_PASSWORD=geheim
SMTP_FROM=WM2026 <noreply@example.com>
```

Ohne SMTP-Konfiguration werden E-Mails im **Mock-Modus** geloggt (Konsole).

Admin-Bereich → **E-Mail Erinnerungen**:
- Erinnerungen aktivieren/deaktivieren
- Test-E-Mail senden
- Erinnerungen manuell auslösen

## Bonusfragen

Admin erstellt Bonusfragen mit Punkten und Sperrzeit. Benutzer antworten vor Ablauf der Frist. Nach Auflösung durch Admin werden Bonuspunkte automatisch berechnet.

Bonuspunkte fließen in die Gesamthitliste ein (Spielpunkte + Bonuspunkte).

## Live-Scores (WebSocket)

Das Frontend verbindet sich automatisch via Socket.IO. Bei Ergebnis-Updates werden folgende Seiten live aktualisiert:

- Spiele
- Hitliste
- Benachrichtigungen

Live-Status-Badges: Geplant, Läuft, Halbzeit, Beendet, Verschoben, Abgesagt

## PWA / Mobile

Die App ist als Progressive Web App installierbar:

1. Im Browser öffnen (Chrome/Edge/Safari)
2. „Zum Startbildschirm hinzufügen" wählen
3. App erscheint wie native App

Features: Offline-Fallback für statische Assets, Mobile-optimierte Match-Cards, Countdown-Badges.

## Docker

Ausführliche Anleitung für **GitHub + Portainer + PostgreSQL**: [docs/DEPLOY-GITHUB-PORTAINER.md](docs/DEPLOY-GITHUB-PORTAINER.md)

### SQLite (Standard)

```bash
docker compose up --build
docker compose exec backend node database/seed.js
```

- Frontend: http://localhost:8080
- Backend: http://localhost:3000

### PostgreSQL (Produktion)

```bash
docker compose --profile postgres up --build
docker compose exec backend-postgres node database/seed.js
```

## API-Endpunkte (MVP 2.5)

```
# KI (Nutzer)
GET  /api/ai/status
POST /api/ai/match-preview/:matchId
POST /api/ai/user-coach
GET  /api/ai/leaderboard-summary
GET  /api/ai/dashboard-insights

# KI (Admin)
POST /api/admin/ai/assistant
POST /api/admin/ai/leaderboard-summary/regenerate
POST /api/admin/ai/bonus-question-suggestions
POST /api/admin/ai/reminder-text
GET  /api/admin/ai/commentaries
GET  /api/admin/ai/interaction-log
```

## API-Endpunkte (MVP 2.0)

```
# Sync
GET  /api/admin/sync/status
GET  /api/admin/sync/providers
GET  /api/admin/sync/logs
GET  /api/admin/sync/errors
PUT  /api/admin/sync/provider
POST /api/admin/sync/test-connection
POST /api/admin/sync/fixtures
POST /api/admin/sync/results
POST /api/admin/sync/live-scores
POST /api/admin/sync/recalculate-points

# Bonus
GET  /api/bonus-questions
POST /api/bonus-questions/predictions
PUT  /api/bonus-questions/predictions/:id
GET  /api/admin/bonus-questions
POST /api/admin/bonus-questions
POST /api/admin/bonus-questions/:id/resolve

# Statistiken
GET  /api/statistics/me
GET  /api/statistics/users/:id
GET  /api/statistics/team/:id
GET  /api/statistics/admin/overview

# Benachrichtigungen
GET  /api/notifications
POST /api/notifications/:id/read
POST /api/notifications/read-all
POST /api/admin/notifications/send

# Audit & System
GET  /api/admin/audit-log
GET  /api/admin/system
GET  /api/settings
PUT  /api/admin/settings

# E-Mail
GET  /api/admin/email/status
POST /api/admin/email/send-test
POST /api/admin/email/send-reminders

# Hitliste Export
GET  /api/leaderboard/export?filter=overall
```

Alle MVP 1.0 Endpunkte bleiben erhalten.

## Fehlerbehebung

| Problem | Lösung |
|---------|--------|
| API-Sync schlägt fehl | `FOOTBALL_API_KEY` und Provider in `.env` prüfen, Verbindung im Admin testen |
| Keine E-Mails | SMTP in `.env` konfigurieren oder Mock-Modus in Konsole prüfen |
| WebSocket verbindet nicht | Backend neu starten, Proxy in `vite.config.js` prüfen |
| DB-Schema veraltet | `DB_SYNC_ALTER=true npm start` oder `npm run seed` |
| Port 3000 belegt | `PORT=3001` in `.env` setzen |
| KI antwortet nicht | `OPENAI_API_KEY` in `.env` prüfen, `AI_FEATURES_ENABLED=true` |
| KI-Tageslimit erreicht | Am nächsten Tag erneut versuchen oder Rate-Limits in `aiRateLimiter.js` anpassen |

## MVP 1.0 Funktionen (weiterhin verfügbar)

- Manuelle Spielverwaltung und CSV-Import
- Manuelle Ergebniserfassung
- Tippabgabe vor Anpfiff
- Automatische Punkteberechnung
- Hitliste und Teamwertung
- Vollständiger Admin-Bereich

## Lizenz

Internes Projekt – nur für private/interne Nutzung.
