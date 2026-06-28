---
name: geraetehaus-patterns
description: Projektweite Architektur- und Entwicklungsrichtlinien für Gerätehaus.app. Nutze diesen Skill bei jeder Implementierung oder Änderung bestehender Funktionen.
---

# Gerätehaus.app Patterns

## Ziel

Dieses Projekt besitzt eine einheitliche Architektur. Neue Features sollen sich nahtlos in den
bestehenden Code einfügen.

Es gilt:

- Bestehende Patterns übernehmen.
- Keine neue Architektur erfinden.
- Änderungen möglichst klein halten.
- Nur den Scope der Aufgabe bearbeiten.

---

# Arbeitsweise

Vor jeder Implementierung:

1. Analysiere den bestehenden Code.
2. Suche nach ähnlichen Implementierungen.
3. Wiederverwende bestehende Patterns.
4. Erstelle einen kurzen Plan.
5. Erst danach Änderungen durchführen.

---

# Backend

## Router

Router enthalten ausschließlich:

- Routing
- Authentifizierung
- Berechtigungen
- Requestvalidierung
- Aufruf eines Services
- Response

Keine Businesslogik.

---

## Services

Businesslogik gehört ausschließlich in Services.

Services dürfen:

- Daten lesen
- Daten schreiben
- commit() ausführen
- Benachrichtigungen auslösen
- Punkte vergeben
- Timeline schreiben

Router dürfen das nicht.

---

## Models

Models bilden ausschließlich die Datenbank ab.

Keine Businesslogik.

---

## Schemas

Pydantic-Schemas sind strikt von SQLAlchemy-Modellen getrennt.

ResponseModels niemals direkt aus ORM-Objekten zurückgeben,
wenn berechnete Felder vorhanden sind.

Personen immer über bestehende Helper wie
personen_zu_out()
konvertieren.

---

# Datenbank

Neue Tabellen benötigen immer:

- Alembic Migration
- SQLAlchemy Model
- Pydantic Schema
- Service
- API
- Tests

Neue Felder benötigen:

- Migration
- Model
- Schema
- Frontendanpassung (falls sichtbar)

Migrationen immer fortlaufend nummerieren.

---

# Konfiguration

Business-Konfiguration niemals aus .env lesen.

Immer:

ConfigService

verwenden.

Neue Config-Keys zusätzlich in

app/services/config_defaults.py

registrieren.

---

# Module

Jedes Modul besitzt dieselbe Architektur.

Backend

- Router
- Service
- Model
- Schema

Frontend

- Moderatorbereich
- Mitgliederbereich
- Kiosk

Konfiguration

- modul_<name>_aktiv
- modul_<name>_startseite
- modul_<name>_aussenzugriff

Neue Module sollen sich identisch verhalten.

---

# Authentifizierung

Vorhandene Dependencies verwenden.

Beispiele

- CurrentAdmin
- CurrentModerator
- CurrentPerson

Keine eigenen Berechtigungsprüfungen implementieren.

Module zusätzlich über

require_modul_aktiv()

absichern.

---

# Benachrichtigungen

Benachrichtigungen niemals direkt versenden.

Immer

notifier_service.benachrichtige()

verwenden.

---

# Punkte

Punkte niemals direkt in Tabellen schreiben.

Bestehende Services verwenden.

Neue Features prüfen immer:

- Punkte erforderlich?
- Timeline erforderlich?

---

# Frontend

Frontend folgt vorhandenen Komponenten.

Wenn bereits vorhanden:

- Banner
- Ladeanzeige
- Formularfelder
- Kachel-Design
- Tabellen
- Dialoge

diese wiederverwenden.

Keine neuen UI-Konzepte einführen.

---

# CSS

Keine unnötigen Inline-Styles.

Bestehende CSS-Klassen wiederverwenden.

Dark Mode berücksichtigen.

Responsive Verhalten beibehalten.

---

# API

Neue Endpunkte orientieren sich an bestehenden APIs.

Keine neue Struktur einführen.

---

# Reservierungen

Alle Reservierungsmodule folgen exakt diesem Ablauf.

Reservierung erstellen

↓

QR-Code erzeugen

↓

Mitglied authentifiziert sich

↓

Vorschau

↓

Einlösen

Neue Reservierungsfunktionen müssen dieses Verhalten übernehmen.

---

# Timeline

Relevante Änderungen an Personen sollen als PersonEreignis protokolliert werden.

Vor jeder Implementierung prüfen:

- Ist ein Timeline-Eintrag notwendig?

---

# Tests

Backendänderungen benötigen Tests.

Bugfixes benötigen Regressionstests.

Neue Features benötigen mindestens einen Happy-Path-Test.

Vor Abschluss immer:

- pytest
- npm run build

ausführen.

---

# Was vermieden werden soll

Nicht:

- unnötige Refactorings
- neue Architektur
- doppelte Logik
- Hardcodings
- Businesslogik im Router
- direkte Config-Zugriffe
- direkte Datenbankzugriffe aus dem Frontend

---

# Vor jeder Implementierung prüfen

Claude beantwortet zuerst folgende Fragen:

1. Gibt es bereits eine ähnliche Funktion?

2. Welche Dateien setzen dieses Pattern bereits um?

3. Kann bestehender Code wiederverwendet werden?

4. Muss Frontend angepasst werden?

5. Muss Backend angepasst werden?

6. Ist eine Migration erforderlich?

7. Sind Berechtigungen betroffen?

8. Sind Benachrichtigungen betroffen?

9. Sind Punkte betroffen?

10. Ist ein Timeline-Eintrag erforderlich?

11. Sind Tests notwendig?

Erst danach mit der Implementierung beginnen.

---

# Ziel

Gerätehaus.app soll über alle Module hinweg wie aus einem Guss wirken.

Neue Funktionen orientieren sich immer an bestehenden Patterns und fügen sich in die vorhandene Architektur ein.

# Wissenspflege

Wenn während der Implementierung ein neues wiederverwendbares Pattern entsteht, das auch für zukünftige Aufgaben hilfreich ist:

- prüfe, ob es bereits in EXAMPLES.md dokumentiert ist.
- falls nicht, ergänze EXAMPLES.md selbstständig.
- dokumentiere nur allgemeingültige Patterns.
- dokumentiere keine einmaligen Bugfixes oder projektspezifischen Sonderfälle.
