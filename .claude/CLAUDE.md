# CLAUDE.md – Projektregeln für Gerätehaus.app

Globale, dauerhaft gültige Regeln für die Arbeit an diesem Projekt. Details zur
Architektur stehen in `.claude/architecture.md` und `.claude/docs/*.md`. Nur
allgemeingültige Regeln gehören hierher, keine temporären Aufgaben (die stehen in
`TODO.md`).

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
  `commit()`, Benachrichtigungen, Punktevergabe, Timeline-Einträge.
- **Models** (`app/models/`): nur DB-Abbildung, keine Businesslogik.
- **Schemas** (`app/schemas/`): Pydantic, strikt getrennt von ORM-Modellen.
  Personen immer über `stammdaten_service.personen_zu_out()` / `person_zu_out()`
  konvertieren (berechnete Felder wie Gesamtpunkte).

## Datenbankänderungen

Neue Tabelle: Migration + Model + Schema + Service + API + Tests.
Neues Feld: Migration + Model + Schema + ggf. Frontend.
Migrationen fortlaufend nummeriert (`NNNN_beschreibung.py`). Details:
`.claude/docs/database.md`.

## Berechtigungen

Bestehende Dependencies verwenden (`CurrentModerator`, `CurrentAdmin`,
`CurrentPerson`), Module über `require_modul_aktiv()` absichern. Keine eigenen
Rollenprüfungen erfinden. Reales Rollenmodell: `.claude/docs/permissions.md`.

## Benachrichtigungen, Punkte, Timeline

- Benachrichtigungen nie direkt versenden – immer
  `notifier_service.benachrichtige()`. Siehe `.claude/docs/notifications.md`.
- Punkte nie direkt schreiben – über die bestehenden Services. Relevante
  Personenänderungen als `PersonEreignis` protokollieren. Siehe
  `.claude/docs/timeline.md`.

## Module

Jedes Modul verhält sich gleich (Backend: Router/Service/Model/Schema; Frontend:
Kiosk/Mitglied/Moderator; Config: `modul_<name>_aktiv` / `_startseite` /
`_aussenzugriff`). Neue Module am bestehenden Muster orientieren – Skill
`new-module`.

## Tests

- Backend-Tests mit `pytest` gegen eine **echte lokale PostgreSQL**-Testdatenbank
  `geratehaus_test` (kein SQLite – JSONB / `INSERT ... ON CONFLICT` werden genutzt).
- Bugfixes brauchen einen Regressionstest (erst der fehlschlagende Test, dann Fix).
- Neue Features brauchen mindestens einen Happy-Path-Test.
- Vor Abschluss/Deploy `pytest` und `npm run build` ausführen. Skill `tests`.

## Arbeitsweise / Workflow

- Vor dem Lesen/Ändern von Aufgaben immer die aktuelle `TODO.md` aus Git holen;
  nach Änderungen an `TODO.md` sofort committen und pushen.
- Nach jedem `git push` `docker compose up -d --build` ausführen, damit die
  laufende Instanz aktuell ist.
- Vor jeder Implementierung bestehende Patterns suchen und wiederverwenden –
  Skill `geraetehaus-patterns`.

## Wissenspflege

Neue allgemeingültige Patterns → `.claude/skills/geraetehaus-patterns/EXAMPLES.md`.
Erkenntnisse/Stolperfallen/Architekturentscheidungen →
`.claude/skills/knowledge-management/LESSONS.md`. Keine einmaligen Bugfixes oder
TODOs in diese Dateien. Skill `knowledge-management`.
