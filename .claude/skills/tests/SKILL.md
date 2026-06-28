# SKILL: Backend Testing & Quality Assurance (Python/pytest)

Du bist ein Experte für das Testen dieses Backend-Projekts. Deine Hauptaufgabe ist es, die Integrität der Testsuite zu wahren, Regressionen zu verhindern und bei jeder Code-Änderung die Testabdeckung synchron zu halten.

## 1. Testumgebung & Architektur

* **Framework:** `pytest` + `pytest-asyncio`
* **Datenbank:** Echte lokale PostgreSQL-Testdatenbank (`geratehaus_test`). 
    > **Wichtig:** Kein SQLite verwenden! Das Projekt nutzt Postgres-spezifische Features wie `JSONB` und `INSERT ... ON CONFLICT`.
* **Isolierung:** Jeder Test läuft isoliert gegen `geratehaus_test` (erzwungen via `DATABASE_URL` in `tests/conftest.py`). Vor jedem Test werden alle Tabellen geleert und der `config_service`-Cache wird invalidiert. Tests sind komplett unabhängig und reihenfolgen-agnostisch.

### Setup & Befehle
* **Einrichten (einmalig):** `createdb geratehaus_test` -> `cd backend` -> `python3.12 -m venv .venv && source .venv/bin/activate` -> `pip install -e ".[dev]"`
* **Ausführen:**
    * Ganze Suite: `pytest`
    * Mit Testnamen (Verbose): `pytest -v`
    * Einzelne Datei: `pytest tests/test_dienststunden_schwellenwert.py`
    * Pattern-Matching: `pytest -k barcode`

---

## 2. Aktueller Testumfang (Scope)

Die Suite deckt gezielt sicherheitskritische und volatile Kernbereiche ab:

| Testdatei | Fokus / Abgedecktes Verhalten |
| :--- | :--- |
| `test_security.py` | Sicherheitsheader, Rate-Limiter (Blockieren nach Max-Zahl, Client-IP Trennung). |
| `test_moderator_auth.py` | Login-Validierung, Login-Rate-Limiting, Admin- vs. Gruppenführer-Rechte. |
| `test_barcode_auth.py` | Barcode-Scan (Gültigkeit, Ablauf), Rate-Limiting, Cookie-Löschung bei Logout. |
| `test_dienststunden_schwellenwert.py` | Schwellenwert-Überschreitungen, Stunden-Übernahme, Moderator-Zwang. |
| `test_update_kanal.py` | Admin-only Update-Kanäle (stable/beta). **Achtung:** Ruft echte GitHub-API auf (Internet benötigt, kein Mock). |
| `test_sentry_setup.py` | DSN-Konstante, .env-Override, Initialisierung via `app_config`, Sentry-Log-Level, Env/Release-Mapping. |
| `test_logging_setup.py` | Integration von `structlog` mit stdlib-`logging` (wichtig für Sentry). |
| `test_setup.py` | `POST /setup` Frontend-Payload (Geofence-Pflichtfelder-Regression), Login, Blockieren von Zweit-Setup (409). |
| `test_email_html.py` | HTML-Mail-Rendering, Autoescaping (HTML-Injection Schutz), Multipart-Aufbau. (SMTP ist gemockt). |
| `test_buchung_aktion.py` | Mail-Buttons (Annehmen/Ablehnen), Token-Generierung, Statusänderung, Token-Ablauf (404). |
| `test_punkte_belohnung.py` | Rechteprüfung: Gruppenführer darf Punkte vergeben/lesen, aber keine Personen anlegen (403). |

---

## 3. Strikte Handlungsanweisungen für Claude (Definition of Done)

Wenn du Code-Änderungen im Backend vornimmst, neue Endpunkte hinzufügst oder Bugs fixst, **musst** du folgende Regeln einhalten:

1.  **Test-Driven-Mindset bei Bugfixes:** Schreibe bei einer Regression *zuerst* einen fehlschlagenden Test, der den Bug reproduziert. Fixe erst danach den Code, bis der Test grün ist.
2.  **Keine Code-Änderung ohne Test:** Jedes neue Feature und jede Verhaltensänderung muss in *derselben* Änderung durch entsprechende Tests in `backend/tests/` abgedekt werden. Ein Feature ohne Test gilt als unfertig.
3.  **Dokumentation aktualisieren:** Wenn du eine neue Testdatei anlegst oder den Scope der Suite erweiterst, aktualisiere zwingend die `TESTS.md`, damit die obige Liste aktuell bleibt.
4.  **Deployment-Sicherheit:** Vor jedem potenziellen Deploy oder Abschluss einer Aufgabe muss `pytest` lokal fehlerfrei durchlaufen.
