---
name: geraetehaus-patterns
description: Architektur- und Entwicklungsrichtlinien für Gerätehaus.app. Nutze diesen Skill immer vor Änderungen am Projekt, um bestehende Muster konsequent einzuhalten.
---

# Gerätehaus.app – Projektkonventionen

Dieses Projekt folgt einer sehr konsequenten Architektur. Neue Funktionen sollen bestehende
Muster übernehmen und keine neuen Architekturen oder Sonderlösungen einführen.

---

# Grundprinzipien

- Bevor neuer Code geschrieben wird, immer nach einer ähnlichen bestehenden Umsetzung suchen.
- Bestehende Patterns wiederverwenden statt neue einzuführen.
- Änderungen möglichst klein halten.
- Keine Refactorings außerhalb des eigentlichen Scopes.
- Keine neuen Abhängigkeiten ohne ausdrückliche Freigabe.
- Deutsche Domänensprache verwenden (Einsatz, Dienstbuch, Person, Gruppe, Funktion usw.).

---

# Backend

## Router

Router enthalten ausschließlich:

- Request entgegennehmen
- Berechtigungen
- Validierung
- Service aufrufen
- Response zurückgeben

Keine Businesslogik im Router.

---

## Services

Die komplette Businesslogik gehört in Services.

Services

- lesen Daten
- schreiben Daten
- führen commit() aus
- erzeugen Timeline-Einträge
- verschicken Benachrichtigungen
- vergeben Punkte

Nicht im Router.

---

## Models

SQLAlchemy Models bilden ausschließlich die Datenbank ab.

Keine Businesslogik.

---

## Schemas

Pydantic-Schemas sind strikt von ORM-Modellen getrennt.

ResponseModelle niemals direkt aus ORM-Objekten zurückgeben, wenn berechnete Felder vorhanden sind.

Bei Personen immer prüfen, ob `personen_zu_out()` verwendet werden muss.

---

# Datenbank

Neue Tabellen benötigen immer:

- Alembic Migration
- SQLAlchemy Model
- Schema
- Service
- API
- Tests

Neue Felder benötigen immer:

- Migration
- Model
- Schema
- Frontendanpassung (falls sichtbar)

Migrationen werden fortlaufend nummeriert.

---

# Konfiguration

Business-Konfiguration niemals aus `.env` lesen.

Immer:

ConfigService

Neue Keys immer zusätzlich in

app/services/config_defaults.py

registrieren.

---

# Module

Alle Module folgen derselben Struktur.

Backend

- Router
- Service
- Model
- Schema

Frontend

- Moderator
- Mitglieder
- Kiosk

Konfiguration

- modul_<name>_aktiv
- modul_<name>_startseite
- modul_<name>_aussenzugriff

Neue Module sollen sich wie bestehende Module verhalten.

---

# Berechtigungen

Moderatorrechte niemals direkt prüfen.

Immer bestehende Dependencies verwenden.

Beispiele:

- CurrentModerator
- CurrentAdmin
- CurrentPerson

Module immer zusätzlich über

require_modul_aktiv()

absichern.

---

# Benachrichtigungen

Benachrichtigungen niemals direkt verschicken.

Immer

notifier_service.benachrichtige()

verwenden.

---

# Punkte

Punkte niemals direkt in Tabellen schreiben.

Immer bestehende Services verwenden.

Timeline-Einträge und Punkte müssen konsistent bleiben.

---

# Frontend

Frontend folgt vorhandenen Komponenten.

Keine neuen UI-Konzepte einführen.

Wenn bereits ähnliche Komponenten existieren:

- Banner
- Ladeanzeige
- Formularfelder
- Kachel-Design

diese wiederverwenden.

---

# API

Keine direkten fetch()-Aufrufe verstreut einführen.

Bestehende API-Struktur verwenden.

Neue Endpunkte nach bestehendem Muster aufbauen.

---

# CSS

Keine unnötigen Inline-Styles.

Bestehende CSS-Klassen wiederverwenden.

Design an vorhandene Seiten anpassen.

Dark Mode berücksichtigen.

---

# Tests

Backendänderungen benötigen passende Tests.

Bugfixes benötigen Regressionstests.

Neue Features benötigen mindestens einen Happy-Path-Test.

Bestehende Tests dürfen nicht verschlechtert werden.

---

# Bekannte Projektmuster

## Reservierungen

Alle Reservierungsmodule folgen demselben Ablauf.

Reservierung

↓

QR-Code

↓

Mitgliederlogin

↓

Vorschau

↓

Einlösen

Neue Reservierungen müssen dieses Muster übernehmen.

---

## Timeline

Alle relevanten Änderungen an Personen sollen über bestehende Timeline-Ereignisse protokolliert werden.

Neue Features prüfen immer, ob ein PersonEreignis erforderlich ist.

---

## Punkte

Automatische Punktevergabe niemals doppelt implementieren.

Vorhandene Mechanismen wiederverwenden.

---

# Vor jeder Implementierung

Claude soll sich folgende Fragen beantworten:

1. Gibt es bereits eine ähnliche Funktion?

2. Welche Dateien setzen dieses Pattern bereits um?

3. Kann bestehender Code wiederverwendet werden?

4. Muss auch Frontend, API oder Migration angepasst werden?

5. Sind Berechtigungen korrekt?

6. Sind Benachrichtigungen betroffen?

7. Sind Punkte betroffen?

8. Ist eine Timeline erforderlich?

9. Werden Tests benötigt?

Erst danach mit der Implementierung beginnen.

---

# Ziel

Gerätehaus.app soll über alle Module hinweg einheitlich bleiben.

Lieber bestehende Patterns konsequent wiederverwenden als neue Lösungen entwickeln.
