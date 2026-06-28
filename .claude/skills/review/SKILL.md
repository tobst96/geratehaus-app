---
name: review
description: Prüft Änderungen in Gerätehaus.app auf Architektur, Lesbarkeit, Wiederverwendbarkeit, Sicherheit, Tests, Regressionen und Projektstandards.
---

# Gerätehaus.app Review

Verwende diesen Skill, wenn Änderungen geprüft werden sollen.

## Ziel

Prüfe jede Änderung anhand der Projektkonventionen und gib konkrete Verbesserungsvorschläge.

Keine Änderungen durchführen, wenn ausdrücklich nur ein Review gewünscht ist.

## Architektur

Prüfen:

- Wird ein bestehendes Pattern wiederverwendet?
- Wurde unnötig neue Architektur eingeführt?
- Liegt Businesslogik ausschließlich in Services?
- Sind Router frei von Businesslogik?
- Sind Models frei von Businesslogik?

## Lesbarkeit

Prüfen:

- Sind Namen verständlich?
- Ist der Code einfach nachvollziehbar?
- Gibt es unnötige Komplexität?
- Sind Funktionen sinnvoll geschnitten?

## Wiederverwendbarkeit

Prüfen:

- Wurde bestehender Code wiederverwendet?
- Gibt es duplizierte Logik?
- Sollte ein Helper oder Service genutzt werden?

## Datenbank

Falls Models oder Datenbankfelder geändert wurden:

- Migration vorhanden?
- Schema angepasst?
- API angepasst?
- Frontend angepasst?
- Tests ergänzt?

## Berechtigungen

Prüfen:

- Bestehende Dependencies verwendet?
- Modulprüfung mit `require_modul_aktiv()` vorhanden, falls nötig?
- Admin-, Moderator- und Mitgliederrechte korrekt getrennt?
- Außenzugriff oder Kiosk-Zugriff abgesichert?

## Konfiguration

Falls neue Config benötigt wird:

- `ConfigService` verwendet?
- `config_defaults.py` ergänzt?
- Keine direkte `.env`-Businesslogik?

## Timeline und Punkte

Prüfen:

- Ist ein Timeline-Eintrag erforderlich?
- Ist Punktevergabe erforderlich?
- Werden bestehende Services verwendet?

## Frontend

Prüfen:

- Bestehende Komponenten wiederverwendet?
- Responsive Verhalten beibehalten?
- Dark Mode berücksichtigt?
- Keine unnötigen Inline-Styles?
- Keine neuen UI-Konzepte ohne Notwendigkeit?

## Sicherheit

Prüfen:

- Eingaben validiert?
- Berechtigungen serverseitig geprüft?
- Keine sensiblen Daten im Frontend offengelegt?
- Keine Testdaten, Passwörter oder lokalen Pfade committed?

## Tests

Prüfen:

- Neue Tests vorhanden?
- Regressionen möglich?
- Kritische Fehlerfälle abgedeckt?
- Relevante Testbefehle genannt oder ausgeführt?

## Dokumentation

Prüfen, ob ergänzt werden sollte:

- `EXAMPLES.md`
- `LESSONS.md`
- `.claude/architecture.md`
- Dateien in `.claude/docs/`

## Ausgabeformat

Am Ende eine kurze Zusammenfassung geben:

1. Positiv
2. Auffälligkeiten
3. Risiken
4. Verbesserungsvorschläge
5. Empfehlung: freigeben, nachbessern oder blockieren
