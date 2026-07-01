# Architektur – Gerätehaus.app

Landkarte der tatsächlichen Projektarchitektur. Detailtiefe in `.claude/docs/*.md`;
Regeln in `.claude/CLAUDE.md`. Diese Datei beschreibt den Ist-Zustand, keine
offenen Aufgaben.

## Überblick

```
┌───────────────────────────────────────────────────────────────┐
│ Docker Compose:  Postgres  +  Backend (FastAPI)  +  Nginx/SPA  │
└───────────────────────────────────────────────────────────────┘
        Frontend (React/Vite PWA)  ──/api/v1──▶  Backend (FastAPI)
                                                     │
                                     Router → Service → Model/Schema
                                                     │
                                                 PostgreSQL
                                                     ▲
                                     APScheduler-Jobs (Divera, Archiv, …)
```

- **Backend:** Python 3.12, FastAPI (async), SQLAlchemy 2.0 (async, asyncpg),
  Alembic, PostgreSQL. Version aus `backend/pyproject.toml`.
- **Frontend:** React 18 + TypeScript, Vite, React Router; PWA mit Service Worker.
- **Deployment:** Docker Compose (Postgres + Backend + Nginx/Frontend), Standardport
  9112 (`HTTP_PORT`).

## Backend-Schichten

Strikte Trennung (siehe `.claude/docs/backend.md`):

1. **Router** `app/api/v1/` – ~30 Router, alle unter Prefix `/api/v1`, registriert
   in `app/main.py`. Enthalten nur Routing/Auth/Validierung/Service-Aufruf.
2. **Services** `app/services/` – gesamte Businesslogik, DB-Zugriffe, `commit()`,
   Benachrichtigungen, Punkte, Timeline.
3. **Models** `app/models/` – reine SQLAlchemy-ORM-Abbildung, gebündelt in
   `app/models/__init__.py` (für Alembic-Autogenerate).
4. **Schemas** `app/schemas/` – Pydantic v2, getrennt von den ORM-Modellen.
5. **Core** `app/core/` – Querschnitt: `config`, `security`, `security_headers`,
   `rate_limit`, `pin_session`, `logging_setup` (structlog), `sentry_setup`.
6. **Jobs** `app/jobs/scheduler.py` – APScheduler, im FastAPI-Lifespan gestartet.

## Konfigurationssystem

Zwei getrennte Wege:

- `.env` → technische Werte (DB, Secrets, Port), vor dem Start gesetzt.
- `app_config`-Tabelle → alle fachlichen Werte, live über den Moderator-Bereich
  änderbar.

Zugriff ausschließlich über das Singleton `config_service` (`app/services/
config_service.py`): prozessweiter Cache, `invalidate()` nach jedem Schreibzugriff,
`ensure_defaults()` seedet fehlende Keys idempotent per `INSERT ... ON CONFLICT DO
NOTHING`. Alle Defaults + Typen in `app/services/config_defaults.py`.

## Modul-Baukasten

Vier fachliche Module – **Einsatztagebuch**, **Dienstbuch**, **Dienststunden**,
**Fahrzeugbuchung** – folgen demselben Muster:

- Backend: Router + Service + Model + Schema.
- Frontend: Kiosk-Ansicht, Mitglied-Ansicht, Moderator-Ansicht.
- Config je Modul: `modul_<name>_aktiv`, `modul_<name>_startseite`,
  `modul_<name>_aussenzugriff`; im Router mit `require_modul_aktiv(...)` abgesichert.

## Zugriffs-/Berechtigungsebenen

Details in `.claude/docs/permissions.md`:

- **Moderator/Admin** – ein `Moderator`-Datensatz, unterschieden über
  `rolle` (`"admin"` vs. Gruppenführer). JWT-Bearer-Token (`app/core/security.py`).
- **Mitglied (Kiosk)** – `CurrentPerson` über den `geraetehaus_name`-Cookie, kein Login.
- **Kiosk-Gerät** – Autorisierung per Geräte-Token (`kiosk_token`).
- **Öffentlicher Mitglied-Login** – signiertes `pin_session`-Cookie
  (`app/core/pin_session.py`), an Personen-ID gebunden.
- **Token-Flows ohne Login** – Barcode-vergessen-QR, Buchung Annehmen/Ablehnen,
  Profilbild-Upload (kurzlebige Einmal-Tokens).

## Benachrichtigungen

Zentraler Dispatch `notifier_service.benachrichtige()` mit drei config-gesteuerten
Kanälen (`app/services/notifier/`: `email`, `telegram`, `webpush`). Domain-Services
kennen die Kanäle nicht. Details: `.claude/docs/notifications.md`.

## Timeline & Punkte

- `PersonEreignis` / `EinsatzEreignis` – chronologische Ereignisprotokolle als
  Grundlage der Moderator-Timeline.
- `PersonPunkt` – Aktivitätspunkte mit Gültigkeitsdatum und Abbau-Modus; täglicher
  Aufräum-Job. Details: `.claude/docs/timeline.md`.

## Hintergrundjobs

APScheduler mit 9 Jobs (Divera-Polling & -Personal-Sync, Archivierung,
Einsatz-Autoabschluss + geplanter Abschluss, Dienstbuch-Autoschluss, Punkte-Ablauf,
Personen-Inaktivität, Barcode-Erneuerung). Job-Tabelle in `.claude/docs/backend.md`.

## Externe Integrationen

- **Divera 24/7** – Polling (alle 5 Min) oder Webhook, komplett per `app_config`
  konfigurierbar, wirkt ohne Neustart.
- **Sentry** – optionale, per Instanz zustimmungspflichtige Fehlerberichte
  (`fehlerberichte_aktiv`, Default aus).
- **PDF** – WeasyPrint über HTML/CSS-Templates (`app/templates/pdf`).
- **Barcodes** – `python-barcode` (Code128), serverseitig als PNG.

## Frontend

Siehe `.claude/docs/frontend.md`: `src/api/` (typisierter Client + Module),
`src/components/` (u. a. Route-Guards, Gates), `src/context/` (`AuthContext`,
`ConfigContext`), `src/hooks/`, `src/pages/` (nach Domäne gruppiert), `src/utils/`.
Routing in `App.tsx`, API-Client in `src/api/client.ts`.
