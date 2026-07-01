# Backend

FastAPI (async) + SQLAlchemy 2.0 + Alembic + PostgreSQL, Python 3.12. Einstieg:
`app/main.py`. Übergeordnet: `.claude/architecture.md`.

## Verzeichnisstruktur (`backend/app/`)

| Ordner | Inhalt |
| --- | --- |
| `api/v1/` | Router (Endpunkte), alle unter Prefix `/api/v1` |
| `api/deps.py` | Auth-/DB-Dependencies (`DbSession`, `CurrentModerator`, `CurrentAdmin`, `CurrentPerson`, `require_modul_aktiv`) |
| `services/` | Businesslogik, ein Service je Domäne + Querschnittsservices |
| `services/notifier/` | Kanal-Adapter `email`, `telegram`, `webpush`, `base` |
| `models/` | SQLAlchemy-ORM, gebündelt in `models/__init__.py` |
| `schemas/` | Pydantic-v2-Schemas |
| `core/` | `config`, `security`, `security_headers`, `rate_limit`, `pin_session`, `logging_setup`, `sentry_setup` |
| `jobs/scheduler.py` | APScheduler-Jobs |
| `templates/email`, `templates/pdf` | Jinja2- bzw. WeasyPrint-Vorlagen |

## Schichtenregeln

- **Router**: nur Routing, Auth/Berechtigungen, Requestvalidierung, Service-Aufruf,
  Response. Keine Businesslogik. Registrierung in `app/main.py`.
- **Service**: gesamte Businesslogik, DB-Lesen/-Schreiben, `commit()`,
  `notifier_service.benachrichtige(...)`, Punktevergabe, Timeline-Einträge.
- **Model**: reine Datenabbildung, keine Seiteneffekte.
- **Schema**: getrennt vom ORM. Personen immer über
  `stammdaten_service.personen_zu_out()` / `person_zu_out()` serialisieren
  (berechnete Felder wie Gesamtpunkte).

## Konfigurationssystem

`app/services/config_service.py` – Singleton `config_service`:

- `get(db, schluessel, default)` / `get_all(db)` – prozessweit gecacht.
- `set(db, key, wert)` / `set_many(db, dict)` – `INSERT ... ON CONFLICT DO UPDATE`,
  danach automatisch `invalidate()`.
- `ensure_defaults(db)` – seedet fehlende Keys idempotent (`ON CONFLICT DO NOTHING`),
  wird im Lifespan aufgerufen, damit neue Keys über Updates hinweg entstehen.
- Typen/Defaults zentral in `app/services/config_defaults.py` (`ConfigTyp`:
  STR/INT/FLOAT/BOOL/JSON). Fachwerte nie aus `.env` lesen.

## Hintergrundjobs (`app/jobs/scheduler.py`)

Im FastAPI-Lifespan gestartet/gestoppt. Cron-Jobs, deren fachliche Uhrzeit aus
`app_config` kommt, sind stündlich registriert und prüfen die konfigurierte Stunde
im Job selbst – so wirken Änderungen ohne Neustart.

| Job-ID | Trigger | Steuernde Config |
| --- | --- | --- |
| `divera_polling` | alle 300 s | `divera_modus == "polling"` |
| `divera_personal_sync` | täglich (Uhrzeit je Prozessstart zufällig 02–05 Uhr) | `divera_aktiv` |
| `archivierung` | täglich 03:00 | `archivierungszeitraum_jahre` |
| `einsatz_autoabschluss` | stündlich, aktiv nur zur Stunde | `einsatz_autoabschluss_stunde`, `einsatz_autoabschluss_inaktivitaet_stunden` |
| `einsatz_geplanter_abschluss` | minütlich | geplanter Abschlusszeitpunkt (aus „Alle eingetragen") |
| `dienstbuch_autoschluss` | stündlich, aktiv nur zur Stunde | `dienstbuch_autoschluss_stunde` |
| `punkte_ablauf` | täglich 00:00 | – (entfernt abgelaufene `person_punkte`) |
| `personen_inaktivitaet` | täglich 00:00 | `personen_inaktivitaet_tage` |
| `barcode_erneuerung` | täglich 03:30 | `barcode_gueltigkeit_tage` + Personen-Mail-Flags |

## Querschnitt (`app/core/`)

- `security.py` – JWT-Erzeugung/-Prüfung (`create_access_token`,
  `decode_access_token`), Passwort-Hashing (bcrypt). Ablauf `jwt_expire_minutes`
  (Default 480 = 8 h).
- `security_headers.py` – `SecurityHeadersMiddleware`.
- `rate_limit.py` – Rate-Limiting (Login, Barcode-Scan u. a.).
- `pin_session.py` – signiertes Cookie für den öffentlichen Mitglied-Login.
- `logging_setup.py` – structlog über stdlib-logging.
- `sentry_setup.py` – Init nur wenn `fehlerberichte_aktiv`; DSN aus Konstante,
  per `.env` überschreibbar.

## Konventionen

- Async durchgängig (`AsyncSession`, `await`), Sessions via `AsyncSessionLocal` /
  `get_db`.
- Deutschsprachige Bezeichner (Funktionen, Variablen, Config-Keys).
- Neue Endpunkte an bestehenden Routern orientieren (Response-Format,
  Fehlerbehandlung über `HTTPException`).
- Tests: siehe `.claude/skills/tests/SKILL.md`.
