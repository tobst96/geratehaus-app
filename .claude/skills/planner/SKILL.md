---
name: planner
description: Analysiert größere Aufgaben in Gerätehaus.app vor der Umsetzung und erstellt einen kurzen, risikobewussten Implementierungsplan ohne Codeänderungen.
---

# Planner

Verwende diesen Skill vor größeren Änderungen, neuen Features, neuen Modulen, Datenbankänderungen oder riskanten Refactorings.

## Ziel

Vor der Implementierung soll klar sein:

- was geändert werden muss
- welche Dateien betroffen sind
- welche bestehenden Patterns relevant sind
- welche Risiken bestehen
- welche Tests notwendig sind

## Analyse

Vor jeder größeren Änderung:

1. Code lesen.
2. Ähnliche Funktionen suchen.
3. Betroffene Dateien finden.
4. Bestehende Patterns identifizieren.
5. Risiken erkennen.
6. Offene Fragen notieren.

In dieser Phase keine Änderungen durchführen.

## Planung

Große Aufgaben in kleine Teilaufgaben zerlegen.

Typische Bereiche:

- Backend
- Frontend
- Migration
- API
- Berechtigungen
- Konfiguration
- Benachrichtigungen
- Punkte
- Timeline
- Tests
- Dokumentation
- Review

## Ausgabe

Der Plan beschreibt knapp:

- Reihenfolge
- Aufwand
- Risiken
- betroffene Dateien
- benötigte Tests
- Dokumentationsbedarf

## Abschluss der Planung

Erst nach dem Plan implementieren.

Wenn die Aufgabe klein und eindeutig ist, den Plan kurz halten.
