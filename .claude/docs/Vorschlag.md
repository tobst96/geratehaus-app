# Vorschläge zur Optimierung – Gerätehaus.app

> **Zweck.** Ideensammlung zur Weiterentwicklung, pro Modul + querschnittlich.
> **Nur Vorschläge – nichts hiervon ist umgesetzt.** Von hier aus können einzelne
> Punkte über den `todo`-Skill in den Backlog (`.claude/docs/backlog.md`) überführt
> und dann implementiert werden.
>
> **Legende:** Nutzen `⭐` (1–3), Aufwand `S`/`M`/`L`. Stand: 05.07.2026 (nach
> Formular-Ausbau, Migrationen bis 0051).

---

## ★ Priorisierte Sicherheits-Roadmap (Rückmeldung 05.07.2026)

**Kontext:** Instanz ist **voll öffentlich über HTTPS**, **eine überschaubare Wehr
(<100 Mitglieder)**, **Datenschutz soll zentral automatisiert** werden. Gewünschter
Fokus: **Sicherheit/Berechtigungen, UX/Mobile/Kiosk, Stabilität/Betrieb**
(Statistik & Mandantenfähigkeit vorerst nachrangig). Keine akuten Bugs – proaktiv.

### ⚠ SOFORT / höchste Priorität – Öffentliche API absichern (05.07.2026)

> **✅ Phase 1 umgesetzt (05.07.2026, PR `feature/api-absichern`):** Gate
> `require_zugriff` (Kiosk-Token `X-Kiosk-Token` / Moderator / Mitglieds-Cookie) als
> Router-Level-Dependency auf `einsaetze`, `dienstbuecher`, `dienststunden`,
> `buchungen`, `stammdaten`; Frontend sendet den Kiosk-Token; `zusatzfelder`-Write
> geschlossen. Tests `test_api_zugriff.py`. **Offen (Phase 2):** echte signierte
> Mitglieder-Session statt setzbarem Namens-Cookie; `GET /auth/personen`-Namensliste;
> Divera-Webhook-Secret aus der URL.

**Befund (vom Nutzer über Swagger entdeckt):** Mehrere **daten-sensible Endpunkte
sind ohne Authentifizierung** erreichbar. `require_modul_aktiv` prüft **nur**, ob das
Modul aktiv ist – **keine Auth**. Auf der öffentlichen Instanz ist das ein **Datenleck**:
- `GET /einsaetze`, `/einsaetze/{id}`, `/{id}/pdf`, `/{id}/timeline`,
  `/einsaetze/feld-definitionen` – **public**; und **`PATCH /einsaetze/{id}/zusatzfelder`
  = öffentlicher Schreibzugriff** (Datenmanipulation!).
- `GET /dienstbuecher/letzte`, `/dienstbuecher/{id}`, `/dienstbuecher/{id}/pdf` – public.
- `GET /buchungen` (alle Fahrzeugbuchungen inkl. Namen) – public.
- `GET /stammdaten/fahrzeuge | /gruppen | /funktionen-*` – public (geringere Sensitivität).

**Fix (Auth-weit → eigener Feature-Branch + PR; Kiosk darf NICHT kaputtgehen):** neue
Dependency **`require_kiosk_oder_person`**, die durchlässt bei **gültigem Kiosk-Token**
(Frontend hat ihn bereits: `localStorage 'kiosk_token'`, gesetzt in `KioskGate.tsx` –
künftig als Header `X-Kiosk-Token` bei allen API-Aufrufen mitsenden) **ODER**
angemeldeter Person (Namens-Cookie) **ODER** Moderator. Auf **alle** o. g. offenen
Daten-Endpunkte anwenden, `PATCH zusatzfelder` mindestens gaten. **Wirklich öffentlich
bleiben:** Setup, `oeffentliche-konfiguration` (Theming), Kiosk-Token-Validierung,
Login, token-basiertes Einlösen/Reservierung, Formular-Absenden. **Danach OpenAPI/
Swagger erneut durchgehen**, dass nichts Sensibles mehr offen ist.

Empfohlene Reihenfolge (alle Punkte vom Nutzer gewünscht):

1. **PIN-Brute-Force-Schutz** `⭐⭐⭐ · M` — Fehlversuchs-Zähler + temporäre Sperre
   **pro Person** und Rate-Limit **pro IP** am Mitglieder-/Kiosk-Login (Name+PIN).
   Öffentlich sind 4–6-stellige PINs sonst ratbar. Sperre als PersonEreignis
   protokollieren; ggf. Captcha/Verzögerung nach N Fehlversuchen.
2. **Berechtigungssystem fertigstellen** `⭐⭐⭐ · M` — restliche Router mit
   `require_modul_zugriff` absichern (`stammdaten`, `barcodes`, `kiosk-geraete`,
   Gruppenführer-Bereiche), Frontend-Guards auf `hat_zugriff` statt `istAdmin`,
   altes Rollenmodell ablösen. (Beendet die halbfertige Baustelle.)
3. **Geschützte Datei-Auslieferung** `⭐⭐ · M` — personenbezogene Uploads
   (Personenbilder, Formular-Dateien) nur für Berechtigte bzw. über kurzlebige
   Tokens ausliefern statt statisch unter `/uploads`. Beim Upload zusätzlich
   **Magic-Bytes-Prüfung** (nicht nur `content_type`) und **EXIF entfernen**.
4. **Admin-/Moderator-Login härten** `⭐⭐⭐ · M` — Login-**Rate-Limit + Lockout**
   bei Fehlversuchen. **2FA primär per E-Mail-Code (OTP)**, weil viele keine
   Authenticator-App nutzen; **Passkeys/WebAuthn** als starke, phishing-resistente
   **Opt-in-Alternative**, wenn 2FA ohnehin gebaut wird.
   *Hinweise:* E-Mail-OTP setzt konfiguriertes SMTP voraus und ist nur so sicher wie
   das E-Mail-Konto des Nutzers; Passkey ist deutlich stärker, aber nicht auf jedem
   Gerät verfügbar → beide anbieten, E-Mail-OTP als Fallback.
5. **Audit-Log** `⭐⭐ · M` — protokolliert **Löschungen, Freigaben und
   Rechteänderungen** (wer/wann/was), modulübergreifend, **nur für Admin** einsehbar.

### Beschlossene Detail-Entscheidungen (05.07.2026)

- **2FA:** für **Admin + Moderator**. **E-Mail-Code (OTP)** als Standard,
  **Passkey/WebAuthn** als optionale starke Alternative. Abfrage **nur bei neuem/
  unbekanntem Gerät** (Trusted-Device für 30 Tage merken).
  **Notfall/Recovery:** **Recovery-Codes bei der Einrichtung** *und* ein **zweiter
  Admin kann 2FA zurücksetzen** (doppeltes Netz). ⚠ Voraussetzung: mindestens
  **2 Admin-Zugänge** – sonst Aussperr-Risiko (im Setup/Doku darauf hinweisen).
- **PIN-Brute-Force:** **5 Fehlversuche → 15 Min Sperre pro Person** + **Rate-Limit
  pro IP**. Nach 15 Min automatisch frei; **Moderator kann manuell entsperren**.
  Sperre als `PersonEreignis` protokollieren.
- **Geschützte Datei-Auslieferung:** **kurzlebige, signierte Token-Links** je Datei
  (kein dauerhaft öffentlicher `/uploads`-Pfad). Upload zusätzlich Magic-Bytes-Prüfung
  + EXIF entfernen.
- **Audit-Log:** **nur Admin** einsehbar; **1 Jahr in der DB, danach automatisch
  löschen**; **Admin-Export (CSV/JSON)** für manuelle Langzeit-Sicherung. Bewusst
  **keine MinIO-Archivierung** (bei dieser Größe Over-Engineering; die Frist ist
  Datenminimierung; die Tabelle liegt ohnehin im Voll-Backup).

> Weil jetzt **öffentlich über HTTPS**: **Web-Push wird nutzbar** → der fehlende
> Frontend-Abo-Flow (siehe „Benachrichtigungen") lohnt sich jetzt konkret.

### Gewünschte Ausbaupunkte – UX/Kiosk & Stabilität (05.07.2026)

Parallel zur Sicherheits-Roadmap (alle vom Nutzer bestätigt):

**UX / Mobile / Kiosk**
- **Kiosk-Autolock / Inaktivitäts-Reset** – nach X Sekunden zurück zur Startseite.
- **Mobile-Overflow beheben** – abgeschnittene Karten/Kacheln + horizontales Scrollen
  auf schmalen Screens (Moderator-Seiten + Mitglieder-Hub). *(auch als Bugs in
  Etappe D/E im Backlog)*
- **Barrierefreiheit** – Fokusringe, Tastaturbedienung, `aria`-Labels, Screenreader
  (v. a. Sterne-/Skala-Auswahl, Kiosk-Kacheln).
- **Einheitliche Fehler-/Ladezustände** – gemeinsames Toast/Alert-Muster +
  „Erneut versuchen" statt roher `err.detail`-Texte.

**Stabilität / Betrieb**
- **CI bei jedem PR** – GitHub Actions: `pytest` (gegen Postgres-Service) + `npm run
  build` (+ Frontend-Tests, sobald vorhanden).
- **Erste Frontend-Tests** – Vitest + Testing Library für kritische Flows
  (Kiosk-Eintragung, Formular ausfüllen, Login).
- **Automatischer Backup-Restore-Test** – Backup regelmäßig in eine Wegwerf-DB
  zurückspielen + verifizieren; Reporting „letztes Backup ok".
- **System-Statuspanel im Admin** – DB/SMTP/MinIO/Divera + letzte Job-Läufe auf
  einen Blick.

---

## 0. Querschnitt (wirkt über alle Module – meist der größte Hebel)

- **⭐⭐⭐ · M – Berechtigungssystem fertigstellen.** Das granulare Modul ist gebaut,
  aber unvollständig: Frontend-Guards prüfen weiter `istAdmin` statt `hat_zugriff`,
  und viele Router (`stammdaten`, `barcodes`, `kiosk-geraete`, Gruppenführer-Bereiche)
  sind noch nicht über `require_modul_zugriff` gesichert. Solange das offen ist, ist
  „individuelle Rechte" nur halb wirksam. → Höchste Priorität, weil sicherheits- und
  konsistenzrelevant. (Siehe Backlog „Granulare Berechtigungsverwaltung".)
- **⭐⭐⭐ · M – Frontend-Tests + CI einführen.** Aktuell **0 Frontend-Tests** und
  **keine GitHub Actions**. Vorschlag: Vitest + React Testing Library für die
  kritischen Flows (Kiosk-Eintragung, Formular ausfüllen, Login), plus eine CI, die
  bei jedem PR `pytest` (gegen Postgres-Service-Container) **und** `npm run build` +
  Frontend-Tests laufen lässt. Verhindert Regressionen, die heute nur manuell auffallen.
- **⭐⭐⭐ · M – Zeitzone durchgängig (Etappe M).** Es gibt `zeit.jetzt_lokal`, aber
  nicht überall konsequent; ein zentraler UTC→Europe/Berlin-Layer inkl. Anzeige im
  Frontend fehlt. Datumsnahe Features (Ampel, Dienststunden-Stichtag, Auto-Abschluss,
  Formular-Ablauf) profitieren stark. Ohne das drohen subtile Off-by-one-Fehler.
- **⭐⭐ · M – Audit-Log (Löschungen/Freigaben/Rechteänderungen).** *[vom Nutzer
  gewünscht, Umfang gewählt]* Modulübergreifendes Protokoll: wer hat wann was
  **gelöscht** (Einsätze, Personen, Formular-Einreichungen …), **freigegeben**
  (Buchungen, Divera-Vorschläge) oder an **Rechten/Rollen** geändert. Im Admin
  einsehbar/filterbar. Ergänzt die rein personenbezogene Timeline.
- **⭐⭐ · S – Barrierefreiheit (a11y).** Viele Interaktionen sind `<button>`/`<div>`
  mit Inline-Styles; Fokus-Zustände, `aria-*` und Tastaturbedienung sind uneinheitlich
  (z. B. Sterne-/Skala-Auswahl, Kiosk-Kacheln). Ein a11y-Durchlauf (Fokusringe,
  Labels, `role`) verbessert Kiosk-Bedienung und Screenreader-Tauglichkeit.
- **⭐⭐ · M – Mehrsprachigkeit vorbereitet (i18n).** Alles ist deutsch hartkodiert.
  Auch wenn Deutsch bleibt: Strings in eine zentrale Datei ziehen (leichtes i18n)
  erleichtert Wording-Anpassungen je Feuerwehr und spätere Sprachen.
- **⭐⭐ · S – Fehler-/Ladezustände vereinheitlichen.** Es gibt `Ladeanzeige`, aber
  Fehlermeldungen sind oft `String(err.detail)`. Ein gemeinsames Toast/Alert-Muster +
  „Erneut versuchen" würde die UX konsistenter machen.
- **⭐ · S – Inline-Styles → CSS-Klassen.** Sehr viele `style={{…}}` (u. a. neue
  Formular-/Ampel-UIs). Schrittweise in `index.css`-Klassen überführen: bessere
  Dark-Mode-Konsistenz, kleineres Bundle, leichter wartbar.
- **⭐⭐⭐ · M – Sicherheits-Härtung öffentliche Instanz.** → siehe **Sicherheits-
  Roadmap oben** (PIN-Brute-Force, Berechtigungen, geschützte Datei-Auslieferung,
  Login-Härtung/2FA-per-Mail/Passkey, Audit-Log). Zusätzlich prüfen: CSP/Security-
  Header-Review, Abhängigkeits-/Secret-Scanning in CI, konsequentes Rate-Limit auf
  allen öffentlichen POST-Endpunkten.
- **⭐ · S – Observability.** Sentry ist optional/opt-in. Ergänzend: strukturierte
  Health-/Readiness-Endpunkte, ein kleines „System-Status"-Panel im Admin (DB, SMTP,
  MinIO, Divera, Scheduler-Jobs mit letzter Laufzeit) – hilft beim Self-Hosting-Support.

---

## 1. Personal

*Stand: Stammdaten, PIN/Barcode, Benachrichtigungs-Abos, Aktivitäts-Ampel, Tab-Detailansicht.*

- **⭐⭐⭐ · M – CSV-Import** (steht schon im Backlog, Etappe J): Massenanlage von
  Personen inkl. Gruppen/Funktionen-Auflösung und Fehlerreport pro Zeile. Größter
  Onboarding-Beschleuniger für neue Wehren.
- **⭐⭐ · M – Personen-Auswertungsseite** (Backlog Etappe H): pro Person Timeline +
  Verlauf (Einsätze/Dienste/Dienststunden) auf einer Detailseite. Passt jetzt gut in
  die neue Tab-Struktur (weiterer Tab „Statistik").
- **⭐⭐ · S – Ampel weiter denken:** in der Personal-Liste nach Ampel filtern/sortieren
  („nur überfällige zeigen"), und die Ampel-Schwelle **pro Gruppe/Funktion**
  differenzieren (Aktive vs. Altersabteilung haben andere Erwartungen).
- **⭐⭐ · M – Mitgliederdaten-Zusatzfelder** (analog EinsatzFeldDefinition): frei
  konfigurierbare Personenfelder (Führerscheinklassen, Atemschutztauglichkeit +
  Ablaufdatum, Lehrgänge) mit Ablauf-Erinnerung. Sehr feuerwehrtypischer Bedarf.
- **⭐ · S – Foto-Handling:** Uploads serverseitig auf max. Kantenlänge verkleinern
  (spart Speicher/Bandbreite am Kiosk), Platzhalter-Avatare (Initialen) sind schon da.
- **⭐⭐ · M – Mitglieder-Selfservice** *[gewählt 05.07.2026]*: Mitglied kann im
  Login **eigene Kontaktdaten/Foto aktualisieren**; Änderungen gehen als **Vorschlag**
  an einen Moderator zur Bestätigung (analog Divera-Personal-Vorschläge / Namens-
  abweichungen). Entlastet die Moderatoren bei Stammdatenpflege.

## 2. Fahrzeuge

*Stand: Fahrzeuge + Sitzplan-Editor (Presets), „buchbar".*

- **⭐⭐ · M – Fahrzeug-Zusatzdaten & Prüftermine:** Kennzeichen, Funkrufname (ISSI ist
  da), TÜV/UVV/Beladungsprüfung mit **Erinnerung** vor Ablauf (Benachrichtigung).
  Häufiger Wunsch und gut ins bestehende Notifier-System integrierbar.
- **⭐⭐ · S – Sitzplan-UX:** **Raster-Snap/Ausrichten** im Editor *[gewählt
  05.07.2026]*. (Sitzplan-PDF/Druck und „Beladung je Sitzplatz" vorerst **nicht**
  gewählt.)
- **⭐⭐⭐ · L – Funkstatus + Live-Position (quellen-agnostisch)** *[gewählt
  05.07.2026]*: je Fahrzeug **Funkstatus (FMS 1–6)** und **Position** (Koordinaten
  lat/lon **+ Timestamp**). Wichtig: **generisches Ingest-/Provider-Interface**, damit
  Quellen wie **Traccar** (Open-Source-GPS-Server, Webhook/API), **Divera** oder
  andere **einfach angebunden** werden können – **kein Hardcoding** auf eine Quelle.
  - **Datenmodell:** letzte Position/Status am Fahrzeug + optionale **Positions-
    Historie** (mit Aufbewahrungsfrist); Mapping „Quellen-ID → Fahrzeug".
  - **Frontend:** Karte (z. B. Leaflet + OpenStreetMap-Tiles) mit Fahrzeug-Markern,
    Status-Badge, „zuletzt gesehen"; am Dashboard sichtbar.
  - **Sicherheit/DSGVO (öffentliche Instanz!):** Ingest-Endpunkt per **Token/HMAC**
    absichern; Ansicht nur **Admin/Moderator**; Positions-Historie mit **Löschfrist**;
    Zweckbindung dokumentieren. Steht in gewisser Spannung zum Grundsatz „kein
    Alarmierungssystem" → dient der **Lageübersicht/Fahrzeugsuche**, nicht der Alarmierung.
  - **Vorgehen:** eigener Feature-Branch + PR; **zuerst den ersten Connector** wählen
    (Traccar als naheliegender Start), Interface daran ausrichten.

## 3. Einsatztagebuch

*Stand: Garage-Ansicht (Sitzplatz-genau), Countdown/Auto-Abschluss, Zusatzfelder, PDF, Divera-Import, MinIO-Ablage.*

- **⭐⭐⭐ · L – Einsätze zusammenführen (Merge)** *[gewählt 05.07.2026]*: **jeder
  Moderator** kann **offene** Einsätze zu einem zusammenführen – v. a. wenn **ein
  reales Ereignis mehrere Divera-Alarme** erzeugt hat (mehrere Einsatz-Datensätze →
  einer). Ablauf:
  1. **Feldweise wählen**, welcher Wert von welchem Einsatz übernommen wird (Titel,
     Adresse, Meldung, Zeit, Einsatznummer, Zusatzfelder …) – bei Konflikt nachfragen.
  2. **Teilnahmen/Sitzplätze zusammenführen**: bei **Doppelbelegung eines Sitzes**
     nachfragen, was passiert – Person aus **Einsatz A**, aus **Einsatz B**, oder
     **beide auf einen Platz** lassen.
  3. Quell-Einsätze nach dem Merge **löschen/archivieren**, Merge im **Timeline**
     vermerken (welche Einsätze/Divera-IDs vereint wurden).
  Größere UI + Konfliktlogik → **eigener Feature-Branch + PR**. (Motiviert durch
  Divera-Mehrfachalarme, wirkt aber generell im Einsatztagebuch.)
- **⭐⭐⭐ · M – Einsatz-Statistik** (Backlog Einsatztagebuch): Jahresanzahl mit
  Vorjahresvergleich zum Stichtag + Wizard-Startwert. Kombiniert mit Dashboard sehr
  wertvoll für Jahresberichte.
- **⭐⭐ · M – Einsatzarten/Kategorien** (Brand/TH/Sonstiges, Stichwort-Katalog):
  Grundlage für Auswertungen („Einsätze nach Art", Diagramme) und PDF-Statistiken.
- **⭐⭐ · S – Zusatzfeld-Typen erweitern** analog Formular-Modul (Datum/Zahl/Auswahl):
  heute nur text/mehrzeilig/checkbox. Der Formular-Feld-Validierungs-Baustein ließe
  sich teilen.
- **⭐⭐ · M – Atemschutz-Auswertung:** aus „Atemschutz angelegt + Minuten" je Person
  eine Jahresübersicht (Kurzprüfung/Belastungsübung-Nachweise) ableiten.
- **⭐ · S – Countdown-Feinschliff:** am Kiosk sichtbarer „noch offen bis"-Hinweis +
  „Countdown verlängern"-Button für lange Einsätze.
- **⭐⭐ · M – Foto-/Lagebild-Anhänge je Einsatz** *[gewählt 05.07.2026]*: Bilder zum
  Einsatz hochladen (Lagebilder, Schadensfotos), im **MinIO**-Ordner des Einsatzes
  archiviert (10-Jahre-Ablage) und im PDF/Bericht referenzierbar. Datei-Upload-
  Baustein aus dem Formular-Modul wiederverwendbar; Datenschutz beachten (kein
  öffentliches Serve → siehe geschützte Datei-Auslieferung).

## 4. Dienstbuch

*Stand: Erfassung, Zeitfenster/Auto-Abschluss, „relevant"-Markierung, PDF, MinIO.*

- **⭐⭐⭐ · M – Mindest-Dienstbeteiligung** (setzt auf der neuen „relevant"-Markierung
  auf): Auswertung „Anzahl relevanter Dienste pro Person" + Schwellenwert +
  Benachrichtigung/Ampel bei Unterschreitung. War der erklärte Zweck der Markierung.
- **⭐⭐ · M – Dienstbuch-Zusatzfelder + Typ „Auswahl"** (Backlog Etappe C): analog
  Einsatz-/Formular-Felder; „Auswahl" gleich generisch einführen.
- **⭐⭐ · S – Wiederkehrende Dienste/Vorlagen:** Dienstplan-Vorlagen (z. B. „Übung
  jeden 1. Montag") halb-automatisch anlegen.
- **⭐ · S – Themen/Kategorien je Dienst** (Ausbildung/Arbeitsdienst/Sonstiges) für
  Auswertungen.
- **⭐⭐ · M – Anwesenheitsquote pro Person** *[gewählt 05.07.2026; Backend erledigt
  05.07.2026]*: prozentuale Teilnahme an Diensten je Person (Zeitraum wählbar).
  **Backend live:** `GET /dienstbuecher/anwesenheit?von=&bis=` (CurrentModerator) →
  `{gesamt, personen:[{person_id, teilgenommen, quote}]}`. **Offen:** Frontend-Anzeige
  (Personal/Listen) + optional Export.
- **⭐ · S – Ausbilder/Thema je Dienst** *[gewählt 05.07.2026]*: pro Dienst
  dokumentieren, **wer welches Thema** ausgebildet hat (Feld „Ausbilder" + „Thema"),
  Grundlage für Ausbildungsnachweise/-abdeckung.

## 5. Dienststunden

*Stand: Touch-Erfassung (Chips/Stepper), Funktionen, Schwellenwerte, Doppelbuchungs-Schutz.*

- **⭐⭐ · M – Jahresauswertung/Export** pro Person/Funktion (CSV/PDF), inkl.
  Schwellenwert-Erreichung – Basis für Aufwandsentschädigung/Ehrungen.
- **⭐⭐ · S – Genehmigungs-Workflow (optional):** erfasste Stunden müssen von einem
  Moderator bestätigt werden (Missbrauchsschutz), abschaltbar.
- **⭐ · S – Automatische Stunden aus Einsatz/Dienstbuch** vorschlagen (Teilnahme →
  Stundenvorschlag), Person bestätigt nur.
- **⭐⭐ · M – Persönlicher Jahresreport** *[gewählt 05.07.2026]*: jede Person erhält
  ihre Stundenauswertung (Summe je Funktion/Kategorie, Schwellenwert-Status) als
  **Mail und/oder Download** – z. B. zum Jahreswechsel. Nutzt das Notifier-/PDF-
  System.

## 6. Fahrzeugbuchung

*Stand: Anfrage → Moderator-Freigabe, Kalender/Liste, Konflikterkennung, Aktions-Mails.*

- **⭐⭐⭐ · M – Externe/iCal-Kalender überlagern** (Backlog Etappe I): Fremdtermine
  (Divera, Google) im Buchungskalender anzeigen und in die Konfliktprüfung einbeziehen.
- **⭐⭐ · S – Wiederkehrende Buchungen** (Serientermine) + Ganztags-Option.
- **⭐⭐ · S – Selbst-Stornierung/Änderung** durch den Anfragenden (per Token-Link aus
  der Mail), heute nur Moderator.
- **⭐ · S – Kollisionsanzeige schon bei der Anfrage** am Kiosk („belegt von…"),
  bevor abgeschickt wird.

## 7. Formular *(gerade stark ausgebaut)*

*Stand: viele Feldtypen, Zeitfenster, Kapazität, Consent, Danke/Ergebnis, QR, CSV, Datei-Upload, Auswertung, Ablauf-Mail.*

- **⭐⭐ · M – Bedingte Felder / Logiksprünge** („zeige Feld B nur, wenn A = Ja").
  Häufigster Mehrwert für echte Umfragen/Anmeldungen.
- **⭐⭐ · M – Anmelde-Workflow rund machen:** aus „Kapazität" eine echte
  **Teilnehmerliste + optionale Warteliste mit Nachrück-Benachrichtigung** machen
  (bewusst im Ausbau ausgelassen).
- **⭐⭐ · S – PDF-Export** je Einreichung + Auswertung (CSV ist da); Datei-Uploads
  ins **MinIO-Modul** archivieren (10-Jahre-Logik wie Einsatz/Dienstbuch).
- **⭐⭐ · S – Diagramme in der Auswertung** (Balken sind rudimentär da) + Anteile in %.
- **⭐ · S – Vorlagen-Bibliothek** typischer Formulare (Dienstbewertung, Anmeldung
  Feuerwehrfest, Materialmeldung) zum Duplizieren.
- **⭐ · S – Bestätigungsmail an Einreicher** (wenn E-Mail-Feld/Login vorhanden).

## 8. Benachrichtigungen

*Stand: Kanäle E-Mail/Telegram/WebPush, Ereignis-Schalter, Abos pro Person, „drei Ebenen".*

> **Grundsatz (Nutzer 05.07.2026): Kein Alarmierungssystem.** Die App meldet keine
> Alarme/Einsätze **aktiv** raus (kein Ersatz für Divera/Melder). Divera-Alarme werden
> nur zur **Dokumentation** als Einsatz übernommen. → **Zu prüfen:** die bestehende
> Sofort-Benachrichtigung „Neuer Einsatz (Divera-Alarm)" ggf. standardmäßig **aus**
> bzw. entfernen, damit die Positionierung eindeutig bleibt. Ruhezeiten sind damit
> unkritisch (es gibt keine „immer durchzulassenden" Alarme).

- **⭐⭐ · M – Web-Push-Abo-Flow im Frontend** *(Nutzer: mittlere Priorität)*: Backend
  ist fertig, aber es fehlt der `pushManager.subscribe()`-Flow + „Benachrichtigungen
  aktivieren"-Button → aktuell empfängt niemand Push. Technisch nutzbar, da öffentlich
  über HTTPS (secure context gegeben) – aber nicht vordringlich.
- **⭐⭐ · M – Pro-Empfänger statt global** (Backlog Etappe G): E-Mail pro
  Moderatoren-Zugang + Ereignis-Abos je Zugang statt zentraler Empfängerliste.
- **⭐⭐ · S – „Digest"/Zusammenfassungen:** tägliche/wöchentliche Sammelmail statt
  Einzelmails (v. a. bei vielen Einsätzen), pro Abonnent wählbar.
- **⭐⭐ · S – Zustell-Log & Testversand je Kanal/Ereignis** *[gewählt 05.07.2026]*:
  sichtbar machen, ob/wann/an wen etwas rausging (heute nur Sentry/Logs); jedes
  Ereignis testweise auslösbar. Reduziert Support.
- **⭐⭐ · M – Eskalation bei offenen Anfragen** *[gewählt 05.07.2026]*: bleibt eine
  **Buchungsanfrage** (o. Ä.) länger als X Stunden unbeantwortet → automatische
  Erinnerung an die Moderatoren. Nutzt einen Scheduler-Job (Muster wie
  `_formular_ablauf_job`).
- **⭐⭐ · M – Bevorzugter Kanal + Fallback je Person** *[gewählt 05.07.2026]*: Person
  wählt einen **Wunschkanal** (Mail/Telegram/Push); schlägt er fehl (z. B. Mail
  bounced), greift eine **Fallback-Reihenfolge**. Ersetzt „an alle aktiven Kanäle".
  Baut auf `Benachrichtigungskanal` + `benachrichtige()` auf (dort Zustell-Ergebnis
  auswerten).
- **⭐ · S – Telegram-Gruppen/Chat-Verwaltung** komfortabler (Bot-Setup-Assistent).

## 9. Kiosk

*Stand: Per-Gerät-Token, „Auf Kiosk anzeigen" pro Link, Logo-Klick zurück zur Startseite.*

- **⭐⭐ · M – Kiosk-Gerät-Verwaltung erweitern:** „zuletzt gesehen", Umbenennen,
  Deaktivieren/Token-Rotation, QR-Code zum Einrichten des Tablets.
- **⭐⭐ · S – Kiosk-Autolock/Inaktivitäts-Reset:** nach X Sekunden Inaktivität zurück
  zur Startseite (verhindert „hängende" Sitzungen mit gewählter Person).
- **⭐ · S – Kiosk-Branding pro Gerät** (z. B. Standort-Name im Header), PWA-„Add to
  Homescreen"-Anleitung direkt im Kiosk-Setup.
- **⭐ · S – Offline-Fallback:** freundliche Offline-Seite über den Service-Worker,
  Eintragungen ggf. lokal puffern (fortgeschritten).

## 10. Divera 24/7

*Stand: Polling/Webhook, Alarm→Einsatz-Upsert, Personal-Abgleich-Vorschläge.*

> **Grundsatz (Nutzer 05.07.2026): nur lesen, kein Rückkanal.** Die App liest Alarme/
> Personal aus Divera und schreibt **nichts** zurück. Personal-Abgleich bleibt bei
> **Vorschlägen** (kein automatischer Ausbau gewünscht).

- **⭐⭐ · S – Sync-Status & Verbindungstest** *[gewählt 05.07.2026]*: „Verbindung
  testen"-Button, **letzter erfolgreicher Sync** + letzte Fehler direkt im Modul
  sichtbar (heute nur Logs). Reduziert Support/Fehlersuche.
- **⭐⭐ · M – Feld-Mapping konfigurierbar** *[gewählt 05.07.2026]*: Zuordnung
  **Divera-Felder → Einsatz(-Zusatz)felder** einstellbar, statt fest Adresse/Meldung/
  Einsatznummer. Nutzt die Zusatzfeld-Definitionen des Einsatztagebuchs.
- **⭐⭐ · M – Webhook-Sicherheit:** Accesskey steckt als Query-Parameter in der URL
  (landet in Logs). Signatur/HMAC oder Header-Secret prüfen; Request validieren.
  *(jetzt nicht priorisiert, aber bei öffentlicher Instanz relevant.)*
- **⭐ · S – Fahrzeug-/Alarmierungs-Daten** aus Divera (welche Fahrzeuge alarmiert)
  optional in den Einsatz übernehmen.

> **Verwandt (motiviert durch Divera):** „Einsätze zusammenführen" – wenn ein
> Ereignis **mehrere Alarme** erzeugt → siehe **Einsatztagebuch** (Merge-Feature).

## 11. Barcode

*Stand: Umschalter Barcode vs. Name+PIN, Erzeugung/Erneuerung, PIN-Erinnerung.*

- **⭐⭐ · S – „Barcode vergessen" absichern** (Backlog Etappe F, Prio hoch): überall
  Name+PIN erzwingen bevor Bilder erscheinen; PIN-lose Personen sperren + Timeline-
  Vermerk. Sicherheits-/Datenschutzrelevant.
- **⭐⭐ · S – Sammel-Barcodes als PDF** (Kartenbogen zum Ausdrucken/Laminieren) für
  alle Mitglieder; QR statt/zusätzlich zu Code128 als Option.
- **⭐ · S – NFC/Chip-Option** langfristig (Tags statt Papier-Barcode).

## 12. Backup

*Stand: verschlüsseltes Voll-Backup, Ziele (lokal/WebDAV/S3/SFTP/E-Mail), Retention, Browser, PDF-Archiv.*

- **⭐⭐⭐ · M – Restore-Test & Integritätsprüfung:** automatischer „Probe-Restore" in
  eine temporäre DB + Checksummen-Verifikation; Reporting „letztes Backup ok/Größe".
  Ein Backup, das man nie zurückspielt, ist ein Risiko.
- **⭐⭐ · S – Backup-Status im Dashboard/Statuspanel** (letzter Lauf, Ziel-Ergebnisse,
  nächster Lauf) + Warnung, wenn X Tage kein erfolgreiches Backup.
- **⭐⭐ · S – Schlüssel-/Passphrase-Handling:** Warnung/Doku, dass ohne Passphrase kein
  Restore möglich ist; optional Recovery-Hinweis-Workflow.
- **⭐ · S – Selektives Zeitplan-Backup** (nur DB / nur Dateien / nur MinIO) je Ziel.

## 13. MinIO / Objektspeicher

*Stand: Verbindung, automatische Dokument-Ablage (Einsätze/Dienstbücher, zeitgestempelte PDFs), Dateibrowser, ins Backup integriert.*

- **⭐⭐ · M – Lifecycle/Retention-Policies** je Bucket (z. B. 10 Jahre aufbewahren,
  dann löschen) + Object-Lock/WORM-Hinweis für revisionssichere Archivierung.
- **⭐⭐ · S – Weitere Module anbinden:** Formular-Uploads + Personenbilder ebenfalls
  archivieren; Dateibrowser um Vorschau (Bilder/PDF inline) erweitern.
- **⭐ · S – Verbindungs-Diagnose** ausbauen (Bucket-Rechte prüfen, freier Speicher).

---

## Wie weiter?

1. **Zuerst die Sicherheits-Roadmap oben** (in der Reihenfolge 1→5), da öffentliche
   Instanz. Parallel niedrig hängende UX-/Kiosk-Punkte (Mobile-Overflow, Kiosk-
   Autolock) und Stabilität (CI + erste Frontend-Tests, Backup-Restore-Test).
2. Danach die modulweisen ⭐⭐⭐-Punkte (Web-Push-Flow, Einsatz-Statistik,
   Mindest-Dienstbeteiligung – Grundabfrage ist seit 05.07.2026 vorhanden).
3. Einzelne Punkte per `todo`-Skill in `backlog.md` als Etappe/Aufgabe überführen
   (mit Akzeptanzkriterien), dann wie gewohnt Feature-Branch → PR → `beta`.
   Sicherheits-/Auth-/DB-weite Umbauten grundsätzlich über PR (nicht direkt).
4. Diese Datei fortschreiben (neue Ideen ergänzen, Umgesetztes streichen).

## Offene Detailfragen (bei Umsetzung klären)

- **2FA-Reichweite:** nur Admin/Moderator, oder optional auch für Mitglieder-Login?
  E-Mail-OTP nur bei Login von neuem Gerät (Trusted-Device 30 Tage) oder immer?
- **PIN-Sperre:** nach wie vielen Fehlversuchen, wie lange sperren, und braucht ein
  Moderator einen „Entsperren"-Knopf? Sperre pro Person **und** pro IP?
- **Geschützte Dateien:** Personenbilder am Kiosk müssen weiterhin schnell laden –
  Token-Serve mit kurzlebigem Link vs. Session-geschützt abwägen.
- **Audit-Log-Aufbewahrung:** wie lange aufbewahren (DSGVO) und wer darf es sehen
  (nur Admin)?
