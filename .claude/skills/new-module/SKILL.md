---
name: new-module
description: Plant und implementiert neue Gerätehaus.app-Module nach der bestehenden Modularchitektur mit Backend, Frontend, Config, Tests und Dokumentation.
---

# Neues Modul

Verwende diesen Skill, wenn ein neues Modul in Gerätehaus.app geplant oder umgesetzt werden soll.

## Grundsatz

Ein neues Modul muss sich wie ein bestehendes Gerätehaus.app-Modul verhalten und dieselben Architekturpatterns verwenden.

Vor der Implementierung immer zuerst ähnliche Module im Code suchen.

## Backend

Ein neues Modul benötigt in der Regel:

- Router
- Service
- Model
- Schema
- Alembic-Migration
- Tests

Businesslogik gehört in den Service, nicht in den Router.

## Frontend

Ein neues Modul benötigt je nach Funktion:

- Route
- Navigation
- Mitgliederbereich
- Moderatorbereich
- Adminbereich
- Kiosk-Ansicht, falls relevant

Vorhandene UI-Komponenten und CSS-Patterns wiederverwenden.

## Konfiguration

Neue Module erhalten passende Config-Keys.

Typische Keys:

- `modul_<name>_aktiv`
- `modul_<name>_startseite`
- `modul_<name>_aussenzugriff`

Neue Config-Keys in `app/services/config_defaults.py` registrieren.

Config immer über `ConfigService` lesen.

## Berechtigungen

Bestehende Dependencies verwenden.

Beispiele:

- `CurrentAdmin`
- `CurrentModerator`
- `CurrentPerson`

Zusätzlich prüfen:

- Muss das Modul über `require_modul_aktiv()` abgesichert werden?
- Welche Rollen dürfen lesen?
- Welche Rollen dürfen schreiben?
- Gibt es Kiosk- oder Außenzugriff?
  - Kiosk-Aktionen mit Personenbezug: der Barcode-Scan ist eine **Einmal-Bestätigung**
    für genau eine Aktion, **kein Login** – Identität nur transient für die eine
    Buchung setzen, nicht persistent einloggen (Details/Begründung: `LESSONS.md`
    „Kiosk-Scan ist Bestätigung, kein Login").

## Benachrichtigungen

Falls das Modul Benachrichtigungen auslöst:

- nicht direkt versenden
- `notifier_service.benachrichtige()` verwenden
- vorhandene Benachrichtigungs-Patterns übernehmen

## Punkte und Timeline

Vor der Umsetzung prüfen:

- Sind Punkte relevant?
- Muss eine Punktevergabe erfolgen?
- Ist ein Timeline-Eintrag erforderlich?
- Gibt es Personenbezug?

## Tests

Neue Module benötigen Tests für mindestens:

- Happy Path
- Berechtigungen
- Modul deaktiviert
- wichtige Fehlerfälle
- Regressionen bei kritischem Verhalten

## Dokumentation

Nach der Umsetzung prüfen:

- Muss `EXAMPLES.md` ergänzt werden?
- Muss `LESSONS.md` ergänzt werden?
- Muss `.claude/architecture.md` ergänzt werden?
- Müssen Dateien in `.claude/docs/` ergänzt werden?

## Checkliste vor Abschluss

- Backend folgt bestehendem Pattern.
- Frontend folgt bestehendem Pattern.
- Config ist registriert.
- Berechtigungen sind geklärt.
- Tests sind vorhanden.
- Dokumentation wurde geprüft.
- Keine unnötige neue Architektur wurde eingeführt.
