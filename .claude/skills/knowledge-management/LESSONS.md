# LESSONS.md

Dieses Dokument enthält wichtige Erkenntnisse aus der Entwicklung.

Hier werden Erfahrungen dokumentiert, die zukünftige Fehler vermeiden.

## Dokumentieren

- Architekturentscheidungen
- Stolperfallen
- Warum eine Lösung gewählt wurde
- Wiederkehrende Fehler

Nicht dokumentieren

- Einmalige Bugs
- Erledigte Aufgaben
- TODOs

---

## Titel

### Problem

...

### Ursache

...

### Lösung

...

### Warum?

...

### Gilt auch für

-

---

# Dokumentierte Lessons

---

## PostgreSQL-only – kein SQLite (auch nicht in Tests)

### Problem

Tests oder lokale Setups gegen SQLite laufen scheinbar, brechen aber bei
PostgreSQL-spezifischen Features.

### Ursache

Das Projekt nutzt bewusst `JSONB` (Migration `0007_json_zu_jsonb`) und
`INSERT ... ON CONFLICT` (Config-Seeding/-Update in `config_service`). Beides
existiert in SQLite nicht bzw. verhält sich anders.

### Lösung

Tests laufen gegen eine echte lokale PostgreSQL-Testdatenbank `geratehaus_test`
(`tests/conftest.py`, überschreibbar via `DATABASE_URL`). Keine SQLite-Annahmen.

### Warum?

Konsistenz zwischen Test-, Entwicklungs- und Produktionsumgebung; keine falsch-
positiven Tests.

### Gilt auch für

- Neue Migrationen (PostgreSQL-Typen/-Constraints nutzen ist erlaubt)
- Neue Tests (immer PostgreSQL voraussetzen)

---

## Fachliche Config zur Laufzeit lesen – Scheduler ohne Neustart

### Problem

Änderungen an Einstellungen (z. B. Uhrzeit für Auto-Abschluss, Divera an/aus)
sollen sofort wirken, ohne Backend-Neustart oder Neu-Registrierung der Jobs.

### Ursache

Würde ein Cron-Job seine Uhrzeit fest bei der Registrierung übernehmen oder ein
Wert einmalig beim Start gelesen, müsste man für jede Änderung neu starten.

### Lösung

Zeit-/Zustandsabhängige Jobs sind grob registriert (stündlich/minütlich) und lesen
die maßgeblichen Werte **im Job selbst** über `config_service` (z. B.
`einsatz_autoabschluss_stunde`, `divera_modus`). `config_service` cached prozessweit
und invalidiert bei jedem `set()`.

### Warum?

Live-Konfigurierbarkeit über den Moderator-Bereich ist ein Kernprinzip der App.

### Gilt auch für

- Neue Jobs mit konfigurierbarem Zeitpunkt/Verhalten
- Jede Businesslogik, die auf `app_config` reagiert

---

## Berechtigung ist Rolle am Moderator, keine eigene Tabelle

### Problem

Man könnte versucht sein, für „Admin" vs. „Gruppenführer" getrennte Modelle oder
eigene Prüfungen zu bauen.

### Ursache

Fachlich klingt es nach zwei Rollen – technisch ist es **ein** `Moderator`-Datensatz
mit dem Feld `rolle` (`"admin"` vs. sonst).

### Lösung

Trennung ausschließlich über die vorhandenen Dependencies `CurrentModerator` /
`CurrentAdmin` (`app/api/deps.py`). Frontend-Guards (`ModeratorRoute`/`AdminRoute`)
sind nur UX; maßgeblich ist die serverseitige Prüfung.

### Warum?

Ein Modell, eine Prüfstelle – keine divergierenden Rollen-Checks.

### Gilt auch für

- Jeden neuen admin-only Endpunkt (siehe `.claude/docs/permissions.md`)

---

## Kiosk-Scan ist Bestätigung, kein Login

### Problem

Auf dem öffentlich stehenden Kiosk blieb nach einem Barcode-Scan die gescannte
Person „eingeloggt" – der nächste musste sich erst abmelden.

### Ursache

Der Scan lief über dieselbe Funktion wie der Mitglieder-Login
(`barcodeEinscannen`), die neben dem serverseitigen `geraetehaus_name`-Cookie auch
`angezeigterName` in localStorage persistiert. Auf einem geteilten Gerät ist das
falsch: der Scan soll nur bestätigen, wer sich gerade für genau EINE Eintragung
(Sitzplatz/Stunden/Fahrzeug) einträgt.

### Lösung

Kiosk und Login getrennt: `barcodeEinscannenEinmalig()` setzt nur den Cookie (den
die Buchung über `CurrentPerson` liest) ohne localStorage/State zu persistieren;
nach der Buchung löscht `kioskScanBeenden()` den Cookie wieder (im `finally`, best
effort). Der echte Mitglieder-Login auf dem eigenen Handy persistiert weiterhin.

### Warum?

Auf geteilten, öffentlich zugänglichen Geräten darf keine dauerhafte Identität
zurückbleiben – Identität gilt nur für die eine Aktion.

### Gilt auch für

- Alle vier Modul-Eintragungen (Einsatz, Dienstbuch, Dienststunden, Fahrzeugbuchung)
- Jede künftige Kiosk-Aktion mit Personenbezug

## `docker compose run backend <cmd>` startet die KOMPLETTE App (Scheduler-Duplikat!)

### Problem

Ein einmaliger Befehl wie `docker compose run backend '<pip-audit-Einzeiler>'`
startet **nicht** nur den Befehl – der `ENTRYPOINT ./docker-entrypoint.sh` fährt
zuerst die volle App hoch (Migrationen + `uvicorn` + **APScheduler**). Der Container
bleibt dann als `geratehaus-app-backend-run-<hash>` **dauerhaft laufen** (hier 2 Tage),
mit einem **zweiten Scheduler gegen dieselbe Produktions-DB**.

### Symptom

Ein bereits im Code behobener und als *resolved* markierter Scheduler-Fehler
(z. B. Sentry `formular_ablauf_job_fehlgeschlagen`, JAVASCRIPT-39) **feuert
weiter alle 15 min**, obwohl der reguläre `backend-1` den Job sauber ausführt –
weil das alte Streuner-Image den Job mit veraltetem Code/Query ausführt. Erkennen:
`docker ps -a | grep -- -run-`.

### Lösung / Prävention

- Streuner entfernen: `docker rm -f geratehaus-app-backend-run-<hash>`.
- Einmalige Befehle **immer** wie `scripts/test-backend.sh` starten:
  `docker compose run --rm -T --no-deps --entrypoint sh backend -c '<cmd>'`
  (überschreibt den App-Entrypoint, räumt via `--rm` auf, keine Deps).
- Bei „resolved, feuert aber weiter": zuerst auf **verwaiste `-run-`-Container** prüfen,
  bevor man erneut im Code sucht.

## Verwaiste Sentry-Cron-Monitor-Umgebung → dauerhaftes „missed check-in"

### Problem

Ein Sentry-Cron-Monitor („Crons") wird **pro `environment` getrennt** ausgewertet.
Ändert sich das von der App gemeldete `environment`, bleibt die alte Umgebung als
**verwaiste Dimension** am Monitor zurück: Dort kommen KEINE Check-ins mehr an, also
meldet Sentry für sie **jede geplante Ausführung als „missed check-in"** – dauerhaft.
Am aggressivsten beim **1-Minuten-Job** (`einsatz-geplanter-abschluss`).

### Konkreter Fall (11.07.2026, JAVASCRIPT-2Z)

Vor dem Version-Fix (`installierte_version()` aus `pyproject.toml`, Commit 073a40f)
meldete sich die beta-Instanz fälschlich als `environment=production` (dist-info
0.4.0). Dadurch entstand am Monitor eine `production`-Umgebung. Nach dem Fix checkt der
Container korrekt als `beta` ein → `production` verwaist und feuert endlos „missed".
`get_monitor_details` zeigt es klar: `beta` = Status ok (jede Minute), `production` =
Status error, letzter Check-in am Deploy-Zeitpunkt des Version-Fixes.

**Wichtig:** `failure_issue_threshold` (Deploy-Toleranz) hilft hier NICHT – es kommen
gar keine Check-ins an, nicht nur zu wenige.

### Diagnose & Lösung

- Diagnose: `get_monitor_details(monitorSlug=…)` → Abschnitt „Environments" auf verwaiste
  Umgebungen (Status error, alter „Last check-in") prüfen; „Recent Check-Ins" zeigt, aus
  welcher Umgebung tatsächlich eingecheckt wird.
- **Permanenter Fix nur in der Sentry-UI**: Crons → Monitor → die verwaiste Umgebung
  (bzw. den Monitor) löschen. Er wird beim nächsten Check-in sauber unter der aktuellen
  Umgebung neu angelegt. Der Sentry-MCP hat **kein** Monitor-Lösch-Tool (nur
  `find_monitors`/`get_monitor_details`).
- Übergangsweise: Issue auf „ignored (untilEscalating)" – echte neue Ausfälle der
  aktuellen Umgebung tauchen dann wieder auf.
- Gilt für **alle** Cron-Monitore, die den Umgebungswechsel miterlebt haben
  (divera-polling, formular-ablauf, backup, divera-personal-sync, einsatz-geplanter-abschluss).

## `os.environ.setdefault(...)` in `conftest.py` schützt NICHT vor der echten `.env`

### Problem

`scripts/test-backend.sh` startet die Testsuite über `docker compose run ... backend`
– also **denselben Service**, dessen `env_file` beim Start ganz normal die **echte**
`.env` dieser Instanz lädt (echte Secrets, echter `ENVIRONMENT=production`, echter
`UPLOAD_DIR`). `conftest.py` setzt Test-Werte für genau diese Variablen bislang per
`os.environ.setdefault(...)` – das greift aber nur, wenn die Variable **noch gar
nicht** gesetzt ist. Da sie über `env_file` längst gesetzt ist, war `setdefault` für
`ENVIRONMENT`/`JWT_SECRET_KEY`/`COOKIE_SECRET_KEY`/`UPLOAD_DIR` ein reiner No-op –
die gesamte Testsuite lief unbemerkt mit **Produktions-Werten** statt der
beabsichtigten Test-Werte.

### Symptom

Lange harmlos (nichts verzweigte nach `environment`), bis ein `secure`-Flag auf
Cookies (`secure=settings.environment == "production"`) ergänzt wurde: Der
Testclient spricht `http://test` (kein TLS), `secure`-Cookies werden vom
HTTP-Client-Cookiejar dann nicht mehr zurückgesendet → alle Folge-Requests, die
sich auf das Cookie verlassen, schlagen mit 401 fehl (17 Tests in mehreren
Dateien, u. a. `test_ohne_pin.py`, `test_mitglied_dashboard.py`). Reproduzierbar
isoliert nachgewiesen: Fehler bestand auch **ohne** die neue Testdatei, rein durch
den echten `.env`-Wert von `ENVIRONMENT`.

### Lösung / Prävention

- In `conftest.py` für Variablen, die auch in der echten `.env` gesetzt sein
  können, **direkte Zuweisung** (`os.environ["X"] = "..."`) statt `setdefault`
  verwenden – Test-Isolation muss Vorrang vor einem eventuell schon gesetzten
  Produktionswert haben.
- Ausnahme bewusst `DATABASE_URL`: bleibt `setdefault`, weil CI diese Variable
  **gezielt von außen überschreiben** können soll (Kommentar im Code).
- Bei jedem neuen `environment ==`/`settings.<x>`-basierten Verzweigen im Code
  kurz prüfen, ob die Testsuite wirklich den Test-Wert sieht, nicht den der
  echten `.env` dieser Instanz – am einfachsten mit einem gezielten Fehlschlag
  wie oben (nicht mit einem `print`, das könnte übersehen werden).
