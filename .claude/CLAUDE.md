# CLAUDE.md – Projektregeln für Gerätehaus.app

Globale, dauerhaft gültige Regeln für die Arbeit an diesem Projekt. Details zur
Architektur stehen in `.claude/architecture.md` und `.claude/docs/*.md`. Nur
allgemeingültige Regeln gehören hierher, keine temporären Aufgaben (die stehen im
Backlog `.claude/docs/backlog.md`).

## Was das Projekt ist

Selbst hostbare, mobile-first PWA für Feuerwehren zur Verwaltung von Einsätzen,
Diensten, Dienststunden und Fahrzeugbuchungen. Läuft als **Kiosk** auf einem
Tablet im Gerätehaus (Barcode-Scan statt Login) und bietet zusätzlich einen
öffentlichen **Mitglieder-Login** für freigeschaltete Module.

Stack: FastAPI (async) + SQLAlchemy 2.0 + Alembic + PostgreSQL im Backend,
React 18 + TypeScript + Vite im Frontend, Docker Compose fürs Deployment.

## Oberste Regel: keine organisationsspezifischen Werte im Code

Kein feuerwehr-spezifischer Wert (Name, Logo, Farben, Fahrzeuge, Sitzplätze,
Funktionen, Zusatzfelder, Schwellenwerte, Adressen) darf hart im Code stehen.
Alles Fachliche wird über den Setup-Wizard bzw. den Moderator-Bereich gepflegt
und landet in der Tabelle `app_config`.

- Fachliche Werte **immer** über `config_service` lesen, **nie** aus `.env` und
  **nie** als Konstante im Code.
- Neue Config-Keys **immer** in `app/services/config_defaults.py` registrieren
  (mit neutralem, nicht-org-spezifischem Default).
- `.env` enthält ausschließlich technische/infrastrukturelle Werte (DB-Zugang,
  Secrets, Port).

## Architektur-Schichten (Backend)

Strikte Trennung – siehe `.claude/docs/backend.md`:

- **Router** (`app/api/v1/`): nur Routing, Auth, Berechtigungen, Requestvalidierung,
  Service-Aufruf, Response. **Keine** Businesslogik.
- **Services** (`app/services/`): die gesamte Businesslogik, DB-Schreibzugriffe,
  `commit()`, Benachrichtigungen, Timeline-Einträge.
- **Models** (`app/models/`): nur DB-Abbildung, keine Businesslogik.
- **Schemas** (`app/schemas/`): Pydantic, strikt getrennt von ORM-Modellen.
  Personen immer über `stammdaten_service.personen_zu_out()` / `person_zu_out()`
  konvertieren.

## Datenbankänderungen

Neue Tabelle: Migration + Model + Schema + Service + API + Tests.
Neues Feld: Migration + Model + Schema + ggf. Frontend.
Migrationen fortlaufend nummeriert (`NNNN_beschreibung.py`). Details:
`.claude/docs/database.md`.

## Berechtigungen

Bestehende Dependencies verwenden (`CurrentModerator`, `CurrentAdmin`,
`CurrentPerson`), Module über `require_modul_aktiv()` absichern. Keine eigenen
Rollenprüfungen erfinden. Reales Rollenmodell: `.claude/docs/permissions.md`.

## Benachrichtigungen, Timeline

- Benachrichtigungen nie direkt versenden – immer
  `notifier_service.benachrichtige()`. Siehe `.claude/docs/notifications.md`.
- Relevante Personenänderungen als `PersonEreignis` protokollieren – aus dem
  Service heraus. Siehe `.claude/docs/timeline.md`.

## Module

Zwei getrennte Modul-Begriffe – nicht vermischen:

- **Feature-Module** (`feature_modul_service.py`): die vom Admin schaltbaren
  Funktionsmodule, Zustand vollständig in `app_config`. Registry `FEATURE_MODULE`
  legt Namen, `mitgliederseitig` und `immer_aktiv` fest; Reihenfolge = Default für
  neue Projekte (interne, immer aktive Verwaltungsmodule Personal/Fahrzeuge oben),
  händisch verschiebbar über `modul_reihenfolge`.
- **Berechtigungs-Module** (`modul_service` / `Modul`-Tabelle): Zugriffssteuerung.
  Nicht anfassen, wenn es nur um ein Funktionsmodul geht.

Einheitliche Modul-Bereiche – jedes (mitgliederseitige) Modul hat drei Bereiche:

1. **Mitglieder/Kiosk** – Anzeige über `modul_<key>_startseite` (Kiosk) bzw.
   `modul_<key>_aussenzugriff` (öffentlicher Zugriff).
2. **Moderator/Gruppenführer** – die eigentliche Modul-Seite (Liste/Verwaltung).
3. **Admin** – **Modul-Unterseite** unter „Module → <Modul>", die *alle* zum
   Modul gehörenden Einstellungen und Daten bündelt (nicht zentral in
   `Einstellungen.tsx` verstreuen). An/Aus, Kiosk-Anzeige und Außenzugriff werden
   auf der Übersichtsseite „Module" geschaltet.

Config-Keys je Modul: `modul_<key>_aktiv` / `_startseite` / `_aussenzugriff`,
immer in `config_defaults.py` mit neutralem Default registrieren.

Checkliste neues Modul: Migration + Model + Schema + Service + Router (mit
`require_modul_aktiv()`) + `FEATURE_MODULE`-Eintrag + `modul_*`-Config-Defaults +
Frontend (Kiosk/Mitglied/Moderator + **Modul-Unterseite** in `ModulUnterseite.tsx`)
+ Kiosk-/Hub-Kachel + ggf. Benachrichtigungs-Hook + Tests. Neue Module am
bestehenden Muster orientieren – Skill `new-module` (Detail-Checkliste dort).

## Tests

- Backend-Tests mit `pytest` gegen eine **echte lokale PostgreSQL**-Testdatenbank
  `geratehaus_test` (kein SQLite – JSONB / `INSERT ... ON CONFLICT` werden genutzt).
- Bugfixes brauchen einen Regressionstest (erst der fehlschlagende Test, dann Fix).
- Neue Features brauchen mindestens einen Happy-Path-Test.
- Vor Abschluss/Deploy `pytest` und `npm run build` ausführen. Skill `tests`.
- In dieser Docker-Umgebung (kein Host-venv/-Postgres) läuft die Backend-Suite über
  `scripts/test-backend.sh` (nutzt die Container + Test-DB `geratehaus_test`).

## Arbeitsweise / Workflow

- Aufgaben werden im Backlog `.claude/docs/backlog.md` über den `todo`-Skill
  gepflegt. Vor dem Lesen/Ändern immer den aktuellen Stand aus Git holen; nach
  Änderungen sofort committen und pushen.
- Nach jedem `git push` `docker compose up -d --build` ausführen, damit die
  laufende Instanz aktuell ist.
- Vor jeder Implementierung bestehende Patterns suchen und wiederverwenden –
  Skill `geraetehaus-patterns`.

## Vor einem Release

Feste Checkliste, bevor eine neue Version veröffentlicht wird:

- **Datenschutz-Seite prüfen und anpassen** (`frontend/src/pages/Datenschutz.tsx`):
  Spiegelt sie noch die aktuell aktive Datenverarbeitung wider (neue Features, neue
  erhobene Daten)? Darf nie vergessen werden.
- **README prüfen und anpassen** (`README.md`): Spiegelt sie noch den aktuellen
  Funktionsumfang, Setup und Stand wider (neue/entfernte Features, geänderte
  Schritte)? Vor jeder Veröffentlichung kontrollieren.
- **Modul-Docs prüfen und anpassen** (`docs/*.md`): Bei jedem Beta- **und**
  Stable-Release **alle** Modul-Dokus durchgehen und an geänderte/neue/entfernte
  Funktionen anpassen. Neues Modul → neue `docs/<key>.md` anlegen (Dateiname =
  Modul-Key, sonst bricht der Doku-Link auf der Modul-Übersicht). Index
  `docs/README.md` mitpflegen.
- `pytest` (Backend) und `npm run build` (Frontend) fehlerfrei.
- Feature-Freeze: vor dem Release keine neuen Features mehr mergen (siehe Backlog
  `.claude/docs/backlog.md`, Etappe N).

## Wissenspflege

Neue allgemeingültige Patterns → `.claude/skills/geraetehaus-patterns/EXAMPLES.md`.
Erkenntnisse/Stolperfallen/Architekturentscheidungen →
`.claude/skills/knowledge-management/LESSONS.md`. Keine einmaligen Bugfixes oder
TODOs in diese Dateien. Skill `knowledge-management`.
