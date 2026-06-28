---
name: knowledge-management
description: Pflegt langlebiges Projektwissen für Gerätehaus.app in EXAMPLES.md, LESSONS.md, CLAUDE.md und Architekturdocs, wenn neue Patterns oder Erkenntnisse entstehen.
---

# Knowledge Management

Verwende diesen Skill, wenn während Planung, Implementierung, Bugfixing oder Review neues dauerhaft relevantes Projektwissen entsteht.

## Ziel

Das Projektwissen soll kontinuierlich wachsen, ohne temporäre oder doppelte Informationen zu sammeln.

## Wann dokumentieren?

Dokumentiere nur Wissen, das langfristig hilfreich ist.

Geeignet:

- wiederverwendbare Patterns
- wiederkehrende Stolperfallen
- Architekturentscheidungen
- wichtige Projektregeln
- Test- oder Deployment-Erkenntnisse

Nicht geeignet:

- einmalige Zwischenschritte
- temporäre TODOs
- erledigte Detaildiskussionen
- Informationen, die nur für den aktuellen Prompt relevant sind

## EXAMPLES.md

Wenn ein neues wiederverwendbares Pattern entsteht:

1. Prüfen, ob es bereits dokumentiert ist.
2. Falls nicht vorhanden, ergänzen.
3. Keine Duplikate erzeugen.
4. Beispiele knapp und generalisierbar halten.

## LESSONS.md

Wenn eine neue Erkenntnis entsteht, dokumentiere:

- Problem
- Ursache
- Lösung
- Begründung

Nur ergänzen, wenn die Erkenntnis langfristig hilfreich ist.

## CLAUDE.md

Nur dauerhaft gültige Projektregeln ergänzen.

Beispiele:

- globale Architekturregeln
- dauerhaft gültige Arbeitsweisen
- wichtige Projektkonventionen

Keine temporären Informationen in `CLAUDE.md` eintragen.

## Architekturdocs

Wenn sich Architekturwissen konkretisieren lässt, prüfe die passenden Dateien:

- `.claude/architecture.md`
- `.claude/docs/backend.md`
- `.claude/docs/frontend.md`
- `.claude/docs/database.md`
- `.claude/docs/api.md`
- `.claude/docs/permissions.md`
- `.claude/docs/notifications.md`
- `.claude/docs/timeline.md`

## Abschlussprüfung

Vor Abschluss einer Aufgabe prüfen:

- Neues Pattern entstanden?
- Neue Erkenntnis entstanden?
- Neue Projektregel entstanden?
- Architekturdocs betroffen?
- Dokumentation aktualisiert oder bewusst nicht nötig?
