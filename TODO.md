# TODO

Offene Punkte, Wünsche und Ideen für Gerätehaus.app. Trag hier gerne direkt etwas ein —
diese Datei ist reiner Klartext, du kannst sie ohne Claude bearbeiten und committen, oder
mir einfach sagen "trag X in die TODO ein" / "schau dir die TODO an und mach Y".

Einträge sind mit Modul-Tags versehen (z. B. `[Setup]`, `[Sicherheit]`), damit man sich bei
Bedarf auf ein Modul konzentrieren kann, ohne mehrere Dateien pflegen zu müssen.

## Offen

- [ ] [Buchungen] Fahrzeugbuchungs-Anfrage-Mail soll direkte "Annehmen"/"Ablehnen"-Buttons
      enthalten, ohne dass sich der Moderator erst einloggen muss. `genehmigen`/`ablehnen` in
      `backend/app/api/v1/moderator_buchungen.py` sitzen aktuell hinter `CurrentModerator`
      (JWT-Login nötig). Naheliegendster Ansatz: dasselbe Reservierungs-Token-Muster wie
      "Barcode vergessen" (siehe CLAUDE.md, z. B. `fahrzeugbuchung_reservierung_service.py`)
      auf Moderator-Seite spiegeln – ein kurzlebiger, einmal verwendbarer Token pro
      Buchungsanfrage, der `/buchungen/{id}/genehmigen-per-token/{token}` bzw.
      `.../ablehnen-per-token/{token}` ohne Auth freischaltet, in der Benachrichtigungsmail
      (`benachrichtigung_buchungsanfrage` in `notifier_service.py`/`buchung_service.py`) als
      zwei Buttons/Links verlinkt. Sicherheitsaspekt nicht vergessen: Token an die konkrete
      Buchung binden, nach erster Nutzung invalidieren, sinnvolle Ablaufzeit (siehe
      Rate-Limiting-Policy aus TESTS.md/CLAUDE.md für neue unauthentifizierte Endpunkte).
      Die HTML-Mail-Infrastruktur dafür existiert bereits: `email_template_service.render_html()`
      nimmt schon einen optionalen `aktionen`-Parameter (Liste von `{label, url, farbe}`) für
      genau solche Buttons entgegen, aktuell von noch keinem Aufrufer befüllt.

## In Arbeit

## Erledigt

- [x] [Benachrichtigungen] E-Mails werden als HTML im Design der eingestellten Website versendet
      (Logo, `farbe_primaer`/`farbe_akzent` aus app_config) – neues
      `app/services/email_template_service.py` + `app/templates/email/basis.html` (Jinja2,
      analog zu den PDF-Templates), `EmailNotifier._versenden()` ergänzt `add_alternative()`
      neben dem bestehenden Plaintext (Multipart, kein Ersatz). 5 neue Tests in
      `test_email_html.py` (Rendering, Autoescaping, MIME-Struktur, SMTP-Versand gemockt).
- [x] [Setup] Setup-Wizard-Bug gefixt: tote `geofence_lat`/`geofence_lon`/`geofence_radius_meter`-
      Pflichtfelder (Überbleibsel vom Umbau geofence → barcode/kiosk, nirgends mehr gelesen)
      komplett aus Schema, Service, Config-Defaults und `core/geofence.py` entfernt.
      Regressionstest in `test_setup.py` mit dem tatsächlichen Frontend-Payload.
- [x] [Admin] Update-Anzeige im Admin-Bereich mit stable/beta-Kanal (GitHub-Releases-API)
- [x] [Sicherheit] Opt-in Fehlerberichte (Sentry) im Setup-Wizard und Einstellungen, feste
      DSN-Konstante im Code für zentrales Monitoring auch fremder Installationen
- [x] [Sicherheit] Backend-Testsuite (pytest) für sicherheitskritische Flows, Pflege-Policy in
      TESTS.md
- [x] [Sicherheit] Sicherheits-Response-Header (X-Frame-Options, X-Content-Type-Options,
      Referrer-Policy, Permissions-Policy)
- [x] [Sicherheit] API-Sicherheitsprüfung: Rate-Limiting auf Login/Barcode/PIN/
      Reservierungs-Endpunkte (öffentlich erreichbar)
- [x] [Mitgliederbereich] QR-Login "Seite nicht gefunden" gefixt (Service-Worker:
      skipWaiting/clientsClaim)
- [x] [Dienststunden] Schwellenwert-Überschreitungen: Liste mit Stunden-Übernahme
      (Listen > Dienststunden)
- [x] [Mitgliederbereich] Barcode nicht mehr erneut scannen (Identität schon über
      Mitglieder-Login bekannt)
- [x] [Barcodes] Kamera-Icon neben allen Barcode-Textfeldern zum Scannen per Handykamera
- [x] [Einstellungen] Admin-Passwort-Gate für Einstellungen entfernt
- [x] [Allgemein] Footer-Link auf eigenes GitHub-Repo geändert
- [x] [Listen] Namensabweichungen nur für Admin sichtbar (nicht Gruppenführer)
- [x] [Dienstbuch] Detailseite analog zu Einsätzen
- [x] [Benachrichtigungen] Individuell pro Person statt zentral (Default: aus, eigene E-Mail)
- [x] [Barcodes] Gültigkeitsdauer neuer Barcodes direkt auf der Barcodes-Seite einstellbar
- [x] [Mitgliederbereich] Kachel-Design wie der Kiosk
- [x] [Allgemein] Logo-Klick führt zum richtigen Bereich (Mitglieder/Moderator/Admin) statt
      immer zur Startseite
