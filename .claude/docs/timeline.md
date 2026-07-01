# Timeline & Punkte

Chronologische Ereignisprotokolle und das Aktivitätspunkte-System. Modelle in
`backend/app/models/`. Übergeordnet: `.claude/architecture.md`.

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

## Punkte (`PersonPunkt`)

`PersonPunkt` (`person_punkte`) – ein Aktivitätspunkt-Eintrag pro Anlass:

- `punkte: float` – Kommazahlen erlaubt (z. B. Punkte je Dienststunde, minutengenau).
  Der Person wird immer nur die gerundete Gesamtsumme angezeigt
  (`stammdaten_service.gesamtpunkte_batch`).
- `grund: str`, `gueltig_bis: date`, `erstellt_am`.
- `abbau_modus`: `"halten"` (voller Wert bis `gueltig_bis`, Standard) oder
  `"abziehend"` (linearer Abbau auf 0 exakt bei `gueltig_bis`).

Abgelaufene Punkte zählen nicht mehr zur Summe und werden vom täglichen
`punkte_ablauf`-Job entfernt (`app/jobs/scheduler.py`).

### Vergaberegeln (konfigurierbar, `config_defaults.py`)

Je Anlass drei Keys `punkte_<anlass>_punkte` / `_tage` / `_modus`:
`anlage`, `profilbild`, `email`, `einsatz`, `dienstbuch`, `dienststunden`.
Beispiele: `punkte_einsatz_punkte` (je Teilnahme bei Abschluss – bei
Wiedereröffnung zurückgenommen, bei erneutem Abschluss neu vergeben),
`punkte_dienststunden_punkte` (**pro Stunde**, minutengenau).

## Regeln

- Punkte **nie** direkt in die Tabelle schreiben – über die bestehenden Services.
- Bei neuen Features prüfen: Sind Punkte relevant? Ist ein Timeline-Eintrag nötig?
- Werte immer über `config_service` lesen, nicht hart kodieren.
