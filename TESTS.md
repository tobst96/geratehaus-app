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
