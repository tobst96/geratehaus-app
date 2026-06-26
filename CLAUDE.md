# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Gerätehaus.app: a self-hosted PWA for fire departments (and similar organizations) to manage
Einsätze (callouts), Dienstbücher (duty logs), Dienststunden (duty hours), and Fahrzeugbuchungen
(vehicle bookings). It's designed to run as a **Kiosk** on a tablet in the Gerätehaus: members
scan their personal Code128 barcode to identify themselves and self-serve, no typing/login
required. A separate Moderator area (now with an Admin/Gruppenführer role split) handles
administration, and a public Mitglieder-Login lets members use enabled modules from their own
phone outside the Gerätehaus.

**Core open-source principle:** nothing organization-specific is hardcoded. Org name, logo,
colors, modules, vehicles, seats, functions, custom fields — all configured via the first-run
Setup Wizard and editable afterwards in the Moderator area, stored in the `app_config` table.

## Commands

### Backend (from `backend/`)

```bash
python3.12 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head              # apply migrations (run after pulling new migration files)
alembic revision -m "description" # create a new empty migration; fill in upgrade()/downgrade()
uvicorn app.main:app --reload     # dev server on :8000 (API docs at /api/v1/docs)
ruff check .                      # lint
pytest                            # no test suite currently exists in this repo
```

### Frontend (from `frontend/`)

```bash
npm install
npm run dev        # Vite dev server on :5173, proxies /api and /uploads to :8000 (see vite.config.ts)
npm run build       # tsc --noEmit followed by vite build — this is the authoritative type-check step
```

There is no lint script and no test runner configured in `frontend/package.json`. Always run
`npm run build` (or at minimum `npx tsc --noEmit`) after frontend changes — it's the only
automated correctness check available.

### Docker (full stack)

```bash
cp .env.example .env   # then fill in JWT_SECRET_KEY / COOKIE_SECRET_KEY / POSTGRES_PASSWORD
docker compose up -d --build
docker compose exec backend alembic current   # verify migrations applied (entrypoint runs them automatically)
```

App serves on `http://localhost:${HTTP_PORT:-9112}`. The `frontend` container is Nginx serving
the built SPA and reverse-proxying `/api/` and `/uploads/` to the `backend` container
(`frontend/nginx.conf`) — this is why FastAPI's docs are mounted at `/api/v1/docs` instead of
`/docs`: the SPA fallback route would otherwise swallow `/docs` before Nginx's `/api/` rule fires.

## Architecture

### Two configuration paths — don't blur them

- `.env` / `app/core/config.py` (`Settings`): infrastructure only — DB credentials, JWT/cookie
  secrets, HTTP port. Set once before first start.
- `app_config` table via `ConfigService` (`app/services/config_service.py`): every
  business-level setting (org name, colors, module on/off, per-module "Außenzugriff", Divera
  credentials, notification templates, barcode validity days, etc.). Cached per-process,
  invalidated on every write. **Never** read business config from `.env` or hardcode it — always
  go through `config_service.get(db, key, default)`. New keys need an entry in
  `app/services/config_defaults.py` (`DEFAULTS`) so `ensure_defaults()` seeds them on startup.

### Rate limiting on public/unauthenticated endpoints

`app/core/rate_limit.py` provides `rate_limit(max_aufrufe, fenster_sekunden)`, a per-IP,
per-path, in-memory sliding-window dependency (no Redis — fine for this single-process
deployment, resets on restart). Applied via `dependencies=[Depends(rate_limit(...))]` on every
endpoint that's reachable without auth and gates on a secret/token/password (moderator login,
barcode resolve/preview, all five reservation `.../vorschau` /`.../anmelden`/`.../einloesen`
endpoints, kiosk token validation). **Any new unauthenticated endpoint that checks a token, PIN,
or password must get this too** — that's the actual brute-force defense for those flows, since
reservation tokens/PINs have no per-token attempt lockout of their own.

### Auth/identity: three distinct, non-overlapping mechanisms

1. **Moderator JWT** (`app/core/security.py`, `CurrentModerator`/`CurrentAdmin` in
   `app/api/deps.py`) — username/password login for the Moderator area. The JWT carries a
   `rolle` claim (`admin` or `gruppenführer`, stored on the `moderatoren` table). `CurrentAdmin`
   is a stricter dependency requiring `rolle == "admin"`; Personal, Einstellungen, Punkte,
   Barcodes, Kiosk-Geräte are admin-only, Gruppenführer get Dashboard/Listen/Buchungen. The
   frontend mirrors this by decoding (not verifying — the backend re-checks every request) the
   `rolle` claim client-side in `AuthContext.tsx` to drive navigation, and gates Admin-only
   routes via `<AdminRoute>`.
2. **Person identity via cookie** (`geraetehaus_name`, 5-year cookie, `CurrentPerson` dependency)
   — no login at all. Whichever name is in the cookie is looked up/auto-created as a `Person`.
   Used by the Kiosk and the public Mitglied-Login flows for self-service actions.
3. **Barcode scan** (`POST /auth/barcode`) — resolves a `BarcodeToken` to a `Person` and sets the
   `geraetehaus_name` cookie. This is the actual day-to-day "login" members use; it's a one-way
   resolve, not a session token.

### The "Barcode vergessen" reservation pattern (repeats 5x — know it once, recognize it everywhere)

Used identically for Einsatz-Teilnahme, Dienstbuch, Dienststunden, Fahrzeugbuchung, and the
Mitglieder-Login itself. Each has its own `*_reservierung` model/service/router pair
(`dienstbuch_reservierung_service.py` is a representative example), but the shape is always:

1. Kiosk device (no login) calls `POST .../reservierung` → creates a short-lived
   (~30 min), single-use token row, returns it.
2. Frontend renders that token as a QR code pointing at a mobile-facing page
   (`oeffentlicheBasisUrl(config) + "/...:token"`).
3. The member scans it with their own phone, picks themselves from the person list, optionally
   confirms a PIN, and either previews (`reservierung_vorschau_setzen`) or completes
   (`reservierung_einloesen`) the action server-side.
4. The original kiosk screen polls/closes once `eingeloest` flips to `true`.

**Known bug class to watch for:** any endpoint listing `Person` objects for these reservation
flows (the "pick yourself" screen) must convert through
`stammdaten_service.personen_zu_out()` to produce `PersonOut`, never return raw ORM `Person`
instances — returning them directly trips `ResponseValidationError` because the response model
expects the computed/output shape (e.g. `gesamtpunkte`), not the ORM model.

### Notifications are dispatched centrally, recipients are per-Person

`app/services/notifier_service.py` is the single call site domain services use
(`benachrichtige(db, ereignis_schluessel, **platzhalter)`); it fans out to whichever channels are
enabled (Telegram/E-Mail/WebPush) per `app_config`. As of the per-person notification rework,
**`EmailNotifier.send()` no longer uses a central recipient list** — it queries
`Person.benachrichtigungen_aktiv == True AND Person.email IS NOT NULL` and sends to those
addresses. The central `notifier_email_recipients` config value still exists but is now used
*only* by `test_versenden()` (the "send test mail" button in the Moderator area) to verify SMTP
config without touching real members. Per-person opt-in defaults to `False` and is set per
Person in the Personal page.

### Modules are independently toggleable on three axes

Per module (`einsatztagebuch`, `dienstbuch`, `dienststunden`, `fahrzeugbuchung`), `app_config`
holds three independent booleans: `modul_<name>_aktiv` (does it exist at all — gated server-side
via `require_modul_aktiv()` dependency factory in `deps.py`), `modul_<name>_startseite` (shown as
a tile on the Kiosk home screen, `KioskHome.tsx`), and `modul_<name>_aussenzugriff` (usable via
the public Mitglieder-Login outside the Gerätehaus, `MitgliedHub.tsx`). Kiosk and Mitglied home
screens share the same tile look (`pages/kachelIcons.tsx` holds the shared SVG icon set) but
filter on different flag pairs — don't conflate "visible on kiosk" with "visible to members
remotely".

### Frontend structure

- `pages/moderator/*` — Moderator area (role-gated as above), one file per major section
  (Dashboard, Listen, Personal, Stammdaten, Einstellungen, NotifierEinstellungen, Buchungsmanagement,
  BarcodeGenerator, KioskGeraete).
- `pages/<modul>/*` — the actual member-facing module screens (`einsatztagebuch/`, `dienstbuch/`,
  `dienststunden/`, `fahrzeugbuchung/`), reused identically whether reached via Kiosk or Mitglied-Login.
- `pages/mitglied/*` — public member-facing login/hub/reservation-resolution pages.
- `context/ConfigContext.tsx` / `AuthContext.tsx` — global app config (from `app_config` via API)
  and the three auth mechanisms described above, respectively.
- Barcode text inputs across the app (`Dienststunden.tsx`, `DienstbuchDiagramm.tsx`,
  `EinsatzDiagramm.tsx`, `Fahrzeugbuchung.tsx`, `MitgliedLogin.tsx`) all follow the same
  `value`/`onChange` shape feeding `barcodeEinscannen()` — when adding camera-scan support or
  similar cross-cutting input behavior, change it once per call site rather than introducing a
  divergent pattern.

### Backend structure

- `app/api/v1/*` — one router module per resource, all mounted under `/api/v1` in `main.py`.
  Naming convention: `moderator_*.py` routers are behind moderator/admin auth; bare resource
  names (`einsaetze.py`, `dienstbuecher.py`, etc.) are the member-facing endpoints gated by
  `CurrentPerson` and/or `require_modul_aktiv`.
- `app/services/*` — business logic; routers stay thin and delegate here. Service functions
  generally take `db: AsyncSession` first and do their own `commit()` (see
  `person_aktualisieren()` for the pattern of diffing changes and writing a
  `PersonEreignis` timeline entry per call).
- `app/models/*` — SQLAlchemy 2.0 declarative models using `Mapped[...]` typed columns.
- `app/schemas/*` — Pydantic v2 request/response models, separate from ORM models; `*Out` models
  always need explicit construction in the service layer (see the `personen_zu_out` bug class
  above) rather than relying on `from_attributes` against arbitrary ORM objects unless the ORM
  attributes line up exactly.
- `alembic/versions/*` — migrations are sequentially numbered (`0030_...`), always chain
  `down_revision` to the prior file; check the latest existing file before creating a new one.
- `app/jobs/scheduler.py` — APScheduler background jobs (Divera polling, nightly archival, point
  expiry, etc.), registered in `registriere_jobs()`.

## Notes for making changes

- This repo has no automated test suite. Verification is: `npx tsc --noEmit` (frontend) /
  `python -c "from app.api.v1 import <module>"` smoke import (backend) /
  `alembic upgrade head` against a real Postgres, plus manual exercise of the affected UI.
- The user's standing deployment workflow for this project (when asked to ship changes) is:
  commit → push to `origin/main` → SSH to the production host → `git pull` →
  `docker compose up -d --build` → verify `docker compose exec backend alembic current` shows
  `head`. There is exactly one production environment, no staging.
- **Exception:** a brand-new module (a self-contained new feature area, not a tweak to an
  existing one) must be developed on a feature branch and shipped via PR (`gh pr create`, or by
  pointing the user at the GitHub compare link if `gh` isn't installed) — not pushed straight to
  `main`. Only deploy to the server after that PR is merged. Small fixes/extensions to existing
  modules still go straight to `main` per the workflow above.
- German is the UI/domain language throughout — identifiers, model fields, commit messages, and
  user-facing strings are German (`Einsatz`, `Dienstbuch`, `Gruppe`, `Funktion`, etc.). Keep new
  code consistent with this rather than introducing English domain terms.
