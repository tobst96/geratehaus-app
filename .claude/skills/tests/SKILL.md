---
name: tests
description: Unterstützt Backend-Testing und Qualitätssicherung für Gerätehaus.app mit pytest, PostgreSQL-Testdatenbank, Regressionstests und Testdokumentation.
---

# Backend Testing & Quality Assurance

Verwende diesen Skill, wenn Backend-Code geändert, ein Bug gefixt, ein Endpunkt ergänzt oder die Testsuite angepasst wird.

## Rolle

Du bist ein Experte für das Testen dieses Backend-Projekts.

Die Hauptaufgaben sind:

- Integrität der Testsuite wahren
- Regressionen verhindern
- Testabdeckung mit Codeänderungen synchron halten
- kritische Projektbereiche absichern

## Testumgebung

Framework:

- `pytest`
- `pytest-asyncio`

Datenbank:

- echte lokale PostgreSQL-Testdatenbank `geratehaus_test`

Wichtig:

- Kein SQLite verwenden.
- Das Projekt nutzt PostgreSQL-spezifische Features wie `JSONB` und `INSERT ... ON CONFLICT`.

## Isolierung

Jeder Test läuft isoliert gegen `geratehaus_test`.

Die Isolierung wird über `DATABASE_URL` in `tests/conftest.py` erzwungen.

Vor jedem Test:

- alle Tabellen leeren
- `config_service`-Cache invalidieren

Tests müssen unabhängig und reihenfolgen-agnostisch sein.

## Setup und Befehle

Einmalig einrichten:

```bash
createdb geratehaus_test
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

Tests ausführen:

```bash
pytest
pytest -v
pytest tests/test_dienststunden_schwellenwert.py
pytest -k barcode
```

### In dieser (Docker-)Umgebung

Es gibt hier kein Host-`venv` und kein Host-Postgres. Die Suite läuft über die
laufenden Container – Helfer-Skript:

```bash
scripts/test-backend.sh            # ganze Suite
scripts/test-backend.sh -k barcode # pytest-Argumente werden durchgereicht
```

Das Skript legt die Test-DB `geratehaus_test` in der `db`-Container-Postgres an
(idempotent) und führt `pytest` im `backend`-Container aus (dort liegen alle
Laufzeit-Deps + `tests/`; `pytest` wird nur ephemer nachinstalliert, das Prod-Image
bleibt unverändert). Voraussetzung: `docker compose up -d` läuft.

## Aktueller Testumfang

Die Suite deckt gezielt sicherheitskritische und volatile Kernbereiche ab.

| Testdatei | Fokus |
| --- | --- |
| `test_security.py` | Sicherheitsheader, Rate-Limiter, Client-IP-Trennung |
| `test_moderator_auth.py` | Login-Validierung, Login-Rate-Limiting, Admin- vs. Gruppenführer-Rechte |
| `test_barcode_auth.py` | Barcode-Scan, Gültigkeit, Ablauf, Rate-Limiting, Cookie-Löschung bei Logout |
| `test_dienststunden_schwellenwert.py` | Schwellenwert-Überschreitungen, Stunden-Übernahme, Moderator-Zwang |
| `test_update_kanal.py` | Admin-only Update-Kanäle `stable` und `beta`; Achtung: ruft echte GitHub-API auf |
| `test_sentry_setup.py` | DSN-Konstante, `.env`-Override, Initialisierung via `app_config`, Sentry-Log-Level, Env/Release-Mapping |
| `test_logging_setup.py` | Integration von `structlog` mit stdlib-`logging` |
| `test_setup.py` | `POST /setup`, Geofence-Pflichtfelder-Regression, Login, Zweit-Setup blockiert mit 409 |
| `test_email_html.py` | HTML-Mail-Rendering, Autoescaping, Multipart-Aufbau; SMTP ist gemockt |
| `test_buchung_aktion.py` | Mail-Buttons, Token-Generierung, Statusänderung, Token-Ablauf |
| `test_punkte_belohnung.py` | Rechteprüfung: Gruppenführer darf Punkte vergeben/lesen, aber keine Personen anlegen |
| `test_divera_client.py` | `divera_client.hole_alarme`: korrekter v2-Endpunkt, Response-Parsing, `lastUpdate`-Delta, Fehler → leere Liste |
| `test_divera_personal_service.py` | Personal-Sync: Matching (divera_user_id/Name), Vorschlag-Erzeugung, Übernehmen/Ignorieren, 1-Jahres-Aufräumung, deaktiviert = No-op |

## Definition of Done

Wenn Backend-Code geändert, ein Endpunkt ergänzt oder ein Bug gefixt wird:

1. Bei Regressionen zuerst einen fehlschlagenden Test schreiben.
2. Den Code erst danach fixen.
3. Jedes neue Feature und jede Verhaltensänderung in `backend/tests/` abdecken.
4. Neue Tests möglichst nah am betroffenen Verhalten platzieren.
5. Testdaten isoliert und deterministisch halten.
6. Keine externen Services verwenden, außer ein bestehender Test ist ausdrücklich so angelegt.
7. Vor Abschluss relevante Tests ausführen.

Ein Feature ohne Test gilt als unfertig.

## Testdokumentation

Wenn eine neue Testdatei entsteht oder der Scope der Testsuite erweitert wird:

- passende Testdokumentation aktualisieren
- den abgedeckten Bereich klar benennen
- wichtige Einschränkungen dokumentieren

## Deployment-Sicherheit

Vor jedem potenziellen Deploy oder Abschluss einer größeren Backend-Aufgabe muss `pytest` lokal fehlerfrei durchlaufen.
