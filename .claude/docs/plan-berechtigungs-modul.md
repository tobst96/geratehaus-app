# Umsetzungsplan: Granulare Berechtigungsverwaltung & Modul-System

Status: **In Umsetzung** – Phase 0 (Entscheidungen) + **Phase 1 umgesetzt** (Modul-
Registry, `module`-Tabelle, Admin-Seite „Module", Tests). Phasen 2–5 offen. Backlog-
Item: „Granulare, individuelle Berechtigungsverwaltung als eigenständiges Modul"
(`.claude/docs/backlog.md`). Umsetzung phasenweise auf diesem Feature-Branch mit PR,
**nicht** direkt auf `main`.

## 1. Ziel

Berechtigungen künftig **individuell pro Mitarbeiter und Modul** vergeben (statt
rollenbasiert), inkl. individuell konfigurierbarem Benachrichtigungsweg. Das Ganze als
eigenständiges, erweiterbares **Modul**, verwaltet über eine neue Einstellungsseite
„Module" mit einer Modul-Registry.

## 2. Ist-Zustand (relevant für den Umbau)

- **Rollenmodell:** Zugriff läuft über `Moderator.rolle` (`"admin"` vs. Gruppenführer)
  und die Dependencies `CurrentModerator` / `CurrentAdmin` (`app/api/deps.py`). Kiosk/
  Mitglieder nutzen `CurrentPerson` (Namens-Cookie), kein Account-Login.
- **Zwei Personenbegriffe:** `Moderator` (Login-Accounts, Moderator-Bereich) vs.
  `Person` (Personal/Mitglieder, per Barcode/PIN, ohne Account). Siehe
  `.claude/docs/permissions.md`.
- **Module:** aktuell implizit über Config-Keys `modul_<name>_aktiv/_startseite/
  _aussenzugriff` + `require_modul_aktiv(...)`. Keine `Module`-Tabelle/Registry.
- **Benachrichtigungen:** zentraler `notifier_service.benachrichtige()` mit Kanälen
  E-Mail/Telegram/WebPush; Empfänger global (`notifier_email_recipients`) bzw.
  per-Person-Opt-in. Kein per-Mitarbeiter-Kanal.

## 3. Grundsatzentscheidungen

**Vom Nutzer entschieden (2026-07-02):**

1. **Berechtigungen = pro `Moderator`-Zugang.** Die individuelle Modul-Vergabe ersetzt
   die pauschalen Rollen **Admin/Gruppenführer** (die die Aufgabe explizit nennt).
   **Eingestellt wird sie vom Admin.**
2. **Benachrichtigungen = pro `Person`** (Personal), Kanal **E-Mail/Telegram**,
   **einstellbar im Admin-Menü**. Baut auf den vorhandenen Feldern `Person.email` /
   `Person.benachrichtigungen_aktiv` auf und erweitert um Kanal + Zielwert (Chat-ID).
   → Subjekt von Berechtigung (Moderator) und Benachrichtigung (Person) sind bewusst
   **unterschiedlich**.
3. **Admin behält Vollzugriff** (Admin-Bypass), stellt Berechtigungen zentral ein –
   man kann sich nicht aussperren.

**Noch offen (sinnvolle Defaults, bei Bedarf anpassen):**

4. **Granularität pro Modul:** Start mit **Zugriff ja/nein je Modul**; read/write/admin
   als spätere Erweiterung vorgesehen.
5. **„Module"-Umfang:** Registry so bauen, dass **beliebige Bereiche** (Fachmodule +
   Querschnitt wie Personal/Stammdaten/Einstellungen/Barcodes) registrierbar sind;
   Migration füllt die bestehenden Bereiche.
6. **Telegram pro Person:** eigene Chat-ID je Person; die globale
   `notifier_telegram_chat_ids` wird dadurch abgelöst bzw. ergänzt (bei Umsetzung
   festlegen).
7. **Ereignis-Routing:** welche Ereignisse an Moderatoren (operativ, z. B.
   Buchungsanfrage) und welche an Personen (persönlich, z. B. Barcode/Dienststunden)
   gehen – in Phase 3 sauber definieren.

## 4. Zielarchitektur

- **Datenmodell (gemäß §3):**
  - `Module`: `id`, `key` (eindeutig), `name`, `beschreibung`, `aktiv`.
  - `Berechtigung`: `moderator_id`, `modul_id`, ggf. `stufe` (später: read/write).
    Unique (moderator_id, modul_id).
  - `Benachrichtigungskanal`: `person_id`, `typ` (`mail`/`telegram`/…), `zielwert`
    (E-Mail bzw. Chat-ID), `aktiv`.
- **Zentraler `berechtigungs_service`:** eine Prüf-Funktion `hat_zugriff(db,
  moderator, modul_key) -> bool` (mit Admin-Bypass). **Alle** Zugriffsprüfungen laufen
  darüber – kein verstreuter Tabellenzugriff.
- **Modul-Registry:** zentrale Registrierung (Backend-seitig Liste/Objekte je Modul mit
  `key`, `name`, `beschreibung`), die `Module` seedet und der Berechtigungs-UI die
  Modulliste liefert. Berechtigungssystem selbst ist ein registriertes Modul.
- **Neue Dependency:** `require_modul_zugriff("<modul_key>")` analog zu
  `require_modul_aktiv(...)`, die `berechtigungs_service` nutzt (mit Admin-Bypass).

## 5. Phasen (jede Phase eigenständig lauffähig + getestet)

**Phase 0 – Entscheidungen & Feinentwurf** (kein/kaum Code): Fragen aus §3 klären,
Datenmodell fixieren, Migrationsreihenfolge festlegen.

**Phase 1 – Modul-Registry + „Module"-Seite (nicht-brechend): ✅ umgesetzt**
- `Modul`-Modell (`module`-Tabelle) + Migration `0035_module.py`; Registry
  `modul_service.MODUL_REGISTRY` + `ensure_module()` (idempotent, im Lifespan geseedet).
- Admin-Endpunkte `GET /moderator/module`, `PATCH /moderator/module/{key}`
  (`moderator_module.py`, `CurrentAdmin`).
- Admin-Seite „Module" (`pages/moderator/Module.tsx`) + Nav-Eintrag + Route.
- Keine Änderung an bestehenden Auth-Prüfungen. Tests: `test_module_registry.py`
  (Seeding, Idempotenz, set_aktiv, Admin-only, Patch). Suite grün (79).

**Phase 2 – Berechtigungen (noch ohne Enforcement):**
- `Berechtigung`-Modell + Migration; `berechtigungs_service.hat_zugriff()` +
  Setzen/Lesen.
- Admin-Seite „Berechtigungen": Matrix Mitarbeiter × Module (Checkbox je Zelle) +
  Filter nach Berechtigung; Inline-Speichern.
- Enforcement noch **aus** (nur Datenpflege). Tests: Service, Endpunkte, Filter.

**Phase 3 – Benachrichtigungsweg pro Person (im Admin-Menü):**
- `Benachrichtigungskanal`-Modell + Migration; erweiterbare Kanal-Registry
  (mail/telegram, Interface für künftige Kanäle).
- UI **pro Person** im Admin-Bereich (Kanalauswahl + Zielwert), baut auf den
  bestehenden `Person.email`/`benachrichtigungen_aktiv`-Feldern auf. Integration in
  `notifier_service` (Empfängerauflösung über die Kanäle der Personen).
- Ereignis-Routing (Moderatoren vs. Personen) definieren.
- Tests: Kanalauflösung, Versandpfad (gemockt).

**Phase 4 – Enforcement umstellen (schrittweise, Modul für Modul):**
- Endpunkte von `CurrentAdmin`/`CurrentModerator` auf `require_modul_zugriff(...)`
  migrieren – pro Modul, mit **Admin-Bypass** als Sicherheitsnetz.
- Datenmigration: bestehende Rollen → passende Berechtigungen (Admins bekommen alle
  Module), damit niemand ausgesperrt wird.
- Tests je migriertem Bereich (Zugriff erlaubt/verweigert).

**Phase 5 – Aufräumen & Doku:**
- Altes Rollenmodell abkündigen/entfernen (sofern Entscheidung 3 das zulässt).
- `.claude/docs/permissions.md` und `CLAUDE.md` aktualisieren; Backlog-Item schließen.

## 6. Risiken & Rollback

- **Auth-Breakage** ist das Hauptrisiko. Gegenmittel: Enforcement erst in Phase 4,
  Modul für Modul; durchgehender **Admin-Bypass**; Datenmigration Rollen→Rechte vor
  dem Umschalten; jede Phase eigenständig deploybar und per PR reviewbar.
- Kein Merge nach `main` ohne PR-Freigabe; kein Auto-Deploy des Branches.

## 7. Betroffene Bereiche (Grobübersicht)

- Backend: `app/models/` (3 neue Modelle), `app/services/` (`berechtigungs_service`,
  Registry, Notifier-Erweiterung), `app/api/v1/` (neue Endpunkte + schrittweise
  Migration bestehender), `app/api/deps.py` (`require_modul_zugriff`), Alembic (mehrere
  Migrationen).
- Frontend: neue Seiten „Module" (Einstellungen) und „Berechtigungen" (Admin),
  Kanal-UI je Mitarbeiter, Navigation/Guards.
- Doku: `permissions.md`, `CLAUDE.md`.

## 8. Nächste Schritte

Kernentscheidungen sind getroffen (§3, 1–3). Als Nächstes:

1. **Phase 1** auf diesem Branch umsetzen: `Module`-Modell + Migration + Registry
   (seedet bestehende Bereiche) + read-only „Module"-Einstellungsseite + Tests. PR
   aktualisieren. Nicht-brechend, weiterhin ohne `main`-Deploy bis PR-Freigabe.
2. Danach Phase 2 (Berechtigungen pro Moderator + Admin-Matrix, noch ohne Enforcement).
</content>
