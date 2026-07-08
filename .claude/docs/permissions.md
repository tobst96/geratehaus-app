# Berechtigungen

Reales Zugriffsmodell aus `backend/app/api/deps.py`, `app/core/security.py`,
`app/core/mitglied_session.py` und dem granularen Berechtigungssystem
(`services/berechtigungs_service.py` + `services/modul_service.py`). Es gibt
**keine** einfache lineare Hierarchie – mehrere unabhängige Identitätsarten.

## Identitätsarten

| Ebene | Dependency / Mechanismus | Nachweis |
| --- | --- | --- |
| **Admin** | `CurrentAdmin` | JWT-Bearer + `Moderator.rolle == "admin"` |
| **Moderator (Gruppenführer)** | `CurrentModerator` | JWT-Bearer (jede Rolle) |
| **Granularer Modul-Zugriff** | `require_modul_zugriff("<key>")` | JWT-Bearer + Freigabe des Moduls **oder** Admin-Bypass |
| **Mitglied** | `CurrentPerson` | **signiertes** Cookie `geraetehaus_name` (`mitglied_session`), nur nach echter Identifikation (Barcode / Name+PIN) |
| **Kiosk-Gerät** | Header `X-Kiosk-Token` | Geräte-Token (`/kiosk/:token`) |
| **Daten-Gate** | `require_zugriff` | Kiosk-Token **oder** Mitglied-Cookie **oder** Moderator-JWT |
| **Einmal-/Token-Flows** | dedizierte Tokens | Barcode-vergessen-QR, Buchung Annehmen/Ablehnen, Profilbild-Upload, Dienststunden-Stempel |

Wichtig: **Admin und Gruppenführer sind derselbe `Moderator`-Typ** – unterschieden
über `rolle`. „Gast" existiert nicht; öffentliche Endpunkte sind explizit gebaut
(`oeffentlich`-Router, Token-Flows).

## Zwei-Faktor (Moderator/Admin)

Opt-in pro Zugang (`Moderator.zwei_faktor_aktiv`). Nach korrektem Passwort verlangt
`POST /auth/moderator/login` bei unbekanntem Gerät einen E-Mail-OTP
(`POST /auth/moderator/2fa`, `zwei_faktor_service`); Trusted-Device-Cookie (30 Tage)
überspringt ihn. Recovery-Codes + Admin-Reset gegen Aussperren.

## Granulares Berechtigungssystem (`require_modul_zugriff`)

- Modul-Registry: `modul_service.MODUL_REGISTRY` (Keys u. a. `einsatztagebuch`,
  `dienstbuch`, `dienststunden`, `fahrzeugbuchung`, `personal`, `stammdaten`,
  `barcodes`, `kiosk-geraete`, `benachrichtigungen`, `einstellungen`,
  `berechtigungen`), idempotent geseedet über `ensure_module()`.
- Freigabe je Moderator in Tabelle `berechtigungen`; `berechtigungs_service.hat_zugriff`
  entscheidet – **Admins immer (Bypass)**, sonst nur bei vorhandener Freigabe.
- `require_modul_zugriff("<key>")` (deps.py) gibt den Moderator zurück oder **403**.

**Bereits granular gegatet** (non-breaking, Admins via Bypass; Gruppenführer erst
mit Freigabe): `einstellungen`, `module`, `update`, `berechtigungen`, **`barcodes`**,
**`kiosk-geraete`**, sowie `moderator_stammdaten` (Config → `stammdaten`,
Personen-Mutationen → `personal`). Die drei bewusst offenen `CurrentModerator`-
Endpunkte in `moderator_stammdaten` (Personen-Liste, Ampel, PIN-Entsperren) bleiben
für alle Moderatoren erreichbar.

**Arbeitsbereiche granular gegatet** (Etappe P2 „Phase 5", non-breaking via
Anti-Aussperr-Migration `0059`): die Moderator-Endpunkte der vier Feature-Module
sind jetzt rechtebasiert statt „jeder Moderator" – `einsatztagebuch` (Einsatz
abschließen/wieder-öffnen/löschen), `dienstbuch` (Auswertungen, schließen/
wieder-öffnen, „relevant"), `dienststunden` und `fahrzeugbuchung` (genehmigen/
ablehnen). Auch die bereichsspezifischen Listen/PDFs in `moderator_listen` hängen
jetzt am jeweiligen Modul-Recht; die Listen-Seite blendet Tabs ohne Recht aus.
**Kiosk-/Mitglieder-Endpunkte** derselben Router (Anlegen, Teilnahme, Reservierung,
Stempel, …) bleiben bewusst nur über `require_zugriff` erreichbar (nicht gegatet).

Damit ist das „jeder-Moderator-darf-alles"-Modell für alle mitgliederseitigen
Feature-Module durch echte Rechte abgelöst. **Die Admin-Rolle bleibt** (Bypass +
bewusst admin-only Bereiche).

**Bewusst admin-only (nicht grantbar):** `audit`, `backup`, `minio`, `systemstatus`.
- „Breaking" Schlussphase: Rechte-Seed gegen Aussperren + Ablösung des reinen
  Rollenmodells (`rolle`) durch das Rechte-Modell.

## Modul-Freischaltung (fachliche Aktivierung, nicht Zugriff)

- `require_modul_aktiv("modul_<name>_aktiv")` sperrt eine Route mit **404**, wenn
  das Feature-Modul im Moderator-Bereich deaktiviert ist.
- `modul_<name>_aussenzugriff` steuert die Nutzung über den öffentlichen
  Mitglied-Login (außerhalb des Kiosks).

## Regeln

- Immer vorhandene Dependencies nutzen (`CurrentModerator`, `CurrentAdmin`,
  `CurrentPerson`, `require_modul_zugriff`, `require_modul_aktiv`, `require_zugriff`) –
  keine eigenen Rollenprüfungen bauen.
- Neue Admin-Management-Endpunkte granular über `require_modul_zugriff("<key>")`
  absichern (Admins bypassen automatisch → non-breaking).
- Berechtigungen **immer serverseitig** prüfen; Frontend-Guards (`AdminRoute` /
  `BerechtigungRoute`) sind nur UX.
