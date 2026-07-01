# Berechtigungen

Reales Zugriffsmodell aus `backend/app/api/deps.py`, `app/core/security.py` und
`app/core/pin_session.py`. Es gibt **keine** einfache lineare Hierarchie – es
existieren mehrere unabhängige Identitätsarten.

## Identitätsarten

| Ebene | Dependency / Mechanismus | Nachweis |
| --- | --- | --- |
| **Admin** | `CurrentAdmin` | JWT-Bearer-Token + `Moderator.rolle == "admin"` |
| **Moderator (Gruppenführer)** | `CurrentModerator` | JWT-Bearer-Token (jede Rolle) |
| **Mitglied (Kiosk)** | `CurrentPerson` | Cookie `geraetehaus_name` (kein Login; Person wird bei Bedarf angelegt) |
| **Kiosk-Gerät** | `kiosk_token_service` | Geräte-Token in der URL (`/kiosk/:token`) |
| **Öffentlicher Mitglied-Login** | `pin_session`-Cookie | signiert, an `person_id` gebunden, 30 Tage gültig |
| **Einmal-Token-Flows** | dedizierte Tokens | Barcode-vergessen-QR, Buchung Annehmen/Ablehnen, Profilbild-Upload |

Wichtig: **Admin und Gruppenführer sind derselbe `Moderator`-Datensatztyp** –
unterschieden nur über das Feld `rolle`. „Gast" existiert nicht als Rolle;
öffentliche Endpunkte sind explizit als solche gebaut (`oeffentlich`-Router,
Token-Flows).

## Rollen-Trennung Moderator vs. Admin

- `CurrentModerator`: Dashboard, Listen, Einsatz-/Dienstbuch-Details,
  Fahrzeugbuchungen, Punkte **vergeben**.
- `CurrentAdmin` (zusätzlich `rolle == "admin"`): Personal, Stammdaten, Barcodes,
  Kiosk-Geräte, Benachrichtigungen, Einstellungen, Update.
- Frontend spiegelt das über `ModeratorRoute` / `AdminRoute` in `src/App.tsx` –
  die serverseitige Prüfung in `deps.py` ist maßgeblich, das Frontend nur zusätzlich.

## Modul-Freischaltung

- `require_modul_aktiv("modul_<name>_aktiv")` sperrt eine Route mit **404**, wenn
  das Modul über den Moderator-Bereich deaktiviert wurde.
- `modul_<name>_aussenzugriff` steuert, ob ein Modul über den öffentlichen
  Mitglied-Login (außerhalb des Kiosks) nutzbar ist.

## Regeln

- Immer die vorhandenen Dependencies verwenden, keine eigenen Rollenprüfungen bauen.
- Neue Modul-Endpunkte mit `require_modul_aktiv(...)` absichern.
- Berechtigungen **immer serverseitig** prüfen; Frontend-Guards sind nur UX.
