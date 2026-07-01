# Datenbank

PostgreSQL, SQLAlchemy 2.0 (async), Alembic. Modelle in `backend/app/models/`,
Migrationen in `backend/alembic/versions/`. Übergeordnet: `.claude/architecture.md`.

## Migrationen

- Fortlaufend nummeriert: `NNNN_beschreibung.py` (aktuell bis `0034_*`).
- Jede neue Tabelle **und** jedes neue Feld braucht eine Migration; nummeriere
  strikt fortlaufend und setze `down_revision` auf die vorherige.
- PostgreSQL-spezifische Features werden bewusst genutzt: `JSONB` (Migration
  `0007_json_zu_jsonb`), `INSERT ... ON CONFLICT` (Config-Seeding), Cascade-FKs
  (`0023_person_fk_cascade`). **Deshalb kein SQLite** – auch nicht in Tests.
- Neue Modelle in `app/models/__init__.py` importieren/exportieren, damit
  Alembic-Autogenerate sie über `Base.metadata` findet.

## Wichtige Tabellen/Modelle

| Bereich | Modelle (Tabellen) |
| --- | --- |
| Konfiguration | `AppConfig` (`app_config`) |
| Personen | `Person`, `PersonEreignis` (Timeline), `PersonPunkt`, `PersonBildReservierung`, `NamensAbweichung` |
| Moderator | `Moderator` (Feld `rolle`: `admin` / Gruppenführer) |
| Einsätze | `Einsatz`, `EinsatzPerson`, `EinsatzEreignis` (Timeline), `EinsatzFeldDefinition` |
| Dienstbuch | `Dienstbuch`, `DienstbuchPerson`, `DienstbuchReservierung` |
| Dienststunden | `Dienststunden`, `DienststundenReservierung`, `DienststundenUebernahme` |
| Fahrzeuge/Buchung | `Fahrzeug`, `FahrzeugBuchung`, `FahrzeugbuchungReservierung`, `FahrzeugToken` |
| Sitzplätze | `SitzplatzReservierung` |
| Funktionen/Gruppen | `FunktionEinsatz`, `FunktionDienststunden`, `Gruppe` |
| Tokens | `BarcodeToken`, `KioskToken`, `BuchungAktionToken`, `MitgliedLoginReservierung` |
| Push/Divera | `PushSubscription`, `DiveraVorschlag` |

## Konventionen

- Gemeinsame Spalten über Mixins (`app/models/mixins.py`, z. B. `TimestampMixin`).
- Personenbezogene Kindtabellen mit `ondelete="CASCADE"` an `personen.id`.
- Zeitstempel als `DateTime(timezone=True)` mit `server_default=func.now()`.
- Kommazahlen (z. B. Punkte je Stunde) als `Float`.
- `app_config`-Werte werden nur über `config_service` gelesen/geschrieben, nie
  direkt (siehe `.claude/docs/backend.md`).

## Migrationen ausführen

```bash
cd backend
alembic upgrade head      # neueste Migration anwenden
alembic revision -m "..." # neue (leere) Migration; Nummer fortlaufend vergeben
```
