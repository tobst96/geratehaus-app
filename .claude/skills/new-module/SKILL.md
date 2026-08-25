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

## Modul-Unterseite (Feature-Module)

Ein neues **Feature-Modul** (ein vom Admin schaltbares Funktionsmodul wie
Einsatztagebuch, Dienstbuch, Divera) braucht zwingend eine **eigene Unterseite
unter „Module"**. Modul-spezifische Einstellungen/Parameter gehören dorthin –
**nicht** in die zentrale `Einstellungen.tsx`.

Schritte:

- Modul in `backend/app/services/feature_modul_service.py` in `FEATURE_MODULE`
  registrieren (`key`, `name`, `mitgliederseitig`). `mitgliederseitig=True` nur,
  wenn es Kiosk-Anzeige und Außenzugriff haben soll (dann existieren
  `modul_<key>_startseite` / `_aussenzugriff`).
- Frontend: eigene Komponente unter
  `frontend/src/pages/moderator/module/<Name>Modul.tsx` anlegen, die die
  Einstellungen des Moduls bündelt (Laden/Speichern der Config-Keys über
  `holeEinstellungen` / `schreibeEinstellungen`).
- Diese Komponente in `frontend/src/pages/moderator/ModulUnterseite.tsx`
  (Dispatch per `:key`) einhängen. Die Route `/moderator/module/:key` besteht
  bereits.
- Übersicht (`Module.tsx`) und Nav-Untermenü (`ModeratorLayout.tsx`) zeigen aktive
  Module automatisch aus `feature_modul_service` – hier nichts hart kodieren.
- Die Sortierung liegt in `modul_reihenfolge`; deaktivierte Module verschwinden
  automatisch aus Navigation und Unterseiten-Liste.

Hinweis: Die **Berechtigungs-Module** (`modul_service` / `Modul`-Tabelle,
Rechte-Matrix) sind ein getrenntes Konzept – nicht mit den Feature-Modulen
vermischen.

## Konfiguration

Neue Module erhalten passende Config-Keys.

Typische Keys:

- `modul_<name>_aktiv` (immer)
- `modul_<name>_startseite` (nur mitgliederseitige Module – Kiosk-Kachel)
- `modul_<name>_aussenzugriff` (nur mitgliederseitige Module – Mitglieder-Login)

Neue Config-Keys in `app/services/config_defaults.py` registrieren. Modul-Reihenfolge
liegt zentral in `modul_reihenfolge`.

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

## Timeline

Vor der Umsetzung prüfen:

- Ist ein Timeline-Eintrag erforderlich?
- Gibt es Personenbezug (relevante Änderungen als `PersonEreignis` protokollieren)?

(Ein Punktesystem existiert nicht mehr – siehe Migration 0039.)

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
- Bei Feature-Modulen: Modul-Unterseite angelegt und in `feature_modul_service` + `ModulUnterseite.tsx` eingehängt.
- Config ist registriert.
- Berechtigungen sind geklärt.
- Neue Tabellen sind in `backup_service.KATEGORIEN` einer Kategorie zugeordnet
  (sonst schlägt `test_jede_sicherbare_tabelle_hat_eine_import_kategorie` fehl
  und die Daten wären beim selektiven Restore verloren – siehe Etappe AK/AL).
- Tests sind vorhanden.
- Dokumentation wurde geprüft.
- Keine unnötige neue Architektur wurde eingeführt.
