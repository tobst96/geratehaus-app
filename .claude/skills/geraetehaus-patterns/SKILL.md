---
name: geraetehaus-patterns
description: Nutze diesen Skill bei Implementierungen in Gerätehaus.app, damit neue Features bestehende Architektur-, Backend-, Frontend-, Config-, Test- und Dokumentationspatterns einhalten.
---

# Gerätehaus.app Patterns

Dieses Projekt besitzt eine einheitliche Architektur. Neue Features sollen sich nahtlos in den bestehenden Code einfügen.

## Grundregeln

- Bestehende Patterns übernehmen.
- Keine neue Architektur erfinden.
- Änderungen möglichst klein halten.
- Nur den Scope der Aufgabe bearbeiten.
- Wiederverwendbare Logik nicht duplizieren.

## Arbeitsweise vor jeder Implementierung

1. Analysiere den bestehenden Code.
2. Suche nach ähnlichen Implementierungen.
3. Wiederverwende bestehende Patterns.
4. Erstelle einen kurzen Plan.
5. Beginne erst danach mit Änderungen.

## Backend

### Router

Router enthalten ausschließlich:

- Routing
- Authentifizierung
- Berechtigungen
- Requestvalidierung
- Aufruf eines Services
- Response-Erzeugung

Router enthalten keine Businesslogik.

### Services

Businesslogik gehört ausschließlich in Services.

Services dürfen:

- Daten lesen
- Daten schreiben
- `commit()` ausführen
- Benachrichtigungen auslösen
- Punkte vergeben
- Timeline-Einträge schreiben

Router dürfen das nicht.

### Models

Models bilden ausschließlich die Datenbank ab.

- Keine Businesslogik in Models.
- Keine impliziten Seiteneffekte in Models.

### Schemas

Pydantic-Schemas sind strikt von SQLAlchemy-Modellen getrennt.

- Response-Models niemals direkt aus ORM-Objekten zurückgeben, wenn berechnete Felder vorhanden sind.
- Personen immer über bestehende Helper wie `personen_zu_out()` konvertieren.

## Datenbank

Neue Tabellen benötigen immer:

- Alembic-Migration
- SQLAlchemy-Model
- Pydantic-Schema
- Service
- API
- Tests

Neue Felder benötigen immer:

- Migration
- Model-Anpassung
- Schema-Anpassung
- Frontend-Anpassung, falls sichtbar

Migrationen immer fortlaufend nummerieren.

## Konfiguration

Business-Konfiguration niemals direkt aus `.env` lesen.

Immer:

- `ConfigService` verwenden.
- Neue Config-Keys zusätzlich in `app/services/config_defaults.py` registrieren.

## Module

Jedes Modul besitzt dieselbe Grundarchitektur.

Backend:

- Router
- Service
- Model
- Schema

Frontend:

- Moderatorbereich
- Mitgliederbereich
- Kiosk, falls relevant

Konfiguration:

- `modul_<name>_aktiv`
- `modul_<name>_startseite`
- `modul_<name>_aussenzugriff`

Neue Module sollen sich identisch zu bestehenden Modulen verhalten.

## Authentifizierung und Berechtigungen

Vorhandene Dependencies verwenden.

Beispiele:

- `CurrentAdmin`
- `CurrentModerator`
- `CurrentPerson`

Keine eigenen Berechtigungsprüfungen implementieren, wenn passende Dependencies existieren.

Module zusätzlich über `require_modul_aktiv()` absichern.

## Benachrichtigungen

Benachrichtigungen niemals direkt versenden.

Immer:

- `notifier_service.benachrichtige()` verwenden.

## Punkte

Punkte niemals direkt in Tabellen schreiben.

Immer bestehende Services verwenden.

Bei neuen Features prüfen:

- Sind Punkte erforderlich?
- Ist ein Timeline-Eintrag erforderlich?

## Frontend

Frontend folgt vorhandenen Komponenten.

Wenn bereits vorhanden, wiederverwenden:

- Banner
- Ladeanzeige
- Formularfelder
- Kachel-Design
- Tabellen
- Dialoge

Keine neuen UI-Konzepte einführen, wenn ein vorhandenes Pattern ausreicht.

## CSS

- Keine unnötigen Inline-Styles.
- Bestehende CSS-Klassen wiederverwenden.
- Dark Mode berücksichtigen.
- Responsive Verhalten beibehalten.

## API

Neue Endpunkte orientieren sich an bestehenden APIs.

- Keine neue API-Struktur einführen.
- Bestehende Response-Formate und Fehlerbehandlung übernehmen.

## Reservierungen

Alle Reservierungsmodule folgen exakt diesem Ablauf:

```text
Reservierung erstellen
↓
QR-Code erzeugen
↓
Mitglied authentifiziert sich
↓
Vorschau
↓
Einlösen
```

Neue Reservierungsfunktionen müssen dieses Verhalten übernehmen.

## Timeline

Relevante Änderungen an Personen sollen als `PersonEreignis` protokolliert werden.

Vor jeder Implementierung prüfen:

- Ist ein Timeline-Eintrag notwendig?

## Tests

Backendänderungen benötigen Tests.

- Bugfixes benötigen Regressionstests.
- Neue Features benötigen mindestens einen Happy-Path-Test.
- Vor Abschluss relevante Tests ausführen.
- Vor potenziellem Deploy `pytest` und `npm run build` ausführen.

## Was vermieden werden soll

Nicht einführen:

- unnötige Refactorings
- neue Architektur ohne Notwendigkeit
- doppelte Logik
- Hardcodings
- Businesslogik im Router
- direkte Config-Zugriffe
- direkte Datenbankzugriffe aus dem Frontend

## Vor jeder Implementierung prüfen

Claude beantwortet zuerst folgende Fragen:

1. Gibt es bereits eine ähnliche Funktion?
2. Welche Dateien setzen dieses Pattern bereits um?
3. Kann bestehender Code wiederverwendet werden?
4. Muss das Frontend angepasst werden?
5. Muss das Backend angepasst werden?
6. Ist eine Migration erforderlich?
7. Sind Berechtigungen betroffen?
8. Sind Benachrichtigungen betroffen?
9. Sind Punkte betroffen?
10. Ist ein Timeline-Eintrag erforderlich?
11. Sind Tests notwendig?

Erst danach mit der Implementierung beginnen.

## Wissenspflege

Wenn während der Implementierung ein neues wiederverwendbares Pattern entsteht, das auch für zukünftige Aufgaben hilfreich ist:

- Prüfe, ob es bereits in `EXAMPLES.md` dokumentiert ist.
- Falls nicht, ergänze `EXAMPLES.md`.
- Dokumentiere nur allgemeingültige Patterns.
- Dokumentiere keine einmaligen Bugfixes oder projektspezifischen Sonderfälle.

Erkenntnisse aus der Entwicklung, Stolperfallen und Architekturentscheidungen gehören nicht in diesen Skill, sondern in den Skill `knowledge-management` und dort in `LESSONS.md`.

## Ziel

Gerätehaus.app soll über alle Module hinweg wie aus einem Guss wirken. Neue Funktionen orientieren sich immer an bestehenden Patterns und fügen sich in die vorhandene Architektur ein.
