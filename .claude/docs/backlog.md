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

### Personal-Seite: Detailansicht-Navigation auf Mobile (Screenshot-Befund)

- Status: Backlog
- Priorität: Mittel
- Kategorie: Frontend / Design / UX
- Skills: geraetehaus-patterns, review
- Beschreibung: Wählt man eine Person aus der Liste, erscheint die Detailansicht
  ganz unten – unterhalb aller anderen Personen. Auf dem Handy muss man an der
  gesamten Liste vorbeiscrollen, um zum Formular zu gelangen.
  Empfohlene Lösung: Auf Mobile (≤768 px) bei Personenauswahl die Liste ausblenden
  und **nur die Detailansicht** in voller Breite zeigen, mit einem
  „← Zurück zur Liste"-Button oben. Kein Routing-Wechsel nötig – nur ein
  `zeigeDetail: boolean`-State in `Personal.tsx`. Kein Modal, da die Detailansicht
  zu viele Felder enthält (Bild, Barcode, PIN, Dienststunden, Timeline) für ein
  Overlay. Auf Desktop (>768 px) bleibt das Side-by-Side-Layout exakt unverändert,
  da die App dort hauptsächlich genutzt wird.
- Akzeptanzkriterien: Auf Mobile wird nach Personenauswahl sofort nur noch die
  Detailansicht angezeigt (kein Scrollen durch die Liste nötig). „← Zurück"-Button
  bringt zurück zur Liste. Auf Desktop keine Änderung.
- Notizen: Betrifft `Personal.tsx` + ggf. neue CSS-Klassen in `index.css`.
  Gleiche Logik ggf. in `Listen.tsx` und `Buchungsmanagement.tsx` prüfen, falls
  dort ähnliches Master-Detail-Layout vorhanden ist.

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

### Moderator-Navigationsmenü optisch aufwerten (Screenshot-Befund)

- Status: Erledigt (Grundstruktur; Icons optional)
- Priorität: Niedrig
- Kategorie: Frontend / Design / UX
- Skills: geraetehaus-patterns, review
- Umsetzung (03.07.2026): Nav in Gruppen gegliedert (Übersicht / Verwaltung /
  Module) mit Abschnittsüberschriften im mobilen Menü; Modul-Unterseiten klar als
  eingerückte Unterpunkte unter „Module" (Verbindungslinie, aktive Linie farbig).
  Offen als optionale Erweiterung: Icons je Eintrag.
- Beschreibung: Das ausklappbare Moderator-Menü ist aktuell nur eine schmucklose,
  lange Textliste (Dashboard, Listen, Buchungen, Punkte, Personal, Stammdaten,
  Barcodes, Kiosk-Geräte, Benachrichtigungen, Einstellungen, Module,
  Berechtigungen, Update) ohne Icons, Gruppierung oder visuelle Hierarchie. Bei
  vielen Einträgen wirkt es unübersichtlich; der aktive Punkt hebt sich nur durch
  rote Schrift ab. Verbesserungsideen:
  - Pro Eintrag ein **Icon** (bestehendes Icon-Set des Projekts nutzen).
  - Einträge in **Gruppen/Abschnitte** bündeln (z. B. „Betrieb" –
    Dashboard/Listen/Buchungen/Personal; „Verwaltung/System" –
    Einstellungen/Module/Berechtigungen/Update) mit dezenten Zwischenüberschriften.
  - **Aktiven Zustand** deutlicher gestalten (farbige Fläche/Balken statt nur
    roter Text), Hover-/Touch-Feedback, klarere Abstände.
  - **Abmelden**- und **Schließen**-Button sauber im Menü-Layout verankern (aktuell
    wirken sie freistehend links neben der Liste).
- Gruppierung nach Modulen (gewünschte Struktur): Alle modulbezogenen Seiten
  sollen unter einem Sammelpunkt **„Module"** als **Unterseiten** zusammengefasst
  werden – statt jede modulbezogene Seite flach im Top-Level-Menü aufzulisten.
  Unter jedem Modul liegen dann sowohl die eigentliche Modul-Seite als auch die
  **jeweiligen (Modul-)Einstellungen** direkt beim Modul (nicht mehr verteilt in
  einer zentralen „Einstellungen"-Seite). Beispiel: „Module → Einsatztagebuch"
  bündelt Liste/Verwaltung **und** die Einsatztagebuch-Einstellungen an einer
  Stelle; analog für Dienstbuch, Fahrzeugbuchung, Barcodes, Kiosk-Geräte,
  Benachrichtigungen usw. Die Modul-Liste stammt aus der bestehenden
  `MODUL_REGISTRY` / dem Module-Bereich; Sichtbarkeit weiterhin über die
  Berechtigungen (`require_modul_zugriff` / admin) steuern.
- Akzeptanzkriterien: Menü ist visuell strukturiert (Icons + Gruppen), Module
  hängen als Unterseiten unter „Module" inkl. der jeweiligen Modul-Einstellungen,
  aktiver Punkt klar erkennbar, Abmelden/Schließen sinnvoll platziert. Keine
  organisationsspezifischen Werte hart kodiert; nur berechtigte/aktive Module
  sichtbar.
- Notizen: Betrifft `frontend/src/components/ModeratorLayout.tsx` (Nav-Rendering,
  Verschachtelung) + ggf. Routing in `App.tsx` (Unterseiten je Modul) + zugehörige
  Styles in `index.css`. Die Verschachtelung ändert Navigation/Informations-
  architektur – bei der Umsetzung prüfen, ob je Modul eigene Einstellungs-
  Unterseiten nötig sind (heute liegen viele Einstellungen zentral in
  `Einstellungen.tsx`). Keine Änderung an der Berechtigungs-/Sichtbarkeitslogik
  selbst (admin-gefilterte bzw. `require_modul_zugriff`-geschützte Einträge bleiben
  wie bisher, nur anders gruppiert).

### Logo-Vorschau verzerrt Seitenverhältnis (Screenshot-Befund)

- Status: Erledigt
- Priorität: Niedrig
- Kategorie: Bug / Frontend / Design
- Skills: bugfix, review
- Beschreibung: In den Einstellungen (Abschnitt „Organisation & Branding") wird
  das hochgeladene Logo in der Vorschau auf die volle Breite gezogen und dadurch
  horizontal verzerrt – das runde Wappen erscheint breitgedrückt. Das Logo soll
  sein **Seitenverhältnis behalten** (nicht breitziehen), z. B. `object-fit:
  contain` / `max-width: 100%` + `height: auto` mit einer sinnvollen Maximalhöhe,
  linksbündig statt volle Breite erzwingen.
- Akzeptanzkriterien: Logo-Vorschau zeigt das Bild unverzerrt im
  Original-Seitenverhältnis (kein horizontales Strecken), unabhängig von der
  Bildgröße. Auch im Mitglieder-/Kiosk-Header prüfen, ob dort dieselbe
  Verzerrung auftritt.
- Notizen: Betrifft die Logo-Vorschau in der Einstellungen-Seite
  (`frontend/src/pages/moderator/Einstellungen.tsx` bzw. zugehörige Styles in
  `index.css`). Prüfen, ob das Logo an weiteren Stellen (Header, E-Mail-Template)
  ebenfalls ohne festes Seitenverhältnis gerendert wird.

---

## Etappe E – Mitglieder-Hub Redesign (`MitgliedHub.tsx`, nur Frontend)

### Kacheln im Mitgliederbereich werden seitlich abgeschnitten (Screenshot-Befund)

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Bug / Frontend / Design
- Skills: bugfix, review
- Beschreibung: Im Mitgliederbereich (Kachel-Übersicht: Einsatzbericht,
  Dienstbuch, Dienststunden, Fahrzeugbuchung …) ragt eine Kachel links und rechts
  über den Container hinaus – am Rand sind rote Kachel-Reste sichtbar, ein Teil
  der Kachel fehlt/ist abgeschnitten (horizontaler Overflow). Ursache prüfen
  (feste Breite/`min-width` bzw. negative Margins/Grid ohne `overflow`) und die
  Kacheln vollständig innerhalb des Containers rendern.
- Akzeptanzkriterien: Alle Kacheln werden vollständig und mittig im Container
  angezeigt, kein horizontaler Overflow/keine abgeschnittenen Kacheln – auf
  schmalen Screens wie auf Desktop.
- Notizen: Betrifft `frontend/src/pages/MitgliedHub.tsx` + zugehörige Styles in
  `index.css`. Verwandt mit „Layout-Overflow auf Mobile beheben" (Etappe D) –
  bei der Umsetzung gemeinsam prüfen.

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

### Einsatzdetails: Eingaben verschwinden beim Eintippen

- Status: Erledigt
- Priorität: Hoch
- Kategorie: Bug / Frontend
- Skills: bugfix, review, tests
- Beschreibung: Beim Eingeben der Einsatzdetails (Zusatzfelder in der Garage-/Einsatz-
  Detailansicht) verschwinden plötzlich **alle bereits eingegebenen Werte**. Das darf
  nicht passieren – die Eingaben müssen erhalten bleiben. **Stable-Blocker.**
- Akzeptanzkriterien: Eingaben bleiben während des Tippens/Bearbeitens erhalten und
  gehen nicht durch Hintergrund-Aktualisierung/Timer/Reload verloren; Regressionstest
  bzw. reproduzierbarer manueller Testfall.
- Notizen: Verdachtsmomente zum Prüfen bei der Umsetzung – (a) periodische
  Aktualisierung/Polling der Einsatzansicht überschreibt den lokalen Formular-State;
  (b) der Einsatz-Countdown schließt die Garage-Ansicht bei Ablauf automatisch (README:
  „schließt die Ansicht automatisch bei Ablauf") und verwirft ungespeicherte Details;
  (c) ein Re-Render/`useEffect` setzt die Felder auf die Serverwerte zurück. Betrifft
  vermutlich `EinsatzDetail.tsx` / `EinsatzDiagramm.tsx` bzw. `EinsatzDetailModerator.tsx`.

### Divera-Import für Einsätze und Benutzer fixen

- Status: Erledigt
- Priorität: Hoch
- Kategorie: Bug / Backend
- Skills: bugfix, tests, review
- Beschreibung: Alarm-→Einsatz-Anlage und Personal-Abgleich prüfen und reparieren.
- Akzeptanzkriterien: Import legt Einsätze/Personen korrekt an; Regressionstest.
- Notizen: siehe Branch `fix/divera-api-endpunkt`.

### Benachrichtigungen vollständig einrichten/einstellbar

- Status: Erledigt
- Priorität: Hoch
- Kategorie: Feature / Backend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Kanäle + Ereignisse End-to-End prüfen und vollständig einstellbar
  machen.
- Akzeptanzkriterien: Alle Kanäle/Ereignisse funktionieren und sind konfigurierbar.
- Notizen: Knapp formuliert – vor Umsetzung konkretisieren, was genau fehlt.

### Stable-Updater tatsächlich einbauen

- Status: Erledigt
- Priorität: Hoch
- Kategorie: Feature / Backend / Frontend
- Skills: planner, geraetehaus-patterns, tests, review
- Beschreibung: Aktuell nur Info „neue Version verfügbar". Es soll ein echtes
  Update auslösbar sein (nicht nur Anzeige).
- Akzeptanzkriterien: Update per Klick anstoßbar; Fehlerbehandlung; Test.
- Notizen: `moderator_update.py` / `update_service.py` / `Update.tsx`.

### Punktesystem vollständig entfernen (inkl. Datenbank)

- Status: Erledigt
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
- Notiz (Stand 02.07.2026): Alle inhaltlichen Etappe-N-Punkte sind erledigt
  (Einsatzdetails-Bug, Divera, Benachrichtigungen, Stable-Updater, Punktesystem
  entfernt).
- Notiz (Stand 03.07.2026): Beta **0.3.0-beta.3** veröffentlicht (GitHub-Prerelease).
  Release-Checkliste dabei abgearbeitet: Datenschutz-Seite aktualisiert; README
  gegen aktuellen Stand geprüft und nachgezogen (Punktesystem entfernt, Module/
  Berechtigungen, Divera-Adresse/Meldung/Personal, Updater, Hintergrundjobs). Ein
  eigenständiges **Stable-Release** (Nicht-Prerelease) steht weiterhin aus.

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

### Frontend-Container-Healthcheck meldet „unhealthy" (IPv4/IPv6)

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Bug / Wartung / Deployment
- Skills: bugfix, review
- Beschreibung: Der Frontend-Container wird dauerhaft als „unhealthy" gemeldet,
  obwohl die App normal ausgeliefert wird (extern HTTP 200 auf Port 9112).
  Ursache: Der `HEALTHCHECK` in `frontend/Dockerfile` nutzt
  `wget -q -O- http://localhost:80/`. `localhost` löst im Container zuerst auf
  IPv6 (`::1`) auf, nginx lauscht laut `frontend/nginx.conf` aber nur auf IPv4
  (`listen 80;`) → „Connection refused" → Healthcheck schlägt fehl. Rein
  kosmetisch/Monitoring, da nichts über `depends_on: service_healthy` vom
  Frontend abhängt.
- Akzeptanzkriterien: Frontend-Container meldet `healthy`; App weiterhin normal
  erreichbar. Regressionsarm (kein funktionaler Eingriff in die Auslieferung).
- Notizen: Zwei mögliche Fixes – (a) Healthcheck auf `http://127.0.0.1:80/`
  umstellen (IPv4 erzwingen), oder (b) nginx zusätzlich auf IPv6 lauschen lassen
  (`listen [::]:80;` in `frontend/nginx.conf`). Variante (a) ist der kleinere
  Eingriff. Nach Änderung Container neu bauen und `docker inspect` prüfen.

---

## Einsatztagebuch

### Einsatz-Statistik: Jahresanzahl mit Vorjahresvergleich zum Stichtag

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Feature / Backend / Frontend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Im Einsatztagebuch die Gesamtzahl der Einsätze im **laufenden Jahr**
  anzeigen und mit dem **Vorjahr zum selben Stichtag (gleicher Tag im Jahr)**
  vergleichen. Anzeigeformat z. B. „2026: 50 Einsätze +4" – die +4 ist die Differenz
  zum Vorjahr bis zum gleichen Kalendertag (2026 hat bis 15.5. bereits 50 Einsätze,
  2025 hatte bis 15.5. 46 → +4 mehr als im Vorjahr zu diesem Zeitpunkt). Vorzeichen
  entsprechend (+/−, 0 neutral).
- Setup-Wizard: neues Feld „Wie viele Einsätze wurden im laufenden Jahr bereits
  abgearbeitet?" als **Startwert/Offset**, damit die Zählung auch bei Einführung
  mitten im Jahr stimmt (in der App erfasste Einsätze + Offset).
- Akzeptanzkriterien:
  - Einsatztagebuch zeigt „<Jahr>: <n> Einsätze <±diff>".
  - Der Vergleich nutzt den Vorjahresstand bis zum gleichen Tag im Jahr (Stichtag =
    heute).
  - Der Wizard fragt den Startwert fürs laufende Jahr ab; er fließt in die Zählung ein.
  - Backend liefert die Kennzahlen (aktuelles Jahr gesamt, Vorjahr bis Stichtag);
    Tests.
- Notizen: Startwert/Offset als `app_config`-Schlüssel (z. B. `einsatz_startwert_jahr`
  inkl. zugehörigem Jahr), im Wizard und ggf. in den Einstellungen pflegbar. „Heute/
  Stichtag" zeitzonenkorrekt (siehe Zeitzonen-Punkt in Etappe M). Zählbasis
  (angelegte vs. abgeschlossene Einsätze) bei der Umsetzung definieren.

---

## Benachrichtigungen

### Personal-Filter nach Benachrichtigungs-Freigaben

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Feature / Frontend
- Skills: geraetehaus-patterns, review
- Beschreibung: In der Personal-Liste einen Filter auf die abonnierten Ereignisse
  (Benachrichtigungs-Freigaben) ergänzen, damit man schnell sieht, **wer welche Mails
  bekommt** – z. B. „nur Personen anzeigen, die ‚Einsatz abgeschlossen' abonniert
  haben (mit aktivem Mail-Kanal)". Baut auf dem bereits vorhandenen `PersonEreignisAbo`
  + `benachrichtigungskanal_service` auf.
- Akzeptanzkriterien: In `Personal.tsx` ein Filter (z. B. Ereignis-Auswahl), der die
  Liste auf Abonnenten des gewählten Ereignisses reduziert; erkennbar, ob ein aktiver
  Mail-Kanal hinterlegt ist.
- Notizen: Backend liefert die Abos ggf. gebündelt (neuer Übersichts-Endpunkt oder pro
  Person), damit die Liste nicht viele Einzelabfragen macht.

### Web Push nutzbar machen (Frontend-Abo-Flow)

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Feature / Frontend
- Skills: geraetehaus-patterns, review
- Beschreibung: Web Push ist backendseitig fertig (Endpunkte `/push/vapid-public-key`,
  `/push/subscribe`, `/push/unsubscribe`, `PushSubscription`-Modell, `WebPushNotifier`),
  aber im Frontend fehlt der Abo-Flow: kein `serviceWorker.pushManager.subscribe()`,
  kein „Benachrichtigungen aktivieren"-Button. Dadurch entstehen keine
  `PushSubscription`-Einträge und niemand empfängt Push. Ergänzen: VAPID-Public-Key
  vom Backend holen, Notification-Permission anfragen, Push abonnieren und die
  Subscription an `POST /push/subscribe` senden (Abmelden via `/push/unsubscribe`).
- Akzeptanzkriterien: Nutzer kann Web Push aktivieren; eine Subscription wird
  gespeichert; ausgelöste Ereignisse kommen als Push an.
- Notizen: Kein Prioritätsthema. Push braucht einen **secure context (HTTPS)** – über
  LAN-HTTP evtl. nicht testbar; ohne HTTPS ggf. nur dokumentieren bzw. Option
  ausblenden. Die Kanäle E-Mail und Telegram funktionieren unabhängig davon.

---

## Berechtigungsverwaltung & Modul-System

### Granulare, individuelle Berechtigungsverwaltung als eigenständiges Modul

- Status: In Bearbeitung
- Priorität: Hoch
- Kategorie: Neues Modul / Feature / Architektur
- Skills: planner, new-module, geraetehaus-patterns, tests, review
- **Fortschritt (PR #12 gemergt & deployt, 2026-07-02):** Umsetzungsplan
  (`.claude/docs/plan-berechtigungs-modul.md`), Modul-Registry + „Module"-Seite
  (Migration 0035), Berechtigungen pro Moderator + Admin-Matrix (0036),
  Benachrichtigungskanäle pro Person (0037), Enforcement-Werkzeug
  `require_modul_zugriff` + gescharfschaltete Admin-Router (module, berechtigungen,
  personal-kanäle, einstellungen, update). Non-breaking. Migrationen live (head 0037).
- **Offen (weiter über NEUEN Branch+PR, nicht direkt auf `main`):**
  - **Frontend-Guards** rolle→berechtigung (AuthContext lädt eigene Rechte,
    `AdminRoute`/Nav prüfen `hat_zugriff` statt `istAdmin`) – sonst erreichen
    Nicht-Admins freigegebene Module in der UI nicht.
  - Restliche Router gaten: `barcodes` (pro Endpunkt, `/render` bleibt auth-frei) +
    `kiosk-geraete`, `stammdaten` (personal/stammdaten pro Endpunkt), **breaking**
    Gruppenführer-Bereiche (`buchungen`→fahrzeugbuchung, Einsatz/Dienstbuch/
    Dienststunden-Moderatoransicht). Dashboard/Listen bleiben für jeden Moderator;
    Punkte übersprungen.
  - Notifier-Wiring (Phase-3-Kanäle) + Phase 5 (altes Rollenmodell entfernen, Doku).
- Beschreibung: Berechtigungen sollen künftig **nicht rollenbasiert** (Admin/
  Gruppenführer), sondern **individuell pro Mitarbeiter und Modul** vergeben werden.
  Umsetzung als eigenständiges, erweiterbares Modul, verwaltet über eine neue
  Einstellungsseite „Module".
  - **(1) Admin-Seite „Berechtigungen"** – eine zentrale Seite (nicht über
    Unterseiten verteilt): keine rollenbasierte Vergabe; jeder Mitarbeiter erhält
    Rechte individuell. Pro Mitarbeiter alle Module einzeln auflisten, Zugriff je
    Modul separat setzbar (Checkbox/Toggle). Filter: Mitarbeiter nach vorhandener
    Berechtigung filtern (z. B. „alle mit Zugriff auf Modul X").
  - **(2) Benachrichtigungsweg pro Mitarbeiter** – bevorzugter Kanal je Mitarbeiter,
    initial E-Mail und Telegram (mit Chat-ID-Feld). Kanal-Auswahl **erweiterbar**
    aufgebaut (Registry/Interface statt Hardcoding), damit künftige Kanäle
    (SMS, Push, Slack …) ohne Umbau ergänzbar sind.
  - **(3) Neue Einstellungsseite „Module"** – alle Module zentral gelistet/verwaltet
    (Name, Beschreibung, aktiv/inaktiv). Das Berechtigungssystem selbst erscheint als
    eigenständiges Modul in dieser Liste; künftige Module registrieren sich über
    diesen Mechanismus.
- Datenmodell (Orientierung, keine feste Vorgabe): `Module` (id, key, name,
  beschreibung, aktiv); `Berechtigung` (mitarbeiter_id, modul_id);
  `Benachrichtigungskanal` (mitarbeiter_id, typ = mail/telegram/…, zielwert =
  E-Mail/Chat-ID). „Mitarbeiter" = bestehendes Personal (`Person`).
- Architektur: Feature als eigenes Modul (eigener Namespace) über die Modul-Registry
  einbinden; Berechtigungen überall über eine zentrale Prüf-Funktion/Service abfragen
  (kein verstreuter direkter Tabellenzugriff).
- UI/UX: Tabelle Mitarbeiter × Module (Checkbox je Zelle) ODER Detailansicht pro
  Mitarbeiter mit Modulliste (je nach Modulanzahl sinnvollere Variante); Filterleiste
  oben; pro Mitarbeiter Kanalauswahl inkl. Zieldaten; möglichst Inline-Speichern ohne
  Reload.
- Technischer Kontext: Backend FastAPI (async) + SQLAlchemy 2.0 + Alembic +
  PostgreSQL; Frontend React 18 + TypeScript + Vite; Modul-/Ordnerkonvention siehe
  `.claude/architecture.md`, `.claude/docs/backend.md`, `.claude/docs/frontend.md`.
- Akzeptanzkriterien (Definition of Done):
  - Admin-Seite „Berechtigungen" zeigt alle Mitarbeiter × Module.
  - Berechtigung pro Mitarbeiter/Modul einzeln setzbar; Filter nach Berechtigung
    funktioniert.
  - Benachrichtigungsweg (Mail/Telegram inkl. Chat-ID) pro Mitarbeiter einstellbar
    und erweiterbar (Kanal-Registry).
  - Einstellungsseite „Module" listet alle Module inkl. Berechtigungs-Modul.
  - Berechtigungssystem als eigenständiges Modul über Modul-Registry eingebunden.
  - Migrationen + Tests; `.claude/docs/permissions.md` und `CLAUDE.md` aktualisiert.
- Notizen:
  - **Explizit NICHT gewünscht:** rollenbasierte Vergabe; Verteilung über mehrere
    Admin-Unterseiten.
  - **Großer Umbau** – eigener Feature-Branch + PR laut Projektkonvention. Bei
    Unklarheiten zu Stack/Struktur während der Umsetzung nachfragen statt annehmen.
  - **Ersetzt/überarbeitet das aktuelle Rollenmodell** (Admin vs. Gruppenführer über
    `Moderator.rolle`, siehe `.claude/docs/permissions.md`) – Auswirkungen auf alle
    `CurrentAdmin`/`CurrentModerator`-abgesicherten Endpunkte klären; ebenso, für
    welche Nutzer (Moderatoren vs. Personen/Kiosk) die Rechte gelten.
  - Überschneidet sich mit **Etappe G** (Benachrichtigungen pro Empfänger) und
    **Etappe M** (einheitliche Modul-Architektur/Registry) – bei der Umsetzung
    zusammenführen.

---

## Archiviert (bereits erledigt – aus TODO.md übernommen)

Nur zur Nachvollziehbarkeit; nicht mehr zu tun.

**[Benachrichtigungen] Pro-Person-Zustellung (2026-07-02, PR #13 gemergt):** Pro Person
abonnierbar, welche der 6 Ereignisse sie empfängt (`PersonEreignisAbo`, Migration 0038);
`benachrichtige()` stellt nur noch an Abonnenten über deren aktive Kanäle (Mail/Telegram)
zu, PDF-Abschluss-Mails ebenso – die zentrale `notifier_email_recipients`-Liste ist damit
für Ereignis-/PDF-Mails obsolet (bleibt nur für Testmail + Buchungs-Aktionsmails an
Moderatoren). Überschneidet sich mit Etappe G (Pro-Empfänger-Benachrichtigungen).

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
(0:15) · „✓ Erfasst"-Bestätigung auf beiden Erfassungsseiten · Doppelbuchungs-Schutz
(409 bei gleicher Person+Funktion+Datum, `test_dienststunden_doppelbuchung.py`) ·
Dienststunden-Erfassung als PersonEreignis `dienststunden_erfasst` in der Timeline
(Regressionstest `test_dienststunden_timeline.py` ergänzt).

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
