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
