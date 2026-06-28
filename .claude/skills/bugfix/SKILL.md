---
name: bugfix
description: Behebt Bugs in Gerätehaus.app systematisch durch Ursachenanalyse, minimale Änderung und Regressionstest.
---

# Bugfix

Verwende diesen Skill, wenn ein Fehler analysiert, reproduziert und behoben werden soll.

## Vor jeder Änderung

1. Ursache finden.
2. Ursache kurz erklären.
3. Ähnliche Stellen im Code suchen.
4. Prüfen, ob ein bestehendes Pattern verletzt wurde.
5. Reproduktion oder Regressionstest planen.

## Umsetzung

- Führe die kleinste mögliche Änderung durch.
- Vermeide unnötige Refactorings.
- Halte dich an bestehende Projektpatterns.
- Passe nur Dateien an, die zur Fehlerbehebung notwendig sind.

## Tests

- Schreibe bei Regressionen zuerst einen fehlschlagenden Test.
- Ergänze oder aktualisiere Backend-Tests, wenn Verhalten geändert wird.
- Führe relevante Tests aus.

## Abschluss

Prüfe vor Abschluss:

- Ist der Bug nachvollziehbar behoben?
- Gibt es einen Regressionstest?
- Sind ähnliche Stellen ebenfalls geprüft?
- Muss Dokumentation ergänzt werden?
- Muss `LESSONS.md` ergänzt werden?
