# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

# Gerätehaus.app

Gerätehaus.app ist eine selbst gehostete Progressive Web App (PWA) für Feuerwehren und ähnliche Organisationen.

Sie dient zur Verwaltung von:

* Einsätzen
* Dienstbüchern
* Dienststunden
* Fahrzeugbuchungen
* Mitgliederverwaltung
* Reservierungen
* Benachrichtigungen

Die Anwendung besteht aus einem FastAPI-Backend und einem React/TypeScript-Frontend.

---

# Grundprinzipien

Bei jeder Änderung gelten folgende Regeln:

* Bestehende Patterns wiederverwenden.
* Änderungen möglichst klein halten.
* Keine unnötigen Refactorings.
* Neue Funktionen müssen sich nahtlos in die bestehende Architektur einfügen.
* Keine neuen Bibliotheken ohne ausdrückliche Zustimmung.
* Deutsche Domänensprache verwenden.

---

# Projektstruktur

```
backend/
```

FastAPI, SQLAlchemy, Alembic und Businesslogik.

```
frontend/
```

React, TypeScript und Vite.

```
.claude/
```

Projektwissen, Dokumentation und Claude-Code-Skills.

---

# Dokumentation

Nutze für Detailinformationen die passende Dokumentation.

| Thema              | Dokument                        |
| ------------------ | ------------------------------- |
| Gesamtarchitektur  | `.claude/architecture.md`       |
| Backend            | `.claude/docs/backend.md`       |
| Frontend           | `.claude/docs/frontend.md`      |
| Datenbank          | `.claude/docs/database.md`      |
| REST API           | `.claude/docs/api.md`           |
| Berechtigungen     | `.claude/docs/permissions.md`   |
| Benachrichtigungen | `.claude/docs/notifications.md` |
| Timeline           | `.claude/docs/timeline.md`      |
| Deployment         | `.claude/docs/deployment.md`    |
| Fachbegriffe       | `.claude/docs/glossary.md`      |

---

# Skills

Nutze vorhandene Skills, wenn sie zur Aufgabe passen.

| Skill                | Zweck                                            |
| -------------------- | ------------------------------------------------ |
| planner              | Analysiert Aufgaben und erstellt Umsetzungspläne |
| geraetehaus-patterns | Entwicklungsrichtlinien und Projektkonventionen  |
| knowledge-management | Pflegt Projektdokumentation                      |
| todo                 | Verwaltet Aufgaben                               |
| bugfix               | Systematische Fehleranalyse                      |
| review               | Prüft Änderungen anhand der Projektstandards     |

Bevor neue Regeln eingeführt werden, prüfen, ob bereits ein passender Skill existiert.

---

# Arbeitsweise

Vor jeder größeren Änderung:

1. Bestehende Implementierungen analysieren.
2. Ähnliche Patterns suchen.
3. Architektur verstehen.
4. Einen kurzen Plan erstellen.
5. Erst danach implementieren.

Während der Implementierung:

* Nur betroffene Dateien ändern.
* Bestehende Patterns übernehmen.
* Keine unnötigen Umstrukturierungen.
* Änderungen möglichst klein halten.

Nach der Implementierung:

* Tests durchführen.
* Build prüfen.
* Dokumentation aktualisieren, falls erforderlich.

---

# Dokumentationspflege

Während der Entwicklung prüfen:

* Entsteht ein neues wiederverwendbares Pattern?
* Entsteht eine neue Architekturentscheidung?
* Entsteht eine wichtige Erkenntnis?
* Muss bestehende Dokumentation ergänzt werden?

Die Pflege erfolgt über den Skill `knowledge-management`.

---

# Projektkonventionen

Die eigentlichen Projektkonventionen befinden sich im Skill:

`skills/geraetehaus-patterns`

Architekturentscheidungen befinden sich in:

`.claude/architecture.md`

Bitte diese Dokumente bevorzugen, anstatt Regeln mehrfach zu definieren.

---

# Qualität

Backendänderungen:

* Passende Tests ergänzen oder aktualisieren.
* Migrationen erstellen, wenn Datenbankänderungen erfolgen.

Frontendänderungen:

* `npm run build` muss erfolgreich sein.

Backend:

* `pytest`
* `ruff check`

Vor Abschluss prüfen, dass keine bestehenden Funktionen unbeabsichtigt beeinflusst wurden.

---

# Ziel

Gerätehaus.app soll über alle Module hinweg konsistent bleiben.

Neue Funktionen sollen vorhandene Patterns wiederverwenden, sauber dokumentiert sein und sich in die bestehende Architektur einfügen.
