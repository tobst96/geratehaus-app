---
name: todo
description: Verwaltet Projektaufgaben für Gerätehaus.app, priorisiert neue Aufgaben, zerlegt große Arbeiten und pflegt den Backlog.
user-invocable: true
---

# Todo Manager

Verwende diesen Skill, wenn neue Aufgaben genannt, Aufgaben priorisiert oder der Aufgabenstatus geprüft werden soll.

## Neue Aufgabe

Wenn eine neue Aufgabe erstellt wird:

1. Aufgabe analysieren.
2. Priorität vergeben.
3. Kategorie erkennen.
4. Passende Skills auswählen.
5. Große Aufgaben in Teilaufgaben zerlegen.
6. Aufgabe in `.claude/docs/backlog.md` eintragen.

## Status

Aufgaben besitzen folgende Stati:

- Backlog
- Planung
- In Bearbeitung
- Review
- Erledigt
- Archiviert

## Priorität

Verwende einfache Prioritäten:

- Hoch
- Mittel
- Niedrig

Priorität hoch, wenn:

- Sicherheit betroffen ist
- produktive Nutzung blockiert ist
- Datenverlust droht
- ein kritischer Bug vorliegt

## Kategorien

Mögliche Kategorien:

- Bug
- Feature
- Neues Modul
- Datenbank
- Frontend
- Backend
- Tests
- Dokumentation
- Wartung

## Skill-Zuordnung

Ordne automatisch passende Skills zu.

Beispiele:

| Aufgabe | Passende Skills |
| --- | --- |
| Bug | `bugfix`, `tests`, `review` |
| Neues Modul | `planner`, `new-module`, `geraetehaus-patterns`, `tests` |
| Größeres Feature | `planner`, `geraetehaus-patterns`, `tests`, `review` |
| Review | `review` |
| Neue Tests | `tests` |
| Dokumentation | `knowledge-management` |

## Backlog-Eintrag

Ein Backlog-Eintrag soll enthalten:

```md
## <Titel>

- Status:
- Priorität:
- Kategorie:
- Skills:
- Beschreibung:
- Akzeptanzkriterien:
- Notizen:
```

## Nach Abschluss

Nach jeder erledigten Aufgabe prüfen:

- Neues Pattern? → `EXAMPLES.md`
- Neue Erkenntnis? → `LESSONS.md`
- Neue Projektregel? → `CLAUDE.md`
- Architekturwissen? → `.claude/architecture.md` oder `.claude/docs/`
