# Backlog

Zentrale Aufgabenliste für Gerätehaus.app, gepflegt über den `todo`-Skill.
Aus der früheren `TODO.md` migriert (die dadurch entfällt).

Format je Aufgabe (siehe `todo`-Skill): Status · Priorität · Kategorie · Skills ·
Beschreibung · Akzeptanzkriterien · Notizen. Aufgaben sind nach **Etappen**
(zusammengehörige Arbeitsgänge) gruppiert. Erledigtes steht kompakt unter
„Archiviert".

Status-Werte: Backlog · Planung · In Bearbeitung · Review · Erledigt · Archiviert.

---

## Etappe C – Dienststunden-Erfassung touch-freundlich

### Schutz vor Doppelbuchung bei Dienststunden

- Status: Backlog
- Priorität: Hoch
- Kategorie: Bug / Backend
- Skills: bugfix, tests, review
- Beschreibung: Aktuell wird nicht geprüft, ob für Person+Datum+Funktion bereits
  ein Eintrag existiert – Mehrfachbuchung inkl. mehrfacher Punktevergabe ist möglich.
  Warnung oder Block in `dienststunden_service.erfassen()` einbauen.
- Akzeptanzkriterien: Zweite identische Buchung (Person+Datum+Funktion) wird
  verhindert bzw. deutlich gewarnt; keine doppelte Punktevergabe; Regressionstest.
- Notizen: `backend/app/services/dienststunden_service.py`.

### Dienststunden-Buchung als PersonEreignis protokollieren

- Status: Backlog
- Priorität: Mittel
- Kategorie: Feature / Backend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Dienststunden-Buchungen erscheinen nicht in der Person-Timeline
  (dort nur Funktionswechsel via `_funktion_in_stammdaten_abgleichen()`). Eigenes
  `PersonEreignis` (z. B. `"dienststunden_erfasst"`) beim Buchen ergänzen.
- Akzeptanzkriterien: Jede Erfassung erzeugt einen Timeline-Eintrag mit Dauer/
  Funktion/Datum; Regressionstest.
- Notizen: siehe `.claude/docs/timeline.md`.

### Dienstbuch-Felder analog Einsatz-Felder (+ Typ „Auswahl")

- Status: Backlog
- Priorität: Mittel
- Kategorie: Neues Modul / Feature
- Skills: planner, geraetehaus-patterns, tests, review
- Beschreibung: Konfigurierbare Zusatzfelder für Dienstbücher (Text/Mehrzeilig/
  Checkbox) plus neuer Feldtyp „Auswahl" (Dropdown mit konfigurierbaren Optionen).
  Architektur analog `EinsatzFeldDefinition` + `Einsatz.zusatzfelder`-JSONB; neues
  Modell `DienstbuchFeldDefinition` + JSONB-Spalte auf `Dienstbuch`. „Auswahl" ggf.
  gleich generisch für Einsatz- und Dienstbuch-Felder einführen.
- Akzeptanzkriterien: Felder anlegen/rendern/speichern für Dienstbuch; Typ „Auswahl"
  überall ergänzt (`ERLAUBTE_TYPEN`, `TYP_LABEL`, Typ-Union in `types.ts`,
  Rendering-Switches); Migration; Tests.
- Notizen: Größerer Umbau – eigener Feature-Branch + PR laut Projektkonvention.

---

## Etappe D – Moderator-Bereich Mobile-Optimierung

### Layout-Overflow auf Mobile beheben

- Status: Backlog
- Priorität: Mittel
- Kategorie: Bug / Frontend
- Skills: bugfix, review
- Beschreibung: Auf schmalen Screens ist rechts eine abgeschnittene Karte sichtbar
  (horizontaler Overflow). Ursache prüfen (festes `min-width` bzw. flex/grid ohne
  `overflow`); alle Moderator-Seiten auf horizontalen Scroll prüfen und beheben.
- Akzeptanzkriterien: Kein horizontaler Scroll/Overflow auf schmalen Screens.
- Notizen: Hängt mit dem (erledigten) Master-Detail-Einspaltig-Punkt zusammen.

### Personal-Liste mobile: Sticky Suche/Button

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Frontend / Design
- Skills: geraetehaus-patterns, review
- Beschreibung: „+ Person hinzufügen"-Button und Suche als Sticky-Leiste oben
  fixieren, damit man in langen Listen nicht zurückscrollen muss; Suche prominenter
  (volle Breite, direkt unter dem Titel).
- Akzeptanzkriterien: Suche/Button bleiben beim Scrollen erreichbar.
- Notizen: `Personal.tsx`.

### Dark Mode: alternatives Logo hinterlegbar

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Feature / Frontend
- Skills: geraetehaus-patterns, review
- Beschreibung: Zweites Logo-Upload-Feld in den Einstellungen, das im Dark Mode
  statt des Standard-Logos angezeigt wird.
- Akzeptanzkriterien: Im Dark Mode wird das Alternativ-Logo genutzt, sonst das
  Standard-Logo.
- Notizen: `prefers-color-scheme` bzw. vorhandener Darkmode-State in `index.css`.

---

## Etappe E – Mitglieder-Hub Redesign (`MitgliedHub.tsx`, nur Frontend)

### (1) Kompakte Profil-Zeile statt Begrüßungsblock

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Frontend / Design
- Skills: geraetehaus-patterns, review
- Beschreibung: Kompakter Streifen mit Avatar (~40 px, Bild oder Initialen), Name
  daneben, „Abmelden" als kleiner Textlink rechts – spart Höhe.
- Akzeptanzkriterien: Profil-Zeile ersetzt den großen Begrüßungsblock.
- Notizen: nur `MitgliedHub.tsx` + `index.css`.

### (2) Kacheln 2-spaltig im CSS-Grid

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Frontend / Design
- Skills: geraetehaus-patterns, review
- Beschreibung: Quadratische Kacheln (Icon oben, Label unten) analog Kiosk, auf
  schmalen Screens 2 Spalten statt Vollbreite-Stack.
- Akzeptanzkriterien: 2-spaltiges Grid auf Mobil.
- Notizen: nur `MitgliedHub.tsx` + `index.css`.

### (3) Einheitliche Kachel-Styles

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Frontend / Design
- Skills: geraetehaus-patterns, review
- Beschreibung: Keinen selektiven orangen Rand (wirkt wie hängengebliebener
  Aktiv-State); Aktiv/Hover nur bei echtem Touch/Klick.
- Akzeptanzkriterien: Konsistente Kachel-Optik ohne falschen Aktiv-Zustand.
- Notizen: nur `MitgliedHub.tsx` + `index.css`.

### (4) „Abmelden" in die Profil-Zeile integrieren

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Frontend / Design
- Skills: geraetehaus-patterns, review
- Beschreibung: Großen outlined „Abmelden"-Button entfernen, stattdessen als
  Textlink in die Profil-Zeile (siehe (1)).
- Akzeptanzkriterien: Kein prominenter Abmelden-Button mehr, Funktion in Profil-Zeile.
- Notizen: nur `MitgliedHub.tsx` + `index.css`.

---

## Etappe F – Barcode-Sicherheit

### Fahrzeugbuchung „Barcode vergessen": Profilbild/Name nach Login zeigen

- Status: Backlog
- Priorität: Mittel
- Kategorie: Frontend
- Skills: geraetehaus-patterns, review
- Beschreibung: Sobald die Person sich am Handy mit Name und PIN eingeloggt hat,
  neben dem QR-Code sofort Profilbild und Name anzeigen.
- Akzeptanzkriterien: Nach Login erscheint Bild+Name beim QR-Code der Buchung.

### „Barcode vergessen": überall Name+PIN erzwingen

- Status: Backlog
- Priorität: Hoch
- Kategorie: Bug / Sicherheit
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Überall wo „Barcode vergessen" geklickt wird, muss am Handy
  Name+PIN eingegeben werden, bevor Bilder erscheinen. Ohne PIN Option sperren und
  dies in der Personen-Timeline vermerken.
- Akzeptanzkriterien: Kein Bild-Zugriff ohne PIN-Login; PIN-lose Personen gesperrt;
  Timeline-Vermerk; Test.

---

## Etappe G – Per-Zugang-Benachrichtigungen (sequenziell)

### (1) E-Mail-Adresse pro Moderatoren-Zugang

- Status: Backlog
- Priorität: Mittel
- Kategorie: Feature / Datenbank / Backend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Neues Feld `email` auf `moderatoren` (Migration), Endpunkte
  `moderator_anlegen`/`moderator_aktualisieren` erweitern, E-Mail-Feld in
  `Einstellungen.tsx` (Bereich Admin-/Gruppenführer-Zugänge).
- Akzeptanzkriterien: E-Mail pro Moderator speicherbar; Migration; Test.
- Notizen: Voraussetzung für (2).

### (2) Benachrichtigungen pro Moderatoren-Zugang statt global

- Status: Backlog
- Priorität: Mittel
- Kategorie: Feature / Backend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Globale Schalter (`benachrichtigung_*`) und die Sektion aus
  `Einstellungen.tsx` entfernen. Neue Tabelle `moderatoren_benachrichtigungen`
  (moderator_id, ereignis_schluessel, aktiv; Default aus) oder Felder auf
  `moderatoren`. `EmailNotifier` fragt die hinterlegten Moderator-Adressen mit
  aktiviertem Ereignis ab statt `notifier_email_recipients`.
- Akzeptanzkriterien: Pro-Zugang-Steuerung wirkt; Migration; Test.
- Notizen: baut auf (1) auf.

### (3) Mitglieder-Benachrichtigungen pro Modul

- Status: Backlog
- Priorität: Mittel
- Kategorie: Feature / Backend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Statt einem `benachrichtigungen_aktiv`-Schalter pro Person je Modul
  (Einsatz/Dienstbuch/Dienststunden/Fahrzeugbuchung) separat wählbar. Neue Tabelle
  `person_benachrichtigungen` oder JSONB-Feld auf `Person`; Pro-Modul-Schalter in
  der Mitglied-Profilseite.
- Akzeptanzkriterien: Pro-Modul-Opt-in wirkt; Migration; Test.

---

## Etappe H – Personen-Auswertung & Timeline-Details

### Personen-Auswertungsseite (Timeline + Punkteverlauf)

- Status: Backlog
- Priorität: Mittel
- Kategorie: Feature / Frontend / Backend
- Skills: planner, geraetehaus-patterns, tests, review
- Beschreibung: Detailansicht pro Person mit (1) chronologischer Timeline aller
  `PersonEreignis` (filterbar) und (2) Punkteverlauf-Diagramm. Neuer Endpunkt
  `GET /moderator/stammdaten/personen/{id}/auswertung`; neue Route
  `/moderator/personal/:id`.
- Akzeptanzkriterien: Timeline + Verlauf pro Person abrufbar/verlinkt.
- Notizen: ⚠ Der Punkteverlauf-Teil kollidiert mit „Punktesystem entfernen"
  (Etappe N) – vor Umsetzung klären, ob der Punkteteil entfällt.

### Timeline-Einträge im Admin-Bereich detaillierter

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Feature / Backend / Frontend
- Skills: geraetehaus-patterns, review
- Beschreibung: `PersonEreignis`-Einträge mit mehr Kontext anzeigen (Punkte:
  Anzahl/Grund/Vergeber; Einsätze: Titel/Funktion/Fahrzeug; Dienstbuch: Typ).
  Prüfen ob `detail`-Feld reicht oder beim Schreiben angereichert werden muss.
  Mitglieder-Timeline separat/anders (eigener Punkt, offen).
- Akzeptanzkriterien: Timeline-Einträge zeigen den relevanten Kontext.
- Notizen: teilweise punktebezogen – siehe Etappe-N-Konflikt.

---

## Etappe I – Externe Kalender im Buchungskalender

### Externe/iCal-Kalender im Buchungskalender überlagern

- Status: Backlog
- Priorität: Mittel
- Kategorie: Feature / Backend / Frontend
- Skills: planner, geraetehaus-patterns, tests, review
- Beschreibung: Externe Kalender (z. B. Divera) per Einstellungen hinterlegen und
  zusätzlich zu eigenen Buchungen im Kalender anzeigen; Konflikterkennung soll
  externe Termine berücksichtigen. iCal-/webcal-URL in app_config, serverseitig
  parsen (`icalendar`), als nicht buchbare Fremdtermine überlagern.
- Akzeptanzkriterien: Fremdtermine sichtbar; Konfliktprüfung bezieht sie ein.
- Notizen: `BuchungsKalender.tsx`, `buchung_service.hat_konflikt()`; prüfen ob
  Divera Termine direkt über die API statt iCal liefert.

---

## Etappe J – Personen-CSV-Import

### CSV-Import für Personen inkl. Beispieldatei

- Status: Backlog
- Priorität: Mittel
- Kategorie: Feature / Backend / Frontend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Neuer Endpunkt `POST /moderator/stammdaten/personen/csv-import`,
  der eine CSV zeilenweise über `person_anlegen()` verarbeitet (inkl. Punkte/
  Timeline), Gruppen/Funktionen per Name auflöst, Fehler pro Zeile sammelt statt
  abzubrechen. Beispiel-CSV als statische Datei zum Download neben dem Upload-Button.
- Akzeptanzkriterien: CSV-Upload legt Personen an, Fehlerreport pro Zeile;
  Beispieldatei verfügbar; Test.

---

## Etappe K – Druck-Fallback für Einsatz-/Dienstbuch-PDF (Netzwerkdrucker per IPP)

Geklärter Scope: **nur** für die beiden Benachrichtigungen mit PDF-Anhang (Einsatz-/
Dienstbuch-Abschluss). Standard: Fallback, wenn SMTP fehlschlägt (druckt das bereits
erzeugte Anhang-PDF); zusätzlich pro Modul optional „immer ausdrucken". Zieldrucker:
Netzwerkdrucker mit IPP/CUPS im LAN.

### Druck-Fallback per IPP (gesamtes Feature)

- Status: Backlog
- Priorität: Mittel
- Kategorie: Feature / Backend / Frontend
- Skills: planner, geraetehaus-patterns, tests, review
- Beschreibung / Teilschritte:
  1. Neue app_config-Schlüssel: `drucker_aktiv` (bool), `drucker_ipp_url` (str),
     `drucker_immer_einsatz` (bool, Default False), `drucker_immer_dienstbuch`
     (bool, Default False).
  2. Neuer `druck_service.py` mit `drucke_pdf(ipp_url, pdf_bytes)` (IPP via `pyipp`
     oder schlanker eigener Request – minimale Container-Abhängigkeiten prüfen).
  3. An den beiden PDF-Versandstellen einhängen: bei SMTP-Fehler + `drucker_aktiv`
     drucken; unabhängig vom Mailerfolg bei `drucker_immer_*`. Druckfehler nur
     loggen (Best-Effort, keine Exception nach außen).
  4. Ratenlimitierter Endpunkt `POST /moderator/einstellungen/testdruck` (analog
     Testmail).
  5. UI-Sektion in `Einstellungen.tsx` (Schalter, IPP-URL, „immer ausdrucken"-
     Checkboxen, Testdruck-Button) analog Testmail in `NotifierEinstellungen.tsx`.
- Akzeptanzkriterien: Fallback- und „immer"-Pfad funktionieren; Testdruck-Button;
  Tests für SMTP-Fehlschlag→Druck und `drucker_immer_*`-Pfad (druck_service gemockt).

---

## Etappe L – Dienstbuch „Relevant"-Markierung + Mindest-Dienstbeteiligung

### Dienstbuch-Eintrag als „relevant" markieren

- Status: Backlog
- Priorität: Mittel
- Kategorie: Feature / Datenbank / Backend / Frontend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Neues Bool-Feld `relevant` auf `Dienstbuch`; Endpunkt
  `PATCH /moderator/dienstbuecher/{id}/relevant` (CurrentModerator); Button in der
  Dienstbuch-Detailansicht.
- Akzeptanzkriterien: Markierung setz-/rücksetzbar; Migration; Test.

### Anzahl relevanter Dienste pro Person abrufbar

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Feature / Backend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Query-Parameter/Endpunkt für die Anzahl relevanter Dienste pro
  Person – Grundlage für ein späteres Mindest-Dienstbeteiligungs-Modul.
- Akzeptanzkriterien: Wert abrufbar; Test.

---

## Etappe M – Modul-Architektur & Zeitzone (Feature-Branch + PR erforderlich)

### Einheitliche Modul-Bereiche (Mitglied/Moderator/Admin)

- Status: Backlog
- Priorität: Mittel
- Kategorie: Architektur / Dokumentation
- Skills: planner, geraetehaus-patterns, review
- Beschreibung: Jedes Modul soll drei Bereiche haben: (1) Mitglieder/Kiosk,
  (2) Moderator/Gruppenführer, (3) Admin (Einstellungen; konfigurierbar: Moderator-
  Schreibrechte, Außenzugriff). Bestehende Module auf Konformität prüfen und
  fehlende Admin-Einstellungen nachrüsten; Konvention in `CLAUDE.md` dokumentieren.
- Akzeptanzkriterien: Module konform; Konvention dokumentiert.

### Modul-Erweiterbarkeit: Checkliste in CLAUDE.md

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Dokumentation
- Skills: knowledge-management
- Beschreibung: Checkliste für neue Module (Router, Service, Migration,
  `modul_*`-Config-Keys, Frontend-Route, Kiosk-/Hub-Kachel, Benachrichtigungs-Hook)
  in `CLAUDE.md`. Prüfen ob ein eigener Skill sinnvoll ist.
- Akzeptanzkriterien: Checkliste vorhanden.
- Notizen: Teil-Überschneidung mit dem bestehenden `new-module`-Skill.

### Zeitzone durchgängig Europe/Berlin

- Status: Backlog
- Priorität: Mittel
- Kategorie: Feature / Backend / Frontend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Backend (Server, DB-Timestamps, Scheduler) und Frontend-Anzeige
  durchgängig Europe/Berlin statt UTC/Server-Zeit; DB speichert weiter UTC. Neuer
  app_config-Schlüssel `zeitzone` (Default `Europe/Berlin`); zentrale Konvertierung
  UTC→Zeitzone (nicht pro Modul), inkl. Sommer-/Winterzeit. Kein Setup-Wizard-Feld.
- Akzeptanzkriterien: Anzeige/Speicherung zeitzonenkorrekt; Test.

---

## Etappe N – Stable-Release: Bugfixes & Aufräumen (Priorität hoch)

Release-Direktive: Ziel ist ein **Stable-Release**. Vor dem Release keine neuen
Features mehr einbringen – nur diese Fixes/Aufräumarbeiten (Feature-Freeze).

### Divera-Import für Einsätze und Benutzer fixen

- Status: Backlog
- Priorität: Hoch
- Kategorie: Bug / Backend
- Skills: bugfix, tests, review
- Beschreibung: Alarm-→Einsatz-Anlage und Personal-Abgleich prüfen und reparieren.
- Akzeptanzkriterien: Import legt Einsätze/Personen korrekt an; Regressionstest.
- Notizen: siehe Branch `fix/divera-api-endpunkt`.

### Benachrichtigungen vollständig einrichten/einstellbar

- Status: Backlog
- Priorität: Hoch
- Kategorie: Feature / Backend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Kanäle + Ereignisse End-to-End prüfen und vollständig einstellbar
  machen.
- Akzeptanzkriterien: Alle Kanäle/Ereignisse funktionieren und sind konfigurierbar.
- Notizen: Knapp formuliert – vor Umsetzung konkretisieren, was genau fehlt.

### Stable-Updater tatsächlich einbauen

- Status: Backlog
- Priorität: Hoch
- Kategorie: Feature / Backend / Frontend
- Skills: planner, geraetehaus-patterns, tests, review
- Beschreibung: Aktuell nur Info „neue Version verfügbar". Es soll ein echtes
  Update auslösbar sein (nicht nur Anzeige).
- Akzeptanzkriterien: Update per Klick anstoßbar; Fehlerbehandlung; Test.
- Notizen: `moderator_update.py` / `update_service.py` / `Update.tsx`.

### Punktesystem vollständig entfernen (inkl. Datenbank)

- Status: Backlog
- Priorität: Hoch
- Kategorie: Wartung / Backend / Datenbank / Frontend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Punktesystem restlos entfernen: Tabelle `person_punkte` per
  Migration droppen, `PersonPunkt`-Model, Punkte-Services/-Endpunkte, alle
  `punkte_*`-Config-Keys, Frontend `PunkteEinstellungen.tsx` + Route
  `/moderator/punkte`, `punkte_ablauf`-Job.
- Akzeptanzkriterien: Keine Punkte-Funktionalität/-Referenzen mehr; Migration;
  Tests grün.
- Notizen: Zieht Anpassungen an Etappe-H-Aufgaben (Punkteverlauf/Timeline) nach sich.

### Stable-Release vorbereiten (Release-Checkliste)

- Status: Backlog
- Priorität: Hoch
- Kategorie: Wartung / Release
- Skills: review, tests
- Beschreibung: Nach Erledigung obiger Punkte Version finalisieren; Feature-Freeze
  einhalten.
- Akzeptanzkriterien (Release-Checkliste, siehe `.claude/CLAUDE.md` „Vor einem
  Release"): **Datenschutz-Seite (`frontend/src/pages/Datenschutz.tsx`) prüfen und
  an die aktuelle Datenverarbeitung anpassen – darf nie vergessen werden**;
  `scripts/test-backend.sh` (pytest) + `npm run build` fehlerfrei.

---

## Etappe O – Repo/Doku aufräumen (Priorität niedrig)

### `.claude/settings.json` Permission-Allowlist

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Dokumentation / Wartung
- Skills: knowledge-management
- Beschreibung: `.claude/settings.json` ist leer – Permission-Allowlist für
  Routine-Kommandos (pytest, `npm run build`, `git`, `docker compose`) ergänzen.
- Akzeptanzkriterien: Häufige Kommandos ohne wiederholte Nachfrage nutzbar.

---

## Archiviert (bereits erledigt – aus TODO.md übernommen)

Nur zur Nachvollziehbarkeit; nicht mehr zu tun.

**[Barcode] Bug behoben (2026-07-02):** Ein für eine Person erzeugter/kopierter
Barcode galt beim Scannen als abgelaufen, weil `barcode_service.token_fuer_person()`
einen bereits abgelaufenen Token unverändert zurückgab. Fix: abgelaufener Token wird
frisch erzeugt (`barcode_erneuern`). Auto-Erneuerung + Mail bei Ablauf existierten
bereits (Tagesjob `barcode_erneuerung` + Hintergrund-Mail beim Scannen eines
abgelaufenen Barcodes). 2 Regressionstests in `test_barcode_auth.py`.

**Etappe A – Quick Fixes:** Update-Versionsvergleich (PEP-440↔Semver) normalisiert ·
Abstand unter Aktions-Buttons vereinheitlicht · Dienstbuch Mitglied: Gruppe
vorgewählt · Dienststunden-Liste zeigt Namen statt IDs · Punkte-Übersicht: irre­
führender Text entfernt · Fahrzeug-Feld „ISSI" ergänzt · Namensabweichungs-Feature
geprüft · `EmailNotifier` Empfänger-Logik geprüft.

**Etappe B – Dienststunden-Politur:** Schwellenwert nach oben/Liste nach unten ·
Dashboard-Anzeige aktualisiert sich nach Erfassung · Aktualisierung nach Übernahme ·
Klick auf Überschreitung → Listen/Dienststunden · Mail nach Stundenerfassung ·
Schwellenwert-Berechnung im Dashboard geprüft.

**Etappe C:** Touch-freundliche Stunden-Erfassung (Chips + Stepper) · 15-Min-Chip
(0:15) · „✓ Erfasst"-Bestätigung auf beiden Erfassungsseiten.

**Etappe D:** Moderator-Navigation mobil (Hamburger) · Master-Detail einspaltig auf
Mobil · Seitenkopf/Buttons stapeln · Detail-Aktionsbuttons vereinheitlicht ·
Detail-Formularfelder responsive · Personenliste A-Z + Filter (keine Mail / kein
Bild / Benachrichtigungen).

**Etappe N:** Kiosk-Barcode-Scan = Einmal-Bestätigung statt Login
(`barcodeEinscannenEinmalig`/`kioskScanBeenden`).

**Etappe O:** Verwaiste `tmp.md`/`notizen.tmp` entfernt.

**Früher erledigt:** Frontend-Design-Modernisierung (geteilte Bausteine, Dark Mode,
fluide Typografie) · „zufällig eingeloggt"-Bug + `POST /auth/abmelden` · Punkte-
Belohnung durch Moderatoren · Scan-Töne (`useBarcodeSound`) · Buchungsanfrage-Mail
mit Annehmen/Ablehnen-Buttons (Token) · HTML-Mails im Website-Design · Setup-Wizard-
Geofence-Bug entfernt · Update-Anzeige stable/beta · Opt-in Sentry-Fehlerberichte ·
Backend-Testsuite + Pflege-Policy · Sicherheits-Response-Header · Rate-Limiting
öffentlicher Endpunkte · QR-Login-Fix (Service-Worker) · Schwellenwert-Liste mit
Stunden-Übernahme · Mitglied-Login ohne erneuten Scan · Kamera-Icon an Barcode-
Feldern · Admin-Passwort-Gate entfernt · Footer-Link · Namensabweichungen admin-only ·
Dienstbuch-Detailseite · Benachrichtigungen individuell pro Person · Barcode-
Gültigkeit einstellbar · Mitglied-Kacheldesign wie Kiosk · Logo-Klick zielgenau ·
Dienststunden `ResponseValidationError`-Fix · Divera-Personal-Abgleich-Fix
(`data.cluster.consumer`) · Divera-Personal-Vorschläge auf der Personal-Seite.
</content>
