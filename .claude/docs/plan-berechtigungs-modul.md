# Umsetzungsplan: Granulare Berechtigungsverwaltung & Modul-System

Status: **Plan / Entwurf** – noch kein Code. Backlog-Item: „Granulare, individuelle
Berechtigungsverwaltung als eigenständiges Modul" (`.claude/docs/backlog.md`).
Umsetzung anschließend phasenweise auf diesem Feature-Branch mit PR, **nicht** direkt
auf `main`.

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

## 3. Offene Grundsatzentscheidungen (VOR der Umsetzung klären)

> Diese Fragen müssen beantwortet sein, bevor Code entsteht – sie bestimmen das
> Datenmodell.

1. **Wer ist „Mitarbeiter"?** Bezieht sich die Berechtigung auf **`Moderator`-
   Accounts** (die sich einloggen und den Moderator-Bereich bedienen) oder auf
   **`Person`** (Personal/Mitglieder ohne Login)? Die Aufgabe nennt „Personalverwaltung"
   (= `Person`), aber Zugriffsrechte/Login existieren heute nur für `Moderator`.
   → **Empfehlung:** Rechte an den **Login-fähigen Nutzern** vergeben. Falls jede
   `Person` künftig Rechte/Bereiche bekommen soll, braucht sie zuerst ein Login-Konzept
   (überschneidet sich mit PIN-Login) – das wäre ein eigener Vorbau.
2. **Granularität pro Modul:** nur „Zugriff ja/nein" oder differenziert (lesen /
   schreiben / admin)? Die Aufgabe nennt „Zugriff je Modul (Checkbox)". → Start mit
   **Zugriff ja/nein je Modul**, Schreib-/Adminrechte als spätere Erweiterung
   vorsehen.
3. **Super-Admin bleibt?** Es sollte weiterhin (mind. während der Migration) einen
   „darf alles"-Zugang geben, damit man sich nicht aussperrt. → **Ja**, Admin-Bypass
   beibehalten, bis alles migriert ist.
4. **„Module"-Umfang:** Nur die fachlichen Module (Einsatz/Dienstbuch/Dienststunden/
   Fahrzeugbuchung) oder auch Querschnitt (Personal, Stammdaten, Einstellungen,
   Barcodes, Benachrichtigungen)? → Registry so bauen, dass **beliebige Bereiche** als
   Modul registrierbar sind; Migrationsdaten füllen die bestehenden Bereiche.
5. **Kanal Telegram pro Mitarbeiter:** eigene Chat-ID je Mitarbeiter (statt globaler
   Liste) – Bestätigung, dass die globale `notifier_telegram_chat_ids` dadurch abgelöst
   bzw. ergänzt wird.

## 4. Zielarchitektur

- **Datenmodell (Vorschlag):**
  - `Module`: `id`, `key` (eindeutig), `name`, `beschreibung`, `aktiv`.
  - `Berechtigung`: `subjekt_id` (Moderator- oder Person-ID, je nach Entscheidung 1),
    `modul_id`, ggf. `stufe` (später: read/write). Unique (subjekt, modul).
  - `Benachrichtigungskanal`: `subjekt_id`, `typ` (`mail`/`telegram`/…), `zielwert`
    (E-Mail bzw. Chat-ID), `aktiv`.
- **Zentraler `berechtigungs_service`:** eine Prüf-Funktion `hat_zugriff(db, subjekt,
  modul_key) -> bool`. **Alle** Zugriffsprüfungen laufen darüber – kein verstreuter
  Tabellenzugriff.
- **Modul-Registry:** zentrale Registrierung (Backend-seitig Liste/Objekte je Modul mit
  `key`, `name`, `beschreibung`), die `Module` seedet und der Berechtigungs-UI die
  Modulliste liefert. Berechtigungssystem selbst ist ein registriertes Modul.
- **Neue Dependency:** `require_modul_zugriff("<modul_key>")` analog zu
  `require_modul_aktiv(...)`, die `berechtigungs_service` nutzt (mit Admin-Bypass).

## 5. Phasen (jede Phase eigenständig lauffähig + getestet)

**Phase 0 – Entscheidungen & Feinentwurf** (kein/kaum Code): Fragen aus §3 klären,
Datenmodell fixieren, Migrationsreihenfolge festlegen.

**Phase 1 – Modul-Registry + „Module"-Seite (nicht-brechend):**
- `Module`-Modell + Migration; Registry, die bestehende Bereiche seedet
  (`ensure_defaults`-Analogie).
- Read-only „Module"-Einstellungsseite (Liste, aktiv/inaktiv umschalten).
- Keine Änderung an bestehenden Auth-Prüfungen. Tests: Registry/Seeding, Endpoint.

**Phase 2 – Berechtigungen (noch ohne Enforcement):**
- `Berechtigung`-Modell + Migration; `berechtigungs_service.hat_zugriff()` +
  Setzen/Lesen.
- Admin-Seite „Berechtigungen": Matrix Mitarbeiter × Module (Checkbox je Zelle) +
  Filter nach Berechtigung; Inline-Speichern.
- Enforcement noch **aus** (nur Datenpflege). Tests: Service, Endpunkte, Filter.

**Phase 3 – Benachrichtigungsweg pro Mitarbeiter:**
- `Benachrichtigungskanal`-Modell + Migration; erweiterbare Kanal-Registry
  (mail/telegram, Interface für künftige Kanäle).
- UI je Mitarbeiter (Kanalauswahl + Zielwert). Integration in `notifier_service`
  (Empfängerauflösung über die Kanäle der berechtigten Mitarbeiter).
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

1. Grundsatzentscheidungen §3 mit dem Nutzer klären (v. a. „Mitarbeiter" = Moderator
   vs. Person).
2. Danach Phase 1 auf diesem Branch umsetzen (Modell + Migration + „Module"-Seite +
   Tests), PR aktualisieren.
</content>
