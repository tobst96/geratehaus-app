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

## `docker compose up -d --build` kann ein neues Image bauen, ohne den Container neu zu starten

### Problem

`docker compose --profile minio up -d --build` meldete nach einem echten Frontend-
Codeänderung (mehrere Commits über zwei Tage) für Frontend **und** Backend nur
„Running" statt „Recreate"/„Recreated" – obwohl `docker build` sichtbar ein neues
Image erzeugt hatte. `docker inspect <container> --format '{{.Image}}'` vs.
`docker inspect <image-tag> --format '{{.Id}}'` zeigten danach zwei
**unterschiedliche** IDs: Der laufende Container nutzte noch ein 1-2 Tage altes
Image, das frisch gebaute (mit dem Fix drin) lief nie.

### Symptom

Mehrere als „deployed und live verifiziert" gemeldete Fixes liefen in Wahrheit
weiter mit altem Code – ohne Fehlermeldung, `docker compose up -d --build` gibt
keinen Hinweis darauf, dass es den Container NICHT ersetzt hat.

### Lösung / Prävention

- Nach **jedem** `docker compose up -d --build` den tatsächlichen Container-Stand
  gegen das frisch getaggte Image verifizieren, bevor ein Fix als „live" gemeldet
  wird:
  ```
  docker inspect <container> --format '{{.Image}}'
  docker inspect <image-tag>  --format '{{.Id}}'
  ```
  Stimmen beide IDs nicht überein, ist der Container NICHT aktualisiert.
- Im Zweifel (oder direkt nach einer Deploy-Auffälligkeit) `--force-recreate`
  zusätzlich zu `--build` anhängen – erzwingt die Neuerstellung unabhängig von
  Docker Composes eigener Änderungserkennung. Rekreiert dabei auch `db`/`minio`
  mit (kein Datenverlust bei intaktem Volume, aber kurzer Neustart) – falls das
  vermieden werden soll, `--force-recreate` nur mit den betroffenen Service-Namen
  aufrufen (`... up -d --build --force-recreate backend frontend`).
- Root Cause nicht abschließend geklärt (evtl. BuildKit-„bake"-Caching-Effekt bei
  `docker compose build`); die Verifikation oben ist die zuverlässige Absicherung,
  unabhängig von der genauen Ursache.

## `environment == "production"` heißt nicht "läuft nachweislich hinter HTTPS"

### Problem

Ein Cookie-`secure`-Flag wurde an `settings.environment == "production"`
gekoppelt (Annahme: production = HTTPS-Reverse-Proxy davor, wie in
`test_security_headers_gesetzt` dokumentiert). Diese Annahme war für die
tatsächlich laufende Instanz falsch – sie lief mit `environment=production`,
aber (noch) ohne eingerichtetes HTTPS. Das Secure-Cookie wurde vom Browser
dadurch nie mehr gesetzt/gesendet → **Login/Buchung für alle Nutzer
lahmgelegt**, bis der Fix live reproduziert und korrigiert wurde (siehe
Backlog Etappen AD/AI).

### Symptom

„Ich muss mich vor/nach dem Buchen einloggen" – ein zweistufiger
Identifizieren-dann-Buchen-Ablauf schlug in Schritt 2 mit 401 fehl, weil das
in Schritt 1 gesetzte Cookie den Browser nie erreichte/verließ.

### Lösung / Prävention

- **Infrastruktur-Annahmen nie aus einem unabhängigen Konfigurationswert
  ableiten.** `environment` (production/test/development) sagt nichts
  darüber aus, ob TLS tatsächlich terminiert wird. Ein Verhalten, das ein
  reales HTTPS-Setup voraussetzt (Secure-Cookies, HSTS, ...), braucht einen
  **eigenen, explizit vom Betreiber gesetzten Schalter** (hier:
  `COOKIES_SECURE`, Default aus) – nicht an einen bestehenden, semantisch
  anderen Wert koppeln, so verlockend die Abkürzung wirkt.
- Bei sicherheitsrelevanten Verhaltensänderungen, die von der tatsächlichen
  Netzwerktopologie abhängen (TLS, Reverse-Proxy, Cookie-Flags): vor dem
  Deploy auf einer echten Instanz **aktiv gegenprüfen**, ob die Annahme
  dort zutrifft (hier hätte ein einfacher Check „läuft diese Instanz
  wirklich über HTTPS?" den Ausfall verhindert), statt sich auf eine
  Doku-Notiz aus einem anderen Kontext zu verlassen.
- Bei `localhost` zum Reproduzieren solcher Cookie-Bugs vorsichtig sein:
  Browser (und curl) behandeln `http://localhost` als „potentially
  trustworthy" und senden Secure-Cookies dort trotzdem – ein Test gegen
  `localhost` kann einen echten Secure-Cookie-Bug **verdecken**. Mit einem
  echten (Fantasie-)Hostnamen reproduzieren, z. B. via
  `curl --resolve name:port:127.0.0.1 http://name:port/...`.

---

## Migration eines Feature-Branches nie gegen die geteilte/live DB testen

### Problem

Nach dem Anlegen von Migration `0072` auf einem Feature-Branch
(`feature/dienstbuch-planer`) wurde sie zur lokalen Verifikation direkt gegen
den laufenden `db`-Container ausgeführt (`alembic upgrade head`) – demselben
Postgres, den auch die **live deployte `beta`-Instanz** nutzt. Ein späterer,
inhaltlich unabhängiger Deploy von `beta` (nur Backlog/Doku-Änderungen) ließ
den Backend-Container in eine Crash-Schleife laufen: `ERROR: Can't locate
revision identified by '0072'` – `beta`s Code kennt nur bis Migration `0071`,
die DB stand aber (aus dem Feature-Branch-Test) bereits auf `0072`. Die
Instanz war für mehrere Minuten nicht erreichbar, bis die DB manuell wieder
auf `0071` zurückgestuft wurde (dafür musste kurz auf den Feature-Branch
gewechselt werden, weil nur der die Downgrade-Migration kennt).

### Ursache

Es gibt in dieser Umgebung nur **eine** Postgres-Instanz/einen `db`-Container
für Entwicklung **und** die live deployte `beta`-Instanz – anders als beim
Backend-Testlauf, der bewusst eine **separate** Test-Datenbank
(`geratehaus_test`) nutzt. Eine Migration, die nur auf einem Feature-Branch
existiert, darf diese eine gemeinsame DB nie über den Stand von `beta` hinaus
verändern, sonst bricht jeder künftige `beta`-Deploy, bis die DB wieder
zurückgesetzt wird.

### Lösung / Prävention

- Migrationen von Feature-Branches **nicht** gegen den lokalen/gemeinsamen
  `db`-Container laufen lassen, solange der Branch nicht nach `beta` gemergt
  ist. Verifikation stattdessen über die Test-Suite (`scripts/test-backend.sh`,
  läuft gegen die separate `geratehaus_test`-DB und nutzt ohnehin
  `Base.metadata.create_all` statt Alembic) oder eine eigens dafür isolierte
  DB/Compose-Projekt.
- Ist es doch versehentlich passiert: **sofort** `alembic downgrade
  <letzte-beta-Revision>` gegen dieselbe DB ausführen, bevor der nächste
  `beta`-Deploy erfolgt (Downgrade-Skript liegt nur auf dem Feature-Branch –
  kurz dorthin wechseln, downgraden, zurück wechseln).
- Nach jedem Deploy (siehe bestehende Lesson zu `docker compose up -d
  --build`) nicht nur den Image-Hash, sondern bei Unhealthy-Status **sofort**
  `docker compose logs backend` prüfen – der Fehler ist dort eindeutig
  sichtbar und lässt sich schnell von echten Code-Fehlern unterscheiden.

### Gilt auch für

- Jede zukünftige Migration, die auf einem Feature-Branch entwickelt wird,
  bevor er nach `beta` gemergt ist.
