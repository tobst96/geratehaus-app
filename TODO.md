# TODO

Offene Punkte, Wünsche und Ideen für Gerätehaus.app. Trag hier gerne direkt etwas ein —
diese Datei ist reiner Klartext, du kannst sie ohne Claude bearbeiten und committen, oder
mir einfach sagen "trag X in die TODO ein" / "schau dir die TODO an und mach Y".

Einträge sind mit Modul-Tags versehen (z. B. `[Setup]`, `[Sicherheit]`), damit man sich bei
Bedarf auf ein Modul konzentrieren kann, ohne mehrere Dateien pflegen zu müssen.

## Offen

- [ ] [Design] Frontend-Design modernisieren (Etappe 1 angefangen, siehe Plan unter
      `~/.claude/plans/ich-m-chte-das-personal-linked-eclipse.md`). **Bereits erledigt:**
      `.formular-feld`/`.formular-zeile`/`.banner-erfolg`/`.banner-fehler`-CSS-Klassen +
      `Banner.tsx`/`Ladeanzeige.tsx`-Komponenten in `index.css`/`frontend/src/components/`; alle
      3 ad-hoc duplizierten Erfolgs-Banner (`Einstellungen.tsx`, `NotifierEinstellungen.tsx`,
      `PunkteEinstellungen.tsx`) nutzen jetzt `<Banner>`; `NotifierEinstellungen.tsx` komplett
      von `<br />` auf `.formular-feld` migriert (alle 29 Vorkommen). **Noch offen (laut Plan):**
      Etappe 1 Rest – `Einstellungen.tsx` (31 `<br />`-Vorkommen) noch migrieren; Etappe 2 –
      restliche `<br />`-Dateien (`EinsatzDiagramm.tsx`, `Fahrzeugbuchung.tsx`,
      `EinsatzDetail.tsx`, `ManuelleEintragung.tsx`, `FahrzeugbuchungManuelleEintragung.tsx`,
      `DienstbuchManuelleEintragung.tsx`, `DienststundenManuelleEintragung.tsx`,
      `PunkteEinstellungen.tsx`-Rest); Etappe 3 – Tabellen in `<div className="tabelle-scroll">`
      wrappen (Mobile-Scroll); Etappe 4 – `<Ladeanzeige />` an den 29 `<p>Lädt …</p>`-Stellen
      ausrollen. Dark Mode/responsive Typografie bewusst zurückgestellt (siehe Plan).
- [ ] [Buchungen] Externe Kalender (z. B. den Divera-Kalender) per Einstellungen hinterlegen
      können, damit sie zusätzlich zu den Gerätehaus.app-eigenen Fahrzeugbuchungen im
      Buchungskalender angezeigt werden (Konflikterkennung soll dann auch externe Termine
      berücksichtigen, nicht nur eigene Buchungen). Betrifft `BuchungsKalender.tsx`
      (react-big-calendar) und `buchung_service.hat_konflikt()`. Naheliegendster Ansatz: pro
      Fahrzeug oder global eine iCal-/webcal-URL in app_config hinterlegen (Divera bietet i.d.R.
      einen iCal-Export), serverseitig periodisch abrufen/parsen (z. B. mit `icalendar`-Paket)
      und als zusätzliche, nicht buchbare "Fremdtermine" im Kalender überlagern. Divera-API-Key
      ist schon vorhanden (`divera_service.py`/`divera_client.py`) – ggf. erst prüfen, ob Divera
      Termine auch direkt über die bestehende API statt iCal liefert.
- [ ] [Benachrichtigungen] Mail-Versand: evtl. eine "Ausdrucken statt/zusätzlich zu E-Mail"-
      Alternative anbieten – z. B. für Moderatoren ohne hinterlegte E-Mail, oder als
      Backup-Kanal, wenn der SMTP-Versand fehlschlägt. Genauer Bedarf/Umfang noch unklar (reine
      Druckansicht im Browser? PDF-Download der Benachrichtigung? Automatisch bei
      SMTP-Fehlschlag?) – beim Aufgreifen erst klären, was genau gewünscht ist, bevor
      implementiert wird. Die HTML-Mail-Infrastruktur (`email_template_service.render_html()`)
      liefert bereits druckfähiges, gestyltes HTML, das sich als Basis eignen sollte.
- [ ] [Personal] CSV-Import für Personen, inkl. Beispieldatei zum Download (Spalten-Vorlage:
      vorname, zwischenname, nachname, email, gruppe, funktion o. ä.). Betrifft
      `Personal.tsx`/`stammdaten_service.person_anlegen()`. Sinnvoller Ansatz: neuer Endpunkt
      POST `/moderator/stammdaten/personen/csv-import`, der eine hochgeladene CSV zeilenweise
      gegen `person_anlegen()` durchläuft (inkl. der bestehenden Punkte-Vergabe/Timeline-Logik
      pro Anlage), Gruppen/Funktionen per Name auflöst (anlegen, falls nicht vorhanden, oder
      Fehler pro Zeile sammeln und am Ende als Ergebnis-Liste zurückgeben statt beim ersten
      Fehler abzubrechen). Beispieldatei als statische Datei im Frontend (z. B.
      `public/personen-vorlage.csv`) zum Download neben dem Upload-Button auf der Personal-Seite.

## In Arbeit

## Erledigt

- [x] [Auth] "Durch zufälliges Klicken war ich auf einmal eingeloggt" behoben: neue
      `POST /auth/abmelden` löscht den httponly `geraetehaus_name`-Cookie serverseitig (geht
      nicht per JS, da httponly); `AuthContext.tsx` hat jetzt `mitgliedAbmelden()` (löscht
      zusätzlich `localStorage`/`angezeigterName`); sichtbarer "Nicht {Name}? Abmelden"-Button
      im Mitglieder-Hub (`MitgliedHub.tsx`), analog zum Moderator-Abmelden-Button. Nach Abmelden
      führt der Logo-Klick wieder zur Startseite statt zu `/mitglied` (per `angezeigterName`
      bereits in `Layout.tsx` `startseite()` korrekt verdrahtet). 1 neuer Test.
- [x] [Punkte] Punkte-Vergabe als manuelle "Belohnung": jeder Moderator (auch Gruppenführer,
      nicht nur Admin) kann auf der Punkte-Seite jetzt Personen direkt Punkte gutschreiben.
      Neuer Endpunkt `POST /moderator/punkte/belohnung` (`moderator_punkte.py`, CurrentModerator)
      nutzt die bereits vorhandene `stammdaten_service.punkte_vergeben()`. Die Punkte-Route
      selbst ist jetzt für alle Moderatoren erreichbar (`App.tsx`/`ModeratorLayout.tsx`), die
      automatischen Regel-Einstellungen auf derselben Seite bleiben aber admin-only
      (frontend-seitig ausgeblendet für Gruppenführer). `GET /moderator/stammdaten/personen`
      (Personenliste) ist dafür jetzt ebenfalls für jeden Moderator lesbar statt nur Admin –
      alle schreibenden Personen-Endpunkte (anlegen/ändern/löschen/PIN/Bild) bleiben admin-only.
      5 neue Tests in `test_punkte_belohnung.py`.
- [x] [Barcodes] Sound beim Scannen: Erfolgston, wenn eine Person erkannt wurde, Fehlerton bei
      nicht gefundenem Barcode. Zwei synthetisch erzeugte WAV-Dateien (`frontend/public/sounds/
      erkannt.wav`/`fehler.wav`, keine externe Audio-Lizenz nötig) + neuer `useBarcodeSound()`-
      Hook (`frontend/src/hooks/useBarcodeSound.ts`), eingebunden in die `barcodeVorschau()`-
      Debounce-Logik aller 5 Stellen (`EinsatzDiagramm.tsx`, `DienstbuchDiagramm.tsx`,
      `Dienststunden.tsx`, `Fahrzeugbuchung.tsx`, `MitgliedLogin.tsx`). Die Kamera-Erkennung
      (`BarcodeScanner.tsx`) braucht keine eigene Anbindung – sie füllt nur das Textfeld, der
      Erfolgs-/Fehlerton kommt dann ohnehin über die normale Vorschau-Auflösung.

- [x] [Buchungen] Fahrzeugbuchungs-Anfrage-Mail hat jetzt direkte "Annehmen"/"Ablehnen"-Buttons,
      ohne dass sich der Moderator einloggen muss. Neue Tabelle `buchung_aktion_tokens`
      (Migration 0032) + `buchung_aktion_service.py`: kurzlebiger Token (14 Tage) pro
      Buchungsanfrage, eingelöst über die neuen öffentlichen, ratenlimitierten Endpunkte
      `GET /api/v1/buchungen-aktion/{token}/genehmigen` bzw. `.../ablehnen`
      (`backend/app/api/v1/buchung_aktionen.py`). Mail geht bewusst an die zentrale
      `notifier_email_recipients`-Liste (Moderator-Einstellungen), NICHT an die per-Person
      opted-in Empfänger – nur Moderatoren dürfen über Buchungen entscheiden. Zweiter Klick
      nach bereits getroffener Entscheidung ändert nichts mehr (kein Fehler, nur Hinweis).
      6 neue Tests in `test_buchung_aktion.py`.
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
