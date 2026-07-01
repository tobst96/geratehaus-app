# API

FastAPI, alle Endpunkte unter Prefix `/api/v1`. Registrierung in `app/main.py`,
Dependencies in `app/api/deps.py`. Übergeordnet: `.claude/architecture.md`.

## Grundlagen

- Basis-Prefix: `/api/v1` (Nginx proxyt `/api/` auf das Backend).
- OpenAPI/Docs: `/api/v1/docs` (Swagger), `/api/v1/redoc`, `/api/v1/openapi.json`.
- Healthcheck: `GET /api/v1/health`.
- Statische Uploads werden unter `/uploads` gemountet.
- Moderator-Auth: JWT als `Authorization: Bearer <token>` (OAuth2 Password Flow,
  Login `POST /api/v1/auth/moderator/login`).
- Kiosk-/Mitglied-Auth: Cookies (`geraetehaus_name` bzw. signiertes `pin_session`).

## Router-Gruppen (`app/api/v1/`)

| Bereich | Router |
| --- | --- |
| Setup & Auth | `setup`, `auth` |
| Stammdaten | `stammdaten`, `moderator_stammdaten` |
| Einsätze | `einsaetze`, `reservierungen` (Sitzplatz) |
| Dienstbuch | `dienstbuecher`, `dienstbuch_reservierungen` |
| Dienststunden | `dienststunden`, `dienststunden_reservierungen` |
| Fahrzeugbuchung | `buchungen`, `buchung_aktionen`, `fahrzeugbuchung_reservierungen`, `moderator_buchungen` |
| Personen-Reservierungen | `person_bild_reservierungen`, `mitglied_login_reservierungen` |
| Moderator-Bereich | `moderator_dashboard`, `moderator_listen`, `moderator_punkte`, `moderator_barcodes`, `moderator_einstellungen`, `moderator_update` |
| Öffentlich/Integration | `oeffentlich`, `divera`, `push`, `manifest` |

## Konventionen für neue Endpunkte

- An bestehenden Routern desselben Bereichs orientieren (Pfade, Response-Modelle,
  Fehlerbehandlung).
- Zugriffsschutz über die vorhandenen Dependencies (`CurrentModerator`,
  `CurrentAdmin`, `CurrentPerson`) statt eigener Prüfungen; Modul-Endpunkte
  zusätzlich mit `require_modul_aktiv("modul_<name>_aktiv")` absichern (liefert 404,
  wenn das Modul deaktiviert ist). Siehe `.claude/docs/permissions.md`.
- Response niemals direkt aus ORM-Objekten mit berechneten Feldern – Personen über
  `personen_zu_out()` / `person_zu_out()` serialisieren.
- Fehler über `HTTPException(status_code=..., detail="...")`; das Frontend liest
  `detail` aus (siehe `.claude/docs/frontend.md`).
- Businesslogik in den zugehörigen Service, nicht in den Router.
