# Umsetzungsplan: Granulare Berechtigungsverwaltung & Modul-System

Status: **In Umsetzung** – Phase 0 + **Phasen 1–3 umgesetzt** (Modul-Registry +
„Module"-Seite; Berechtigungen pro Moderator + Admin-Matrix; Benachrichtigungskanäle
pro Person im Admin-Menü). **Enforcement + Notifier-Wiring noch aus.** Phasen 4–5
offen. Backlog-
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

**Phase 2 – Berechtigungen (noch ohne Enforcement): ✅ umgesetzt**
- `Berechtigung`-Modell (`berechtigungen`-Tabelle, unique (moderator, modul)) +
  Migration `0036_berechtigung.py`.
- `berechtigungs_service`: `hat_zugriff()` (Admin-Bypass), `matrix()`,
  `set_berechtigung()`.
- Admin-Endpunkte `GET /moderator/berechtigungen` (Matrix), `PUT
  /moderator/berechtigungen/{moderator_id}/{modul_key}`.
- Admin-Seite „Berechtigungen" (`Berechtigungen.tsx`): Matrix Moderator × Module
  (Checkbox je Zelle, Admins = Vollzugriff/disabled) + Filter nach Modul-Zugriff +
  Inline-Speichern. Nav + Route.
- Enforcement noch **aus** (nur Datenpflege). Tests `test_berechtigungen.py`
  (Bypass, grant/revoke, unbekannt, Matrix-Endpoint admin-only, PUT+404). Suite grün (84).

**Phase 3 – Benachrichtigungsweg pro Person (im Admin-Menü): ✅ umgesetzt**
- `Benachrichtigungskanal`-Modell (`benachrichtigungskanaele`, unique person+typ) +
  Migration `0037`; erweiterbare Kanal-Registry `KANAL_TYPEN` (mail/telegram).
- `benachrichtigungskanal_service` (liste/setzen/loeschen, Typ-Validierung).
- Admin-Endpunkte: `GET /moderator/kanal-typen`, `GET/PUT/DELETE
  /moderator/personen/{id}/kanaele[/{typ}]`.
- Frontend: Komponente `PersonKanaele` in der Personal-Detailseite (Kanal + Zielwert
  + aktiv, Speichern). Tests `test_benachrichtigungskanal.py`. Suite grün (89).
- **Offen (bewusst später):** Wiring in `notifier_service` (Empfängerauflösung über
  diese Kanäle) + Ereignis-Routing (Moderatoren vs. Personen) – zusammen mit dem
  Enforcement-Umbau in Phase 4, um bestehende Benachrichtigungen nicht zu brechen.

**Phase 4 – Enforcement umstellen (schrittweise, Modul für Modul):**
- **4a ✅ Werkzeug fertig:** `require_modul_zugriff(modul_key)` in `deps.py`
  (Admin-Bypass via `berechtigungs_service.hat_zugriff`, sonst 403). Noch **nicht**
  angewandt → nicht-brechend. Tests `test_modul_zugriff.py`. Suite grün (91).
- **4b teilweise umgesetzt** – Entscheidung des Nutzers: **„leer starten, Admin
  vergibt"** (nach dem Scharfschalten hat außer Admins niemand Zugriff, bis der Admin
  das Modul freigibt). Erster Slice: die eigenständigen Admin-Seiten **Module**
  (`require_modul_zugriff("einstellungen")`) und **Berechtigungen**
  (`require_modul_zugriff("berechtigungen")`) sowie die Personen-Kanäle
  (`require_modul_zugriff("personal")`) sind jetzt granular geschützt – Admins via
  Bypass, sonst 403 bis Freigabe. Nicht-brechend (Nicht-Admins waren vorher auch
  gesperrt). Enforcement-Tests in `test_berechtigungen.py`/`test_benachrichtigungskanal.py`.
  Suite grün (93). **Weiterer Batch:** Registry um `kiosk-geraete` ergänzt;
  `moderator_einstellungen` + `moderator_update` auf `require_modul_zugriff("einstellungen")`
  umgestellt (Selbstlösch-Schutz via `CurrentModerator` erhalten). Suite grün (95).
  **Mapping-Entscheidungen des Nutzers:** Dashboard/Listen bleiben für jeden Moderator
  sichtbar (kein Recht); Kiosk-Geräte = eigenes Modul `kiosk-geraete`; Punkte wird
  übersprungen (Backlog: Punktesystem wird entfernt).
- **4b Rest offen (Rollout über die restlichen Router):**
  - **Endpoint→Modul-Mapping** festlegen: heutige Gruppenführer-Bereiche
    (Dashboard/Listen/Buchungen/Punkte + Einsatz/Dienstbuch/Fahrzeugbuchung managen)
    vs. die Modul-Taxonomie. Vorschlag: Gruppenführer behalten die operativen
    Fachmodule (einsatztagebuch/dienstbuch/dienststunden/fahrzeugbuchung), Querschnitt
    (personal/stammdaten/barcodes/benachrichtigungen/einstellungen/berechtigungen)
    bleibt admin-only.
  - **Datenmigration Rollen→Rechte** (bestehende Gruppenführer bekommen ihre
    bisherigen Module), damit beim Aktivieren niemand ausgesperrt wird.
  - Dann Endpunkte schrittweise von `CurrentAdmin`/`CurrentModerator` auf
    `require_modul_zugriff(...)` umstellen; Tests je Bereich.
  - **Notifier-Wiring** (Phase-3-Kanäle in den Versand) im selben Zug.

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
