---
name: review
description: Prüft Änderungen auf Einhaltung der Projektstandards von Gerätehaus.app.
---

# Gerätehaus.app Review

Prüfe jede Änderung anhand der Projektkonventionen.

## Architektur

- Wird ein bestehendes Pattern wiederverwendet?
- Wurde unnötig neue Architektur eingeführt?
- Liegt Businesslogik ausschließlich in Services?

## Datenbank

Falls Models geändert wurden:

- Migration vorhanden?
- Schema angepasst?
- API angepasst?
- Frontend angepasst?

## Berechtigungen

- Bestehende Dependencies verwendet?
- Modulprüfung (`require_modul_aktiv`) vorhanden?

## Konfiguration

Falls neue Config benötigt wird:

- ConfigService verwendet?
- config_defaults.py ergänzt?

## Timeline / Punkte

Prüfen ob

- Timeline-Eintrag erforderlich
- Punktevergabe erforderlich

## Frontend

- Bestehende Komponenten wiederverwendet?
- Responsive?
- Dark Mode berücksichtigt?

## Tests

- Neue Tests vorhanden?
- Regressionen möglich?

## Dokumentation

Prüfen ob

- EXAMPLES.md ergänzt werden sollte.
- LESSONS.md ergänzt werden sollte.
- architecture.md ergänzt werden sollte.

Am Ende eine kurze Zusammenfassung geben:

- Positiv
- Auffälligkeiten
- Verbesserungsvorschläge
