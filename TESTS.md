# Tests

Backend-Testsuite mit `pytest` + `pytest-asyncio`, gegen eine echte lokale
PostgreSQL-Testdatenbank (kein SQLite — mehrere Modelle/Services nutzen
Postgres-spezifisches `JSONB` und `INSERT ... ON CONFLICT`, das wäre unter
SQLite nicht testbar).

## Einmalig einrichten

```bash
createdb geratehaus_test
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
```

## Ausführen

```bash
cd backend
pytest            # ganze Suite
pytest -v         # mit Testnamen
pytest tests/test_dienststunden_schwellenwert.py   # nur eine Datei
pytest -k barcode # nur Tests, deren Name "barcode" enthält
```

Jeder Test läuft gegen `geratehaus_test` (über `DATABASE_URL` in
`tests/conftest.py` erzwungen, unabhängig vom `.env` der echten Instanz).
Vor jedem Test werden alle Tabellen geleert und der `config_service`-Cache
invalidiert — Tests sind also voneinander unabhängig und können in
beliebiger Reihenfolge laufen.

## Was die Suite aktuell abdeckt

- `test_security.py` – Sicherheitsheader, Rate-Limiter (Blockieren nach
  Maximalzahl, Trennung nach Client-IP)
- `test_moderator_auth.py` – Login (richtig/falsch/unbekannt), Rate-Limiting
  auf den Login-Endpunkt, Admin- vs. Gruppenführer-Rechte
- `test_barcode_auth.py` – Barcode-Scan (gültig/unbekannt/abgelaufen),
  Rate-Limiting auf den Barcode-Endpunkt
- `test_dienststunden_schwellenwert.py` – Schwellenwert-Überschreitungsliste,
  Stunden-Übernahme reduziert/entfernt den Überschuss, Endpunkte erfordern
  Moderator-Login
- `test_update_kanal.py` – Update-Status/Kanal-Endpunkte (Admin-only, Default
  "stable", Umschalten auf "beta", ungültiger Kanal wird abgelehnt). Ruft die
  echte GitHub-Releases-API auf (kein Mock) – braucht Internetzugang beim
  Testlauf.
- `test_sentry_setup.py` – feste DSN-Konstante wird standardmäßig verwendet,
  per .env überschreibbar (auch auf leer zum zuverlässigen Ausschalten),
  initialisiert nur bei Zustimmung der Instanz (app_config)
- `test_setup.py` – POST /setup mit dem tatsächlichen Frontend-Payload
  (Regressionstest für den behobenen geofence-Pflichtfelder-Bug), Login nach
  Einrichtung, zweiter Setup-Versuch wird abgelehnt (409)
- `test_email_html.py` – HTML-Mail-Rendering (Organisation/Text/Logo aus
  app_config, Autoescaping gegen HTML-Injection über z. B. Organisationsname),
  `EmailNotifier._versenden()` baut multipart mit Text- UND HTML-Alternative
  (SMTP-Versand gemockt, kein echter Netzwerkzugriff)
- `test_buchung_aktion.py` – Annehmen/Ablehnen-Buttons in der
  Buchungsanfrage-Mail: Token wird bei Anfrage erzeugt, Aktion ändert den
  Buchungsstatus, zweite Aktion nach bereits getroffener Entscheidung ändert
  nichts mehr, abgelaufener/ungültiger Token wird erkannt (404)

Das ist **kein** vollständiger Abdeckungsanspruch über die ganze App,
sondern bewusst der sicherheitskritische und zuletzt geänderte Teil. Die
Suite wächst mit jeder Änderung weiter (siehe unten).

## Pflicht bei Code-Änderungen

**Wenn du als Claude (oder als Mensch) Backend-Verhalten änderst, neue
Endpunkte hinzufügst oder einen Bug fixst, ergänze oder passe die
zugehörigen Tests in `backend/tests/` in derselben Änderung an** – nicht
nachträglich, nicht "wenn Zeit ist". Diese Datei (`TESTS.md`) muss dabei
mit aktualisiert werden, wenn sich der Umfang der Suite (neue Testdatei,
neue abgedeckte Fläche) ändert, damit die Liste oben den tatsächlichen
Stand widerspiegelt. Ein Feature ohne zugehörigen Test gilt für dieses
Projekt als unfertig.

Vor jedem Deploy: `pytest` muss grün sein. Bei einer Regression zuerst
einen fehlschlagenden Test schreiben, der den Bug reproduziert, dann fixen.
