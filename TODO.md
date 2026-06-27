# TODO

Offene Punkte, Wünsche und Ideen für Gerätehaus.app. Trag hier gerne direkt etwas ein —
diese Datei ist reiner Klartext, du kannst sie ohne Claude bearbeiten und committen, oder
mir einfach sagen "trag X in die TODO ein" / "schau dir die TODO an und mach Y".

Einträge sind mit Modul-Tags versehen (z. B. `[Setup]`, `[Sicherheit]`), damit man sich bei
Bedarf auf ein Modul konzentrieren kann, ohne mehrere Dateien pflegen zu müssen.

Die offenen Punkte sind zusätzlich in **Etappen** gruppiert: verwandte/zusammenhängende
Änderungen landen in einem Arbeitsgang statt einzeln nacheinander angegangen zu werden.
Reihenfolge unten ist ein Vorschlag (kleine/mechanische Etappen zuerst), kein Zwang – sag
einfach "mach Etappe X" oder nenn das Modul, wenn du gezielt etwas anderes vorziehen willst.

## Etappen

### Etappe A – Quick Fixes (mehrere Module, klein/mechanisch)

- [ ] [Update] Bug: Installierte Version (`0.3.0b1`, PEP-440-Format aus `pyproject.toml`) und
      verfügbare Version (`0.3.0-beta.1`, Semver aus GitHub-Releases-API) bezeichnen dieselbe
      Version, werden aber unterschiedlich formatiert – dadurch zeigt die Seite fälschlicherweise
      „neue Version verfügbar" an. Fix: beim Vergleich beide Formate auf einen gemeinsamen
      Nenner normalisieren (z. B. `0.3.0b1` → `0.3.0-beta.1` oder umgekehrt) bevor verglichen
      wird. Alternativ `pyproject.toml`-Version von vornherein in Semver-Format pflegen.
      Betrifft `app/api/v1/update.py` oder wo der Versionsvergleich stattfindet.

- [ ] [Design] Abstand unter Aktions-Buttons vor dem nächsten Inhaltsbereich: Im Einsatztagebuch
      fehlt unter dem „Neuer Einsatz"-Button der visuelle Abstand bevor die Einsatzliste beginnt.
      Dasselbe Muster in allen anderen Modulen prüfen und vereinheitlichen (Dienstbuch: „Neuer
      Dienst", Dienststunden: „Stunden erfassen", Fahrzeugbuchung: „Neue Buchung" o. ä.).
      Lösung: einheitlicher `margin-bottom` auf den jeweiligen Button-Bereich bzw. einen
      Trenner-Abstand als CSS-Klasse (z. B. `.abschnitt-trenner`), damit überall dieselbe
      optische Trennung zwischen Eingabe-/Aktionsbereich und Listenbereich entsteht.
- [ ] [Dienstbuch] Bug: Im Mitglieder-Bereich ist beim Dienstbuch die Gruppe der eingeloggten
      Person nicht vorgewählt. Beim Laden der Seite sollte die Gruppe aus dem Personenprofil
      (`CurrentPerson`) automatisch als Standardwert im Gruppen-Dropdown gesetzt werden.
      Betrifft die Dienstbuch-Seite im Mitglieder-Bereich (`pages/dienstbuch/` o. ä.).
- [ ] [Dienststunden] In der Liste sollen nicht die Personen-IDs angezeigt werden, sondern der
      richtige Name, dasselbe mit der Funktion.
- [ ] [Punkte] Punkte in der Moderator-Übersicht: unter der Eingabe darf nicht mehr der Text
      "Die automatischen Punkte-Regeln (unten) kann nur ein Admin einsehen und ändern." stehen!

### Etappe B – Dienststunden-Politur (Dashboard/Liste-Verknüpfung)

- [ ] Schwellenwert-Überschreitungen sollten nach oben und die Liste mit den ganzen Einträgen
      nach unten.
- [ ] Bug: Die Schwellenwert-Überschreitungs-Anzeige auf dem Dashboard verschwindet nicht,
      nachdem Stunden erfasst wurden – sie bleibt stehen, auch wenn die Person danach unter
      dem Schwellenwert liegt. Dashboard-Daten nach dem Stunden-Eintrag neu laden bzw. den
      Schwellenwert-Status serverseitig korrekt neu berechnen.
- [ ] Wenn die Stunden übernommen werden und unter der Schwelle ist, dann sollten auch die
      Schwellenwert-Überschreitungen auf dem Dashboard aktualisiert werden.
- [ ] Wenn man auf Schwellenwert-Überschreitungen auf dem Dashboard klickt, soll man direkt zu
      den Listen → Dienststunden springen.
- [ ] Sende der Person eine Mail, wenn die Stunden eingetragen wurden.

### Etappe C – Dienststunden-Erfassung touch-freundlich (größeres UI-Rework)

- [ ] Stunden-Erfassung touch-freundlicher und präziser gestalten: Das aktuelle
      `<input type="number">`-Feld ist auf dem Handy umständlich. Vorschlag: Schnellauswahl-Chips
      für häufige Werte (0:30 · 1:00 · 1:30 · 2:00 · 3:00 · 4:00) als tippbare Kacheln-Reihe,
      darunter ein Feineinstellungs-Stepper (− / Anzeige / +) in 15-Min.-Schritten für
      Zwischenwerte. Die Anzeige erfolgt im Format "2 Std. 30 Min." statt als Dezimalzahl.
      Intern weiterhin als Dezimalstunden (float) an die API übergeben. Betrifft
      `Dienststunden.tsx` (Bereich "Stunden erfassen"), keine Backend-Änderung nötig.

### Etappe D – Moderator-Bereich Mobile-Optimierung

- [ ] [Design] Moderator-Navigation auf Mobilgeräten überarbeiten: Die Navigationsleiste bricht
      aktuell auf schmalen Screens über 4 Zeilen um und wirkt chaotisch. Lösung: Hamburger-Menü
      (☰-Icon in der Kopfzeile, öffnet ein Drawer/Overlay mit allen Nav-Links) oder
      zusammenklappbare Sidebar. Ab einer definierten Breakpoint-Breite (z. B. ≤768 px) greift
      das mobile Layout, darüber bleibt die horizontale Leiste. Betrifft `ModeratorLayout.tsx`
      (oder wo die Nav gerendert wird) + `index.css`.
- [ ] [Design] Moderator-Bereich Layout-Overflow auf Mobile beheben: Auf schmalen Screens ist
      rechts eine abgeschnittene Karte sichtbar (horizontaler Overflow). Ursache prüfen –
      vermutlich ein festes `min-width` oder ein flex/grid-Container ohne `overflow: hidden`.
      Alle Seiten im Moderator-Bereich auf horizontalen Scroll prüfen und beheben.
- [ ] [Design] Personal-Liste mobile-freundlicher gestalten: Personen-Karten (`Personal.tsx`)
      sind auf Mobile gut lesbar, aber „+ Person hinzufügen"-Button und Suche könnten als
      Sticky-Leiste oben fixiert werden, damit man beim Scrollen durch eine lange Liste nicht
      zurückscrollen muss. Suche ggf. prominenter platzieren (volle Breite, direkt unter dem
      Seitentitel).

### Etappe E – Mitglieder-Hub Redesign (`MitgliedHub.tsx`, nur Frontend)

- [ ] [Mitgliederbereich] (1) **Profil-Zeile** statt großem Begrüßungsblock: kompakter Streifen mit Avatar
      (Profilbild oder Initialen-Fallback, ~40 px), Name daneben, und "Abmelden" als kleiner
      Textlink rechts – spart erheblich Höhe und wirkt weniger überladen.
- [ ] (2) **Kacheln 2-spaltig** im CSS-Grid statt Vollbreite-Stack: quadratische Kacheln
      (Icon oben, Label unten), analog zum Kiosk-Design, auf schmalen Screens 2 Spalten.
- [ ] (3) **Einheitliche Kachel-Styles**: Keinen selektiven orangen Rand (sieht aktuell aus
      wie ein hängengebliebener Aktiv-State). Aktiv/Hover-Zustand nur bei echtem Touch/Klick.
- [ ] (4) **"Abmelden"-Button** nicht mehr als große outlined Schaltfläche prominent platzieren
      – in die Profil-Zeile integrieren (siehe 1). Betrifft ausschließlich `MitgliedHub.tsx`
      und `index.css` (ggf. neues `.mitglied-hub-*`-CSS), kein Backend.

### Etappe E – Punkte- & Barcode-Sicherheit

- [ ] [Punkte] Punkte als Belohnung vergeben: darf man sich nicht selber Punkte geben. Bei der
      Empfänger-Person soll in der Timeline die Punkte, Gültigkeit, Grund und wer die Punkte
      hinzugefügt hat stehen.
- [ ] [Punkte] Im Admin-Bereich soll man Personen auch Punkte entziehen können. Überlegen, wie
      sich das schön einbauen lässt, ohne die Oberfläche zu überladen.
- [ ] [Buchungen] Wenn bei der Fahrzeugbuchung "Barcode vergessen" geklickt wird, dann soll –
      sobald die Person sich am Handy mit Name und PIN eingeloggt hat – neben dem QR-Code sofort
      das Profilbild und der Name angezeigt werden.
- [ ] [Barcode] Überprüfe überall, wo man auf "Barcode vergessen" klickt, dass man am Handy
      seinen Namen und PIN eingeben muss zum Einloggen. Erst dann sollen die Bilder angezeigt
      werden. Wenn die Person keinen PIN hat, dann sperre die Option. Vermerke dies aber in ihrer
      Personen-Timeline.

### Etappe F – Per-Zugang-Benachrichtigungen (zwei Schritte, sequenziell)

1. [ ] [Moderatoren] E-Mail-Adresse pro Moderatoren-Zugang (`moderatoren`-Tabelle, neues Feld
       `email`): Migration + Endpunkte `moderator_anlegen`/`moderator_aktualisieren` erweitern,
       Formular in `Einstellungen.tsx` (Bereich "Admin- & Gruppenführer-Zugänge") um E-Mail-Feld
       ergänzen. Voraussetzung für Schritt 2.
2. [ ] [Benachrichtigungen] Benachrichtigungen pro Moderatoren-Zugang statt global: Die aktuellen
       globalen Schalter (`benachrichtigung_neuer_einsatz`, `benachrichtigung_neues_dienstbuch`,
       `benachrichtigung_buchungsanfrage`, `benachrichtigung_schwellenwert_ueberschreitung`,
       `benachrichtigung_person_inaktiv`) aus `app_config` und die Sektion "Benachrichtigungen"
       aus `Einstellungen.tsx` entfernen. Stattdessen: neue Tabelle
       `moderatoren_benachrichtigungen` (moderator_id FK, ereignis_schluessel, aktiv bool;
       Default aktiv=False) oder gleichnamige Felder direkt auf `moderatoren`. `EmailNotifier`
       statt der bisherigen `notifier_email_recipients`-Liste die hinterlegten E-Mail-Adressen
       der Moderatoren abfragen, die das jeweilige Ereignis aktiviert haben. Migration nötig
       (Alembic).

### Etappe G – Personen-Auswertung & Timeline-Details

- [ ] [Personal] Personen-Auswertungsseite: Detailansicht pro Person im Moderator-Bereich mit
      zwei Bereichen: (1) **Timeline** – alle `PersonEreignis`-Einträge der Person chronologisch
      lesbar dargestellt (Datum, Ereignistyp als lesbares Label, Detailtext), filterbar nach
      Zeitraum oder Ereigniskategorie (Einsatz/Dienstbuch/Punkte/Stammdaten). (2)
      **Punkteverlauf** – Linien- oder Flächendiagramm (z. B. `recharts` oder `chart.js`, bereits
      im Projekt vorhanden prüfen) das den kumulierten Punktestand über die gesamte Laufzeit
      zeigt; X-Achse Datum, Y-Achse Gesamtpunkte. Naheliegender Ansatz: neuer Endpunkt
      `GET /moderator/stammdaten/personen/{id}/auswertung` liefert Timeline-Einträge + eine
      aggregierte Punkteverlauf-Zeitreihe (z. B. monatliche Schnappschüsse aus
      `person_punkte`-Einträgen). Frontend: neue Route `/moderator/personal/:id` von der
      bestehenden Personal-Liste verlinkbar (Klick auf Person oder neuer "Auswertung"-Button).
- [ ] [Personal] Timeline-Einträge im Admin-Bereich (Personen-Auswertungsseite, siehe oben)
      detaillierter gestalten: Aktuell steht z. B. nur "Punkte erhalten" ohne weiteren Kontext.
      Jeder `PersonEreignis`-Eintrag soll im Admin-Bereich mehr Informationen anzeigen – bei
      Punkten z. B. Anzahl, Grund und wer sie vergeben hat; bei Einsätzen den Einsatztitel und
      die eigene Funktion/Fahrzeug; bei Dienstbüchern den Dienst-Typ. Prüfen ob das `detail`-Feld
      auf `PersonEreignis` bereits alle nötigen Infos enthält oder ob der Inhalt beim Schreiben
      der Ereignisse (z. B. in `einsatz_service`, `stammdaten_service`) um weitere Angaben
      angereichert werden muss. Für Mitglieder soll die Timeline-Darstellung separat und anders
      gestaltet werden (eigener Punkt, noch offen).

### Etappe H – Externe Kalender im Buchungskalender

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

### Etappe I – Personen-CSV-Import

- [ ] [Personal] CSV-Import für Personen, inkl. Beispieldatei zum Download (Spalten-Vorlage:
      vorname, zwischenname, nachname, email, gruppe, funktion o. ä.). Betrifft
      `Personal.tsx`/`stammdaten_service.person_anlegen()`. Sinnvoller Ansatz: neuer Endpunkt
      POST `/moderator/stammdaten/personen/csv-import`, der eine hochgeladene CSV zeilenweise
      gegen `person_anlegen()` durchläuft (inkl. der bestehenden Punkte-Vergabe/Timeline-Logik
      pro Anlage), Gruppen/Funktionen per Name auflöst (anlegen, falls nicht vorhanden, oder
      Fehler pro Zeile sammeln und am Ende als Ergebnis-Liste zurückgeben statt beim ersten
      Fehler abzubrechen). Beispieldatei als statische Datei im Frontend (z. B.
      `public/personen-vorlage.csv`) zum Download neben dem Upload-Button auf der Personal-Seite.

### Etappe J – Druck-Fallback für Einsatz-/Dienstbuch-PDF (Netzwerkdrucker per IPP)

Geklärter Scope (per Rückfrage): **nur** für die beiden Benachrichtigungen, die ohnehin schon
ein PDF anhängen (Einsatz-/Dienstbuch-Abschluss) – nicht für Buchungsanfragen, Schwellenwerte
o. ä. Standardmäßig nur als Fallback, wenn der SMTP-Versand fehlschlägt (dann wird exakt das
bereits erzeugte Anhang-PDF gedruckt, kein separates Rendering nötig); zusätzlich soll der Admin
pro Modul (Einsatz/Dienstbuch) optional "immer ausdrucken" statt nur bei Fehlschlag aktivieren
können. Zieldrucker ist ein Netzwerkdrucker mit IPP/CUPS-Unterstützung im selben LAN.

- [ ] Neue `app_config`-Schlüssel: `drucker_aktiv` (bool), `drucker_ipp_url` (str, z. B.
      `ipp://drucker.lan:631/printers/Drucker1`), `drucker_immer_einsatz` (bool, Default False),
      `drucker_immer_dienstbuch` (bool, Default False).
- [ ] Neuer `backend/app/services/druck_service.py`: Funktion `drucke_pdf(ipp_url, pdf_bytes)`,
      die das PDF per IPP an den konfigurierten Drucker schickt (z. B. mit `pyipp` oder einem
      schlanken eigenen IPP-Request über `httpx`/`requests`, je nachdem was sich ohne System-
      Abhängigkeiten wie `cups`/`pycups` im Docker-Image am einfachsten einbinden lässt – prüfen,
      welche Variante am wenigsten zusätzliche Container-Pakete braucht).
- [ ] Einhängen an den beiden bestehenden Versandstellen für Einsatz-/Dienstbuch-Abschluss-PDF
      (dort, wo `notifier_email_pdf_bei_abschluss`/`notifier_email_pdf_bei_dienstbuch_abschluss`
      ausgewertet werden): bei SMTP-Fehler (Exception beim Mailversand) und `drucker_aktiv` das
      bereits erzeugte PDF zusätzlich/stattdessen per `druck_service.drucke_pdf()` ausgeben;
      zusätzlich unabhängig vom Mailerfolg drucken, wenn `drucker_immer_einsatz` bzw.
      `drucker_immer_dienstbuch` aktiv ist. Druckfehler dürfen den Mailversand-Erfolg nicht
      verschlucken (analog zum bestehenden Best-Effort-Muster für Nebenwirkungen in diesem
      Projekt) – nur loggen, keine Exception nach außen werfen.
- [ ] Neuer ratenlimitierter Endpunkt `POST /moderator/einstellungen/testdruck` (analog zu
      `sendeTestmail`/`/moderator/einstellungen/testmail`) für einen Testdruck mit den aktuell im
      Formular stehenden Werten, bevor gespeichert wird.
- [ ] Neue Sektion in `Einstellungen.tsx` (oder eigene Unterseite, je nachdem wie groß das wird):
      "Drucker aktivieren"-Schalter, IPP-URL-Feld, je ein "Immer ausdrucken bei Einsatz-/
      Dienstbuch-Abschluss"-Checkbox, "Testdruck"-Button mit Ergebnis-Anzeige (1:1 nach dem
      Muster des bestehenden Testmail-Buttons in `NotifierEinstellungen.tsx`).
- [ ] Tests: mind. ein Test, der `druck_service.drucke_pdf()` mockt und prüft, dass bei
      simuliertem SMTP-Fehlschlag + `drucker_aktiv=True` der Druckpfad aufgerufen wird, und einer
      für den `drucker_immer_*`-Pfad unabhängig vom Mailerfolg.

## In Arbeit

## Erledigt

- [x] [Design] Frontend-Design-Modernisierung komplett abgeschlossen: Etappe 1–4 (geteilte
      Bausteine `Banner`/`Ladeanzeige`/`.formular-feld`/`.formular-zeile`, alle `<br />`-Ketten
      entfernt, Tabellen mobil scrollbar via `.tabelle-scroll`, `<Ladeanzeige />` überall
      ausgerollt) + zusätzlich Dark Mode (manueller Schalter in der Kopfzeile + System-Präferenz
      als Default, neue CSS-Variablen `--farbe-oberflaeche`/`--farbe-rand`/`--farbe-text-mute`
      etc., inkl. Nachzieh-Sweep aller inline `style={{color:"#666"/"#999"}}`-Stellen) und fluide
      Typografie (`h1`–`h3` via `clamp()`).
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
