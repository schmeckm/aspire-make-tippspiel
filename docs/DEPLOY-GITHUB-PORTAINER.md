# Deployment: GitHub + Docker + Portainer (mit PostgreSQL)

Diese Anleitung beschreibt den Weg von der lokalen Entwicklung bis zum produktiven Stack in Portainer.

## Voraussetzungen

- GitHub-Konto
- Server mit Docker und [Portainer](https://www.portainer.io/)
- Optional: Domain + Reverse Proxy (Traefik/Nginx Proxy Manager) für HTTPS

---

## Schritt 1: Projekt auf GitHub bringen

### 1.1 Secrets prüfen (wichtig)

Folgende Dateien **dürfen nicht** ins Repository:

- `backend/.env`
- `.env` im Projektroot
- `*.sqlite` Datenbankdateien

Das ist bereits in `.gitignore` eingetragen.

### 1.2 Git initialisieren und pushen

Im Projektordner (PowerShell):

```powershell
cd c:\Users\marku\OneDrive\Dokumente\node_project\ai-football-agent

git init
git add .
git commit -m "Initial commit: WM 2026 Tippspiel"
```

Auf GitHub ein **neues leeres Repository** anlegen (z. B. `ai-football-agent`), dann:

```powershell
git branch -M main
git remote add origin https://github.com/IHR-USER/ai-football-agent.git
git push -u origin main
```

> Ersetzen Sie `IHR-USER/ai-football-agent` durch Ihr echtes Repository.

---

## Schritt 2: Umgebungsvariablen vorbereiten

Kopie der Vorlage:

```powershell
copy .env.docker.example .env
```

Für **Produktion mit PostgreSQL** mindestens setzen:

| Variable | Beispiel | Beschreibung |
|----------|----------|--------------|
| `JWT_SECRET` | langer Zufallsstring | Pflicht, kein Default-Wert |
| `DB_PASSWORD` | sicheres Passwort | PostgreSQL-Passwort |
| `DB_USER` | `wm2026` | DB-Benutzer |
| `DB_NAME` | `wm2026` | Datenbankname |
| `APP_URL` | `https://tippspiel.example.com` | Öffentliche URL (E-Mails, Links) |
| `CORS_ORIGIN` | gleich wie `APP_URL` | CORS für API/WebSocket |
| `FOOTBALL_API_KEY` | Ihr API-Key | Optional, für Live-Sync |
| `OPENAI_API_KEY` | Ihr Key | Optional, für KI-Features |
| `SMTP_*` | Mailserver | Für Registrierung / Passwort-Reset |

`FRONTEND_PORT` steuert den externen Port (Standard `8080`).

---

## Schritt 3: Stack in Portainer deployen

### Variante A: Git Repository (empfohlen)

1. Portainer → **Stacks** → **Add stack**
2. Name: z. B. `wm2026-tippspiel`
3. **Build method**: Git repository
4. Repository URL: `https://github.com/IHR-USER/ai-football-agent`
5. Repository reference: `main`
6. **Compose path**: `docker-compose.prod.yml`
7. **Environment variables**: Werte aus `.env` eintragen (oder „Load variables from .env file“)
8. **Deploy the stack**

Portainer klont das Repo, baut die Images und startet:

- `postgres` – PostgreSQL 16 (Daten in Volume `postgres-data`)
- `backend` – Node.js API
- `frontend` – Nginx mit Vue-Build (Port `8080` → App)

### Variante B: Manuell auf dem Server

```bash
git clone https://github.com/IHR-USER/ai-football-agent.git
cd ai-football-agent
cp .env.docker.example .env
# .env bearbeiten
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Schritt 4: Datenbank initialisieren (einmalig)

Nach dem ersten Start Tabellen anlegen und Demo-/Startdaten laden:

```bash
docker compose -f docker-compose.prod.yml exec backend node database/seed.js
```

In Portainer: Container `backend` → **Console** → Command:

```
node database/seed.js
```

Standard-Admin (falls im Seed enthalten): siehe `backend/database/demoData.js`.

---

## Schritt 5: HTTPS / Reverse Proxy (empfohlen)

Die App lauscht intern auf Port `8080`. Vor Portainer typisch:

- **Nginx Proxy Manager** oder **Traefik** als Reverse Proxy
- Domain → `http://server-ip:8080`
- Let's Encrypt Zertifikat aktivieren
- `APP_URL` und `CORS_ORIGIN` auf `https://…` setzen und Stack neu deployen

---

## Updates deployen

Bei Git-basiertem Stack in Portainer:

1. Änderungen pushen: `git push`
2. Portainer → Stack → **Pull and redeploy** (oder Webhook)

Manuell:

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Volumes & Backups

| Volume | Inhalt |
|--------|--------|
| `postgres-data` | PostgreSQL-Daten |
| `backend-uploads` | Profilbilder, Uploads |
| `backend-backups` | PG-Backups (Scheduler) |

PostgreSQL-Backup manuell:

```bash
docker compose -f docker-compose.prod.yml exec backend node database/postgres-backup-cli.js
```

---

## Lokaler Test vor dem Deploy

```powershell
docker compose -f docker-compose.prod.yml up --build
docker compose -f docker-compose.prod.yml exec backend node database/seed.js
```

App: http://localhost:8080

---

## Troubleshooting

| Problem | Lösung |
|---------|--------|
| Stack startet nicht | `JWT_SECRET` und `DB_PASSWORD` gesetzt? |
| 502 / API Fehler | Backend-Logs in Portainer prüfen |
| WebSocket / Live-Scores | Nginx leitet `/socket.io/` weiter (siehe `frontend/nginx.conf`) |
| E-Mail-Links falsch | `APP_URL` muss öffentliche HTTPS-URL sein |
| CORS-Fehler | `CORS_ORIGIN` = exakte Frontend-URL |

---

## Dateien im Überblick

| Datei | Zweck |
|-------|--------|
| `docker-compose.prod.yml` | Produktion: Postgres + Backend + Frontend |
| `docker-compose.yml` | Lokal: SQLite oder Postgres-Profil |
| `.env.docker.example` | Vorlage für Umgebungsvariablen |
| `backend/Dockerfile` | Backend-Image |
| `frontend/Dockerfile` | Frontend-Build + Nginx |
