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

- [x] [Update] Bug: Installierte Version (`0.3.0b1`, PEP-440-Format aus `pyproject.toml`) und
      verfügbare Version (`0.3.0-beta.1`, Semver aus GitHub-Releases-API) bezeichnen dieselbe
      Version, werden aber unterschiedlich formatiert – dadurch zeigt die Seite fälschlicherweise
      „neue Version verfügbar" an. Fix: beim Vergleich beide Formate auf einen gemeinsamen
      Nenner normalisieren (z. B. `0.3.0b1` → `0.3.0-beta.1` oder umgekehrt) bevor verglichen
      wird. Alternativ `pyproject.toml`-Version von vornherein in Semver-Format pflegen.
      Betrifft `app/api/v1/update.py` oder wo der Versionsvergleich stattfindet.

- [x] [Design] Abstand unter Aktions-Buttons vor dem nächsten Inhaltsbereich: Im Einsatztagebuch
      fehlt unter dem „Neuer Einsatz"-Button der visuelle Abstand bevor die Einsatzliste beginnt.
      Dasselbe Muster in allen anderen Modulen prüfen und vereinheitlichen (Dienstbuch: „Neuer
      Dienst", Dienststunden: „Stunden erfassen", Fahrzeugbuchung: „Neue Buchung" o. ä.).
      Lösung: einheitlicher `margin-bottom` auf den jeweiligen Button-Bereich bzw. einen
      Trenner-Abstand als CSS-Klasse (z. B. `.abschnitt-trenner`), damit überall dieselbe
      optische Trennung zwischen Eingabe-/Aktionsbereich und Listenbereich entsteht.
- [x] [Dienstbuch] Bug: Im Mitglieder-Bereich ist beim Dienstbuch die Gruppe der eingeloggten
      Person nicht vorgewählt. Beim Laden der Seite sollte die Gruppe aus dem Personenprofil
      (`CurrentPerson`) automatisch als Standardwert im Gruppen-Dropdown gesetzt werden.
      Betrifft die Dienstbuch-Seite im Mitglieder-Bereich (`pages/dienstbuch/` o. ä.).
- [x] [Dienststunden] In der Liste sollen nicht die Personen-IDs angezeigt werden, sondern der
      richtige Name, dasselbe mit der Funktion.
- [x] [Punkte] Punkte in der Moderator-Übersicht: unter der Eingabe darf nicht mehr der Text
      "Die automatischen Punkte-Regeln (unten) kann nur ein Admin einsehen und ändern." stehen!
- [ ] [Stammdaten] Fahrzeuge: neues Feld „ISSI" (Integer) in den Fahrzeug-Stammdaten ergänzen
      (Migration + Formular in `Stammdaten.tsx`). Keine Logik, nur Datenbankfeld – Vorbereitung
      für zukünftige Fahrzeugstatus-Anbindung.
- [ ] [Listen] Namensabweichungs-Feature prüfen: testen ob die bestehende „Namen weichen ab"-Anzeige
      in Listen noch korrekt funktioniert. Falls nicht: entscheiden ob Reparatur oder Entfernung.
      (Hinweis: Feature ist für Admins sichtbar, für Gruppenführer schon ausgeblendet.)
- [ ] [Benachrichtigungen] Bug: Personen-Benachrichtigungs-Mails gehen aktuell an die zentrale
      Testmail-Adresse statt an die hinterlegte E-Mail der Person. Betrifft `EmailNotifier` –
      prüfen ob der Empfänger korrekt aus `Person.email` gelesen wird und nicht versehentlich
      `notifier_email_recipients` (Moderator-Testmail) genutzt wird.

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
- [x] Sende der Person eine Mail, wenn die Stunden eingetragen wurden.
- [ ] Bug: Schwellenwert-Berechnung im Dashboard (`/moderator/dashboard`) prüfen – sowohl ob
      der korrekte Summenwert (nach Übernahmen) genutzt wird, als auch ob die Anzeige sich nach
      einer Übernahme live aktualisiert.

### Etappe C – Dienststunden-Erfassung touch-freundlich (größeres UI-Rework)

- [x] Stunden-Erfassung touch-freundlicher und präziser gestalten: Das aktuelle
      `<input type="number">`-Feld ist auf dem Handy umständlich. Vorschlag: Schnellauswahl-Chips
      für häufige Werte (0:30 · 1:00 · 1:30 · 2:00 · 3:00 · 4:00) als tippbare Kacheln-Reihe,
      darunter ein Feineinstellungs-Stepper (− / Anzeige / +) in 15-Min.-Schritten für
      Zwischenwerte. Die Anzeige erfolgt im Format "2 Std. 30 Min." statt als Dezimalzahl.
      Intern weiterhin als Dezimalstunden (float) an die API übergeben. Betrifft
      `Dienststunden.tsx` (Bereich "Stunden erfassen"), keine Backend-Änderung nötig.
- [ ] [Dienststunden] Bei der Stunden-Erfassung fehlt ein Schnellauswahl-Button für 15 Minuten
      (0:15) – bisher gibt es nur 0:30 als kleinsten Chip. Betrifft `Dienststunden.tsx` (Bereich
      "Stunden erfassen", Schnellauswahl-Chips aus dem Eintrag oben).
- [ ] [Dienststunden] Nach dem Buchen eine klare Bestätigung/Liste der eigenen letzten Einträge
      zeigen statt nur die kumulierten Summen – aktuell sieht man nicht auf einen Blick, welche
      Buchung gerade erfasst wurde. Betrifft `Dienststunden.tsx` (zeigt nur Summen-Tabelle) und
      `DienststundenManuelleEintragung.tsx` (zeigt nur statisches "Eingetragen!" ohne Details).
- [ ] [Dienststunden] Schutz vor Doppelbuchung: Aktuell wird nicht geprüft, ob für
      Person+Datum+Funktion bereits ein Eintrag existiert – Mehrfachbuchung (inkl. mehrfacher
      Punktevergabe) ist möglich. Warnung oder Block einbauen in
      `dienststunden_service.erfassen()` (backend/app/services/dienststunden_service.py).
- [ ] [Dienststunden] Dienststunden-Buchungen werden nicht als eigenes Ereignis in der
      Person-Timeline protokolliert – aktuell wird dort nur ein Funktionswechsel festgehalten
      (`_funktion_in_stammdaten_abgleichen()`), nicht die Buchung selbst. Eigenes PersonEreignis
      (z. B. `"dienststunden_erfasst"`) beim Buchen ergänzen.
- [ ] [Dienstbuch] Dienstbuch-Felder analog zu den bestehenden Einsatz-Feldern (Stammdaten)
      einführen: konfigurierbare Zusatzfelder für Dienstbücher mit denselben Grundtypen
      (Text, Mehrzeilig, Checkbox) PLUS neuer Feldtyp "Auswahl" (Dropdown mit konfigurierbaren
      Optionen). Architektur kann sich eng an `EinsatzFeldDefinition`
      (`backend/app/models/einsatz_feld.py`) + `Einsatz.zusatzfelder`-JSONB-Muster anlehnen,
      analog für `Dienstbuch` (neues Modell `DienstbuchFeldDefinition` + JSONB-Spalte auf
      `Dienstbuch`). Der neue Typ "Auswahl" braucht zusätzlich eine Liste konfigurierbarer
      Optionen pro Felddefinition (z. B. neue Spalte `optionen: list[str]` als JSON) und muss
      an allen Stellen ergänzt werden, die bisher zwischen text/mehrzeilig/checkbox
      unterscheiden: `ERLAUBTE_TYPEN` (`backend/app/schemas/einsatz_feld.py:5`, bzw. das neue
      `dienstbuch_feld.py`-Äquivalent), `TYP_LABEL` in `Stammdaten.tsx:328-332` (bzw. neuer
      Dienstbuch-Felder-Tab), Typ-Union in `frontend/src/api/types.ts:141`, und die
      Rendering-Switches (analog `EinsatzDiagramm.tsx:405-437` /
      `EinsatzDetailModerator.tsx:132-162`, für Dienstbuch entsprechend
      `Dienstbuch.tsx`/Detail-Ansicht). Da "Auswahl" als neuer Typ auch für Einsatz-Felder
      sinnvoll wäre, ggf. gleich generisch für beide Module einführen statt nur für Dienstbuch.
      Größerer Umbau – eigener Feature-Branch + PR laut Projektkonvention für neue Module.

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
- [ ] [Personal] Personenliste alphabetisch sortieren (Standard: A-Z nach Name) + erweiterte
      Filteroptionen: „keine Mail hinterlegt", „Benachrichtigungen erlaubt/nicht erlaubt",
      „kein Profilbild". Betrifft `Personal.tsx` (Filter-UI) + optionaler Query-Parameter
      am GET-Endpunkt für serverseitiges Filtern.
- [ ] [Design] Dark Mode: alternatives Logo hinterlegen können – zweites Logo-Upload-Feld in
      den Einstellungen, das im Dark Mode statt dem Standard-Logo gezeigt wird (CSS
      `prefers-color-scheme`-aware oder über den vorhandenen Darkmode-State in `index.css`).

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

### Etappe F – Punkte- & Barcode-Sicherheit

- [ ] [Punkte] Punkte-Einstellungen nach Modulen gruppieren (`PunkteEinstellungen.tsx`):
      Aktuell werden alle Punkteregeln in einer flachen Liste angezeigt. Neu: zuerst ein
      Abschnitt **„Allgemein"** für modulunabhängige Regeln (z. B. Belohnungen, manuelle
      Vergabe), dann je ein Abschnitt pro Modul (Einsatztagebuch, Dienstbuch, Dienststunden,
      Fahrzeugbuchung) – aber nur angezeigt, wenn das jeweilige Modul in den Einstellungen
      aktiv ist (`modul_*_aktiv` aus `app_config`/`ConfigContext`). Inaktive Module werden
      komplett ausgeblendet, damit keine verwaisten Regeln sichtbar sind. Reihenfolge der
      Abschnitte: Allgemein → Einsatztagebuch → Dienstbuch → Dienststunden → Fahrzeugbuchung.
      Kein Backend-Änderung nötig, nur Frontend-Umstrukturierung.
- [ ] [Punkte] Personen-Auswahl bei Punkte-Vergabe als Namenssuche statt Dropdown: Aktuell
      ist die Empfänger-Auswahl ein `<select>`-Dropdown, das bei vielen Personen unhandlich
      wird. Ersetzen durch eine Echtzeit-Namenssuche (Textfeld + gefilterter Listenvorschlag
      darunter) analog zur Personenauswahl auf der „Barcode vergessen"-Seite. Betrifft
      `PunkteEinstellungen.tsx` o. ä., kein Backend-Änderung nötig (Personenliste wird
      bereits geladen).
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
- [ ] [Punkte] Punkte-Belohnung für Moderatoren begrenzen: maximale Punktzahl pro Vergabe
      konfigurierbar im Admin-Bereich (neuer `app_config`-Schlüssel `punkte_belohnung_max`).
      Verhindert, dass Gruppenführer beliebig viele Punkte auf einmal vergeben.
- [ ] [Punkte] Punkte-Zeitraum-Auswertung: Ansicht „wie viele Punkte hat eine Person im
      Zeitraum Von–Bis gesammelt?" (ohne Gültigkeitsverfall zu berücksichtigen). Naheliegend
      als Filter in der Personen-Auswertungsseite (Etappe H) oder eigenem Auswertungsbereich.

### Etappe G – Per-Zugang-Benachrichtigungen (zwei Schritte, sequenziell)

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
3. [ ] [Benachrichtigungen] Mitglieder-Benachrichtigungen pro Modul: Aktuell gibt es einen
       einzigen `benachrichtigungen_aktiv`-Schalter pro Person. Stattdessen sollen Mitglieder
       pro Modul (Einsatz, Dienstbuch, Dienststunden, Fahrzeugbuchung, Punkte) separat wählen
       können. Backend: neue Tabelle `person_benachrichtigungen` (person_id, modul, aktiv) oder
       JSONB-Feld auf `Person`; Frontend: Pro-Modul-Schalter in der Mitglied-Profilseite.

### Etappe H – Personen-Auswertung & Timeline-Details

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

### Etappe I – Externe Kalender im Buchungskalender

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

### Etappe J – Personen-CSV-Import

- [ ] [Personal] CSV-Import für Personen, inkl. Beispieldatei zum Download (Spalten-Vorlage:
      vorname, zwischenname, nachname, email, gruppe, funktion o. ä.). Betrifft
      `Personal.tsx`/`stammdaten_service.person_anlegen()`. Sinnvoller Ansatz: neuer Endpunkt
      POST `/moderator/stammdaten/personen/csv-import`, der eine hochgeladene CSV zeilenweise
      gegen `person_anlegen()` durchläuft (inkl. der bestehenden Punkte-Vergabe/Timeline-Logik
      pro Anlage), Gruppen/Funktionen per Name auflöst (anlegen, falls nicht vorhanden, oder
      Fehler pro Zeile sammeln und am Ende als Ergebnis-Liste zurückgeben statt beim ersten
      Fehler abzubrechen). Beispieldatei als statische Datei im Frontend (z. B.
      `public/personen-vorlage.csv`) zum Download neben dem Upload-Button auf der Personal-Seite.

### Etappe K – Druck-Fallback für Einsatz-/Dienstbuch-PDF (Netzwerkdrucker per IPP)

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

### Etappe L – Dienstbuch „Relevant"-Markierung + Mindest-Dienstbeteiligung

- [ ] [Dienstbuch] Gruppenführer/Admin können einen Dienstbuch-Eintrag nachträglich als
      „relevant" markieren (neues Bool-Feld `relevant` auf `Dienstbuch`). Neue Endpunkte
      `PATCH /moderator/dienstbuecher/{id}/relevant` (CurrentModerator) und entsprechender
      Button in der Dienstbuch-Detailansicht (Moderator-Bereich).
- [ ] [Dienstbuch] Relevante Dienste bringen Extrapunkte: neue Punktregel `dienstbuch_relevant`
      (analog `dienstbuch`), wird beim Markieren als relevant ausgelöst (nur einmalig, nicht
      retroaktiv beim Abmelden).
- [ ] [Dienstbuch] Anzahl relevanter Dienste pro Person exportierbar/abrufbar: neuer
      Query-Parameter oder eigener Endpunkt – Grundlage für ein späteres Modul zur
      Mindest-Dienstbeteiligung.

### Etappe M – Punkte-Modul & Modul-Architektur (Feature-Branch + PR erforderlich)

- [ ] [Punkte] Punkte als eigenständiges Modul: eigener Admin-Einstellungsbereich, Rangliste,
      vollständige Punkthistorie, Benachrichtigungs-Konfiguration pro Person. Alles was mit
      Punkte zu tun hat wird unter diesem Modul zusammengefasst. Betrifft
      `PunkteEinstellungen.tsx`, neue Route `/moderator/punkte`, `app_config`-Schlüssel
      `modul_punkte_aktiv`/`_startseite`/`_aussenzugriff` (analog anderen Modulen).
- [ ] [Architektur] Jedes Modul braucht einheitlich drei Bereiche:
      (1) Mitglieder/Kiosk, (2) Moderator/Gruppenführer, (3) Admin (Einstellungen).
      Im Admin-Bereich konfigurierbar: ob Moderator Schreibrechte hat, ob Außenzugriff erlaubt ist.
      Bestehende Module (Einsatz, Dienstbuch, Dienststunden, Fahrzeugbuchung, Divera) auf
      Konformität prüfen und ggf. fehlende Admin-Einstellungen nachrüsten. Diese Konvention
      in `CLAUDE.md` dokumentieren.
- [ ] [Architektur] Modul-Erweiterbarkeit: Checkliste für neue Module in `CLAUDE.md` anlegen
      (Backend-Router, Service, Migration, `modul_*`-Config-Keys, Frontend-Route, Kiosk-Kachel,
      Mitglied-Hub-Kachel, Benachrichtigungs-Hook, Punkte-Regeln). Prüfen ob daraus ein
      Claude-Code-Skill sinnvoll wäre.
- [ ] [Allgemein] Zeitzone überprüfen: Backend (Server, DB-Timestamps, APScheduler-Jobs) und
      Frontend-Anzeige sollen durchgängig mit Europe/Berlin statt UTC oder Server-Lokalzeit
      arbeiten. Prüfen, ob Zeitstempel beim Speichern/Anzeigen (Dienststunden, Dienstbuch,
      Einsätze, Buchungen, Punkte-Historie etc.) korrekt konvertiert werden, inkl. Sommer-/
      Winterzeit-Wechsel. Datenbank speichert weiterhin in UTC0 (Best Practice); neue
      Einstellung `app_config`-Schlüssel `zeitzone` (Admin-Bereich), Default `Europe/Berlin`.
      Konvertierung UTC → eingestellte Zeitzone zentral an einer Stelle (Backend-Serialisierung
      bzw. Frontend-Formatierung), nicht pro Modul einzeln. Muss NICHT im Setup-Wizard
      abgefragt werden – Default Berlin passt erstmal immer, Einstellung reicht im
      Admin-Bereich nachträglich.

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
- [x] [Dienststunden] Bug: `POST /api/v1/dienststunden` warf `ResponseValidationError` wegen
      fehlender `person_name`/`funktion_name`-Felder – `dienststunden_service.erfassen()` gab
      das rohe ORM-Objekt zurück statt `DienststundenEintragOut`. Fix: Namen nach Commit nachladen
      und direkt als `DienststundenEintragOut` zurückgeben (auch von `reservierung_einloesen()`).
- [x] [Divera] Bug: Divera-Personal-Abgleich synchronisierte keine Personen – `hole_personal()`
      las `data.user` (nur das Profil des API-Key-Inhabers, ein einzelnes Objekt), stattdessen
      muss `data.cluster.consumer` (alle Cluster-Mitglieder als Dict user_id → user_object)
      verwendet werden. Fix: Endpunkt-Pfad und Extraktion in `divera_client.py` korrigiert.
- [x] [Personal] Divera-Personal-Abgleich: Button "Vorschlag" auf der Personal-Seite zeigt neue
      Divera-Personen (Übernehmen/Ignorieren) und E-Mail-Aktualisierungsvorschläge für bestehende
      Personen. Matching per neuem Feld `divera_user_id` (Fallback: Name). Täglicher
      Hintergrund-Sync zu zufälliger Nachtstunde plus Sync bei Button-Klick. Ignorierte/
      übernommene Vorschläge bleiben dauerhaft ausgeblendet und werden nach 1 Jahr aufgeräumt.
