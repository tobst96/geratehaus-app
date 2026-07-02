# Timeline (Ereignisprotokolle)

Chronologische Ereignisprotokolle. Modelle in `backend/app/models/`.
Übergeordnet: `.claude/architecture.md`.

## Timeline (Ereignisprotokolle)

Zwei strukturgleiche Modelle bilden die grafische Timeline im Moderator-Bereich:

- `PersonEreignis` (`person_ereignisse`) – Ereignisse einer Person
  (z. B. Funktionswechsel, Anlage, Bildupload).
- `EinsatzEreignis` (`einsatz_ereignisse`) – Ereignisse eines Einsatzes (Anlage,
  Eintragungen inkl. Fehlversuche, Detail-Änderungen mit alt/neu, Abschluss,
  Wiedereröffnung, E-Mail-Versand).

Gemeinsame Felder: `zeitpunkt` (`DateTime(timezone=True)`, `server_default=now()`),
`typ` (`String(64)`), `beschreibung` (`Text`). FK mit `ondelete="CASCADE"`.

Regel: Relevante Änderungen als Ereignis protokollieren – **aus dem Service heraus**,
im selben Vorgang wie die Änderung. Vor jeder Implementierung prüfen: Ist ein
Timeline-Eintrag nötig?

## Regeln

- Ereignisse immer aus dem Service heraus protokollieren, nicht aus dem Router.
- Bei neuen Features prüfen: Ist ein Timeline-Eintrag nötig?
- Werte immer über `config_service` lesen, nicht hart kodieren.

> Hinweis: Das frühere Aktivitätspunkte-System (`PersonPunkt`) wurde vollständig
> entfernt (Migration 0039).
