Arbeite zunächst ausschließlich im Analysemodus.

Bitte ändere keine Dateien.

Ziel:
Prüfe das gesamte Projekt `geratehaus-app` gegen die vorhandene `.claude`-Struktur. Ich möchte wissen, ob die Skills, Agents und Dokumentationsdateien wirklich zum aktuellen Programmcode passen und was fehlt.

Nutze vorhandene Skills und Agents, falls verfügbar:

* `architecture-planner`
* `project-reviewer`
* `test-auditor`
* `geraetehaus-patterns`
* `planner`
* `review`
* `tests`
* `knowledge-management`

Prüfe insbesondere:

1. Projektstruktur

   * Backend-Struktur
   * Frontend-Struktur
   * Datenbank/Migrationen
   * Services
   * Router
   * Schemas
   * Models
   * Tests
   * Config-System
   * Berechtigungen
   * Benachrichtigungen
   * Timeline/Punkte, falls vorhanden

2. `.claude`-Ordner

   * `.claude/CLAUDE.md`, falls vorhanden
   * `.claude/architecture.md`
   * `.claude/docs/*.md`
   * `.claude/skills/*/SKILL.md`
   * `.claude/agents/*.md`

3. Abgleich Code gegen Dokumentation
   Erstelle eine Tabelle:

   * Bereich
   * Im Code gefunden
   * In `.claude` dokumentiert?
   * Fehlt?
   * Veraltet?
   * Empfehlung

4. Abgleich Dokumentation gegen Code
   Prüfe, ob `.claude` Regeln enthält, die im Code nicht stimmen oder zu allgemein sind.

5. Fehlende Projektregeln
   Welche Regeln sollten in `CLAUDE.md`, `architecture.md`, `docs/*.md`, `EXAMPLES.md` oder `LESSONS.md` ergänzt werden?

6. Test- und Qualitätscheck
   Welche Testbefehle sind für dieses Projekt relevant?
   Welche Tests fehlen wahrscheinlich?
   Welche Projektbereiche sind besonders regressionsempfindlich?

Gib am Ende aus:

1. Kurzfazit
2. Gefundene Projektarchitektur
3. Fehlende oder leere `.claude`-Dokumentation
4. Veraltete oder ungenaue Regeln
5. Konkrete Vorschläge für neue Inhalte
6. Priorisierte To-do-Liste
7. Dateien, die du im nächsten Schritt ändern würdest

Nochmals: In diesem Schritt keine Dateien ändern.



________________________________________________________________________________________________________________________________

Setze jetzt die vorgeschlagenen Verbesserungen nur im `.claude`-Ordner um.

Wichtig:

* Keine Produktionsdateien ändern.
* Keine Backend-Dateien ändern.
* Keine Frontend-Dateien ändern.
* Keine Tests ändern.
* Nur `.claude`-Dokumentation, Skills, Agents und Projekthinweise anpassen.
* Inhalte müssen aus dem tatsächlichen Code abgeleitet sein, nicht geraten.

Aktualisiere, falls sinnvoll:

* `.claude/CLAUDE.md`
* `.claude/architecture.md`
* `.claude/docs/backend.md`
* `.claude/docs/frontend.md`
* `.claude/docs/database.md`
* `.claude/docs/api.md`
* `.claude/docs/permissions.md`
* `.claude/docs/notifications.md`
* `.claude/docs/timeline.md`
* `.claude/docs/glossary.md`
* `.claude/skills/geraetehaus-patterns/EXAMPLES.md`
* `.claude/skills/knowledge-management/LESSONS.md`
* `.claude/agents/*.md`

Achte darauf:

1. `CLAUDE.md` soll die wichtigsten globalen Projektregeln enthalten.
2. `architecture.md` soll die echte Projektarchitektur beschreiben.
3. `docs/*.md` sollen konkrete, codebasierte Details enthalten.
4. Skills sollen allgemeine wiederverwendbare Arbeitsweisen enthalten.
5. Agents sollen klare Rollen und Tool-Grenzen haben.
6. Keine doppelten Inhalte erzeugen.
7. Keine temporären Aufgaben in Architekturdocs schreiben.
8. Keine lokalen Pfade, Secrets oder Testpasswörter dokumentieren.

Nach den Änderungen:

* Zeige `git diff -- .claude`
* Fasse zusammen, welche Dateien geändert wurden.
* Liste offene Punkte auf, die noch manuell geprüft werden sollten.

________________________________________________________________________________________________________________________________

Arbeite gezielt an der alten `todo.md` im Hauptordner und am bestehenden Backlog unter `.claude/docs/backlog.md`.

Ziel:
Die alte `todo.md` ist veraltet und soll sauber in den Claude-Code-Todo-Workflow überführt werden.

Wichtig:

* Keine Produktionsdateien ändern.
* Kein Backend ändern.
* Kein Frontend ändern.
* Keine Tests ändern.
* Nur Aufgaben-/Claude-Dokumentation bearbeiten.
* Die aktive Backlog-Datei ist ausschließlich `.claude/docs/backlog.md`.
* Keine Aufgaben direkt in `.claude/skills/todo/SKILL.md` schreiben.
* Der Skill beschreibt nur den Workflow, der Backlog enthält die echten Aufgaben.

Bitte gehe so vor:

1. Lies die alte `todo.md` im Hauptordner.
2. Lies den bestehenden Backlog:

   * `.claude/docs/backlog.md`
3. Lies den Todo-Skill:

   * `.claude/skills/todo/SKILL.md`

Dann führe die Inhalte aus `todo.md` sinnvoll in `.claude/docs/backlog.md` zusammen.

Beim Überführen:

* Doppelte Aufgaben zusammenführen.
* Bereits im Backlog vorhandene Aufgaben nicht doppelt anlegen.
* Offensichtlich erledigte Aufgaben nicht in den aktiven Backlog übernehmen.
* Unklare oder veraltete Aufgaben in einen Abschnitt `## Zu prüfen` verschieben.
* Reine Notizen ohne konkrete Aufgabe nicht als Aufgabe übernehmen.
* Große Aufgaben in kleinere Teilaufgaben zerlegen.
* Passende Priorität ableiten: Hoch, Mittel oder Niedrig.
* Passende Kategorie ableiten:

  * Bug
  * Feature
  * Neues Modul
  * Datenbank
  * Frontend
  * Backend
  * Tests
  * Dokumentation
  * Wartung
* Passende Skills je Aufgabe zuordnen.

Nutze für neue oder überarbeitete Aufgaben dieses Format:

```md
## <Aufgabentitel>

- Status: Backlog
- Priorität: Hoch | Mittel | Niedrig
- Kategorie: Bug | Feature | Neues Modul | Datenbank | Frontend | Backend | Tests | Dokumentation | Wartung
- Skills:
  - todo
  - planner
  - review
- Beschreibung:
- Akzeptanzkriterien:
- Notizen:
```

Aktualisiere anschließend `.claude/skills/todo/SKILL.md`, falls nötig, sodass dort eindeutig steht:

* Backlog-Datei: `.claude/docs/backlog.md`
* echte Aufgaben gehören in `.claude/docs/backlog.md`
* `SKILL.md` enthält nur Workflow-Regeln
* alte/unklare Aufgaben gehören in den Abschnitt `Zu prüfen`
* erledigte Aufgaben werden nicht wieder als aktive Aufgaben aufgenommen

Wenn alle sinnvollen Inhalte aus `todo.md` übernommen wurden:

* Verschiebe `todo.md` nach `.claude/docs/todo-archive.md`
* Oben im Archiv kurz vermerken, dass die aktiven Aufgaben jetzt in `.claude/docs/backlog.md` liegen

Danach bitte prüfen:

```bash
git status
git diff -- todo.md .claude/docs/backlog.md .claude/docs/todo-archive.md .claude/skills/todo/SKILL.md
```

Wenn die Änderungen sinnvoll sind, bitte committen.

Wichtig beim Staging:
Nutze ausdrücklich auch diesen Befehl, damit Git die verschobene oder gelöschte alte Datei korrekt erkennt:

```bash
git add todo.md .claude/docs/todo-archive.md
```

Zusätzlich die geänderten Claude-Dateien stagen:

```bash
git add .claude/docs/backlog.md .claude/skills/todo/SKILL.md
```

Dann committen:

```bash
git commit -m "Migrate old todo into Claude backlog"
```

Anschließend bitte einen Pull Request erstellen.

Wenn GitHub CLI verfügbar und angemeldet ist, nutze:

```bash
git push -u origin claude/migrate-old-todo

gh pr create \
  --title "Migrate old todo into Claude backlog" \
  --body "## Summary
- migrates relevant items from the old root todo.md into .claude/docs/backlog.md
- archives the old todo.md as .claude/docs/todo-archive.md
- updates the todo skill to reference the Claude backlog workflow

## Scope
- Claude documentation only
- no backend changes
- no frontend changes
- no test changes

## Review notes
Please check whether all migrated tasks are still relevant and whether anything in the 'Zu prüfen' section should be clarified or removed."
```

Falls `gh` nicht verfügbar oder nicht angemeldet ist:

* Push den Branch trotzdem:

  ```bash
  git push -u origin claude/migrate-old-todo
  ```
* Gib mir danach den GitHub-Link aus, über den ich den PR manuell erstellen kann.

Am Ende bitte ausgeben:

1. Welche Aufgaben übernommen wurden
2. Welche Aufgaben zusammengeführt wurden
3. Welche Aufgaben als erledigt/veraltet erkannt wurden
4. Welche Aufgaben in `Zu prüfen` gelandet sind
5. Welche Dateien geändert wurden
6. Commit-Hash
7. PR-Link oder Hinweis, warum kein PR erstellt werden konnte
