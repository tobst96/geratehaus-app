# Backlog

Zentrale Aufgabenliste für Gerätehaus.app, gepflegt über den `todo`-Skill.
Aus der früheren `TODO.md` migriert (die dadurch entfällt).

Format je Aufgabe (siehe `todo`-Skill): Status · Priorität · Kategorie · Skills ·
Beschreibung · Akzeptanzkriterien · Notizen. Aufgaben sind nach **Etappen**
(zusammengehörige Arbeitsgänge) gruppiert. Erledigtes steht kompakt unter
„Archiviert".

Status-Werte: Backlog · Planung · In Bearbeitung · Review · Erledigt · Archiviert.

---

## Etappe AI – Dienststunden-QR-Stempel verlangt zusätzlichen Login

### Bug: Nach Scan des Dienststunden-QR-Codes muss man sich vor/nach dem Buchen einloggen

- Status: Erledigt (24.08.2026, direkt auf beta)
- **Ursache bestätigt** (live reproduziert statt blind gepatcht, wie oben
  gefordert): Der Verdacht stimmte. Per curl mit Cookie-Jar nachgestellt –
  über `localhost` griff der Fix nicht (Browser/curl behandeln `localhost`
  als "potentially trustworthy" und senden Secure-Cookies dort trotzdem),
  über einen echten Hostnamen per `--resolve` + `http://` schlug Schritt 2
  (`stundenErfassen`) reproduzierbar mit 401 fehl – das Cookie aus Schritt 1
  landete gar nicht erst im Cookie-Jar. `environment=production` bedeutet
  eben NICHT "läuft nachweislich hinter HTTPS" – diese Instanz lief zum
  Zeitpunkt des Fixes selbst nicht sicher über HTTPS.
- Umsetzung: Siehe [[Etappe AD]] („Langlebige Session-Cookies ohne
  secure-Flag") – dortiger Fix korrigiert (neue dedizierte Einstellung
  `COOKIES_SECURE`, Default aus, statt an `environment` gekoppelt). Damit
  ist dieser Bug direkt mitbehoben; kein zusätzlicher Code hier nötig.
  Betraf nur den einen Zugriffspfad über das Namens-Cookie, nicht die
  Token-Reservierungsflows (die brauchen kein Cookie).
- Priorität: Mittel
- Kategorie: Bug / Frontend / Backend
- Skills: bugfix, geraetehaus-patterns, tests, review
- Beschreibung: Nutzerrückmeldung (24.08.2026): Nach dem Scannen des
  Dienststunden-QR-Codes muss man sich vor oder nach dem Buchen zusätzlich
  einloggen, obwohl die Seite dafür eigentlich nicht gedacht ist.
  Betroffene Seite vermutlich `frontend/src/pages/DienststundenStempel.tsx`
  (Route `/dienststunden-stempel/:funktionId`, der feste, z. B. ausgedruckte
  QR-Code für eine Funktion). Die Seite ist als **einstufiger** Ablauf
  gebaut: `eintragen()` ruft zuerst `identRef.current.identifiziere()`
  (Name+PIN oder Barcode, über `PersonIdentifikation` →
  `nameLoginEinmalig`/`barcodeEinscannenEinmalig` in `AuthContext.tsx`, setzt
  serverseitig das signierte Namens-Cookie) und **danach** `stundenErfassen()`
  (`POST /api/v1/dienststunden`, hinter `CurrentPerson`/`require_zugriff` in
  `backend/app/api/v1/dienststunden.py` – braucht genau dieses Cookie). Ein
  separater Login-Schritt ist im Code nicht vorgesehen; das Formular soll
  Identifikation und Buchung in einem Rutsch erledigen.
- **Naheliegender Verdacht (zeitlich passend, noch nicht verifiziert):** Am
  23.08.2026 wurde das Namens-Cookie serverseitig auf `secure=True` in
  production umgestellt (Etappe AD, Commit „Secure-Flag auf langlebigen
  Session-Cookies"). Wird diese Stempel-Seite (oder generell irgendein
  Zugriffspfad) nicht zuverlässig über HTTPS aufgerufen, würde der Browser
  das frisch gesetzte Cookie aus Schritt 1 nicht mehr an den
  `stundenErfassen`-Request in Schritt 2 senden → 401 → aus Nutzersicht
  „ich muss mich einloggen". **Vor jeder Codeänderung zuerst live
  reproduzieren und die Netzwerk-Requests/Cookies dieser Seite prüfen**, ob
  das tatsächlich die Ursache ist, statt blind zu patchen.
- Akzeptanzkriterien: QR-Scan → Name/PIN oder Barcode eingeben → Stunden
  wählen → Eintragen funktioniert in einem Rutsch, ohne separaten
  Login-Screen oder 401 dazwischen. Regressionstest, der den genauen
  aktuell reproduzierten Fehlerfall abdeckt (abhängig von der gefundenen
  Ursache).
- Notizen: Betrifft ggf. auch die anderen QR-/Token-Reservierungsflows
  (`DienststundenManuelleEintragung.tsx` & Analoga für Einsatz/Dienstbuch/
  Fahrzeugbuchung/Personenbild), falls die Ursache generisch im
  Cookie-`secure`-Verhalten liegt statt spezifisch in `DienststundenStempel.tsx`.

---

## Etappe AH – react-router-dom v6→v7 (CVE-Fix, breaking)

### `npm audit` meldet react-router (moderate) – Fix erfordert Major-Upgrade

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Frontend / Sicherheit / Wartung
- Skills: planner, geraetehaus-patterns, tests, review
- Beschreibung: Beim Einrichten des ESLint-Setups (24.08.2026,
  `npm install`/Lockfile-Regenerierung) fiel per `npm audit` auf, dass
  `react-router-dom` (aktuell `^6.26.2`) zwei moderate CVEs hat:
  GHSA-wrjc-x8rr-h8h6 (Open Redirect via Backslash in `<Link>`/`useNavigate`)
  und GHSA-337j-9hxr-rhxg (Arbitrary Constructor Injection via
  `deserializeErrors()` bei SSR-Hydration). `npm audit fix` behebt sie nur
  über `--force` mit Upgrade auf `react-router-dom@7.18.2` – ein **Breaking
  Change** (v6→v7 API-Unterschiede), daher nicht ungeprüft im Rahmen des
  ESLint-Tasks mitgemacht. Vier weitere (High) Advisories in reinen
  Dev-Dependencies (brace-expansion, fast-uri, nanoid, postcss – alle nur
  transitiv über ESLint/Vite-Toolchain, nicht im produktiven Bundle) wurden
  bereits non-breaking per `npm audit fix` behoben.
- Ersteinschätzung Ausnutzbarkeit (grob, keine Tiefenprüfung): Die App ist
  eine reine Client-SPA ohne SSR → die Hydration-CVE greift vermutlich gar
  nicht. Stichprobe der `navigate()`/`<Link to>`-Aufrufe zeigt nur intern
  konstruierte Pfade (IDs/Modul-Keys aus dem Backend), keine direkte
  Übernahme von Nutzereingaben/Query-Parametern als Redirect-Ziel – die
  Open-Redirect-Lücke wirkt daher aktuell nicht offensichtlich ausnutzbar.
  Trotzdem als echter CVE-Fund dokumentiert statt stillschweigend akzeptiert.
- Akzeptanzkriterien: `react-router-dom` (+ `react-router`) auf eine Version
  ohne offene Advisories angehoben; volle App durchgetestet (Routing,
  verschachtelte Routen/Outlets, `useNavigate`/`useParams`/`useSearchParams`-
  Nutzung in allen ~30 Seiten), `npm audit` wieder bei 0. Vitest-Suite +
  `npm run build` grün.
- Notizen: Größerer, riskanter Umbau (Major-Version einer zentralen
  Routing-Bibliothek, breite Nutzung) → eigener Feature-Branch + PR laut
  Projektkonvention, nicht direkt auf beta. Vor Umsetzung React-Router-v7-
  Migrationsguide gegen die tatsächliche Nutzung in diesem Projekt prüfen
  (Data-Router-APIs, ggf. geänderte `Outlet`/`useNavigate`-Signaturen).

---

## Etappe AG – Admin/Gruppenführer: Rückwechsel zur Mitgliederseite ohne Abmelden

### "Zurück zur Mitgliederseite"-Link im Gruppenführer-/Admin-Layout ergänzen

- Status: Erledigt (22.08.2026, direkt auf beta)
- Umsetzung: Neuer Button „Zurück zur Mitgliederseite" im Sidebar-Footer von
  `GruppenfuehrerLayout.tsx` (über dem Abmelden-Button, gleicher `.mod-logout`-
  Stil), nur sichtbar wenn `angezeigterName` (Mitglied-Identität) gesetzt ist;
  navigiert per `navigate("/mitglied")` ohne `gruppenfuehrerAbmelden()`
  aufzurufen. Neue Tests `GruppenfuehrerLayout.test.tsx` (2: Link vorhanden +
  navigiert ohne Abmelden; Link fehlt ohne Mitglied-Identität). Volle
  Vitest-Suite (28 Dateien, 86 Tests) + Build grün.
- Priorität: Niedrig
- Kategorie: Frontend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Aus einer Nutzerrückmeldung (20.08.2026): Aus dem Admin- bzw.
  Gruppenführerbereich gibt es aktuell keine Möglichkeit, wieder zur
  Mitgliederseite zu gelangen – nur über „Abmelden" (`gruppenfuehrerAbmelden()`
  in `AuthContext.tsx:219-223`) und erneutes Anmelden. Der Rückwechsel ist
  aber unnötig: `gruppenfuehrerAbmelden()` löscht nur das JWT und rührt den
  separaten Mitglied-Namens-Cookie (`AuthContext.tsx:167-171`) nicht an, d. h.
  die Mitglied-Identität bleibt in der Regel bestehen. Der Vorwärtswechsel
  Mitglied → Gruppenführer/Admin existiert bereits als Vorbild:
  `MitgliedHub.tsx:267-287` (Button „Zum Admin-Bereich"/„Zum
  Gruppenführer-Bereich", navigiert per `navigate("/gruppenfuehrer")`,
  sichtbar wenn `profil.gruppenfuehrer_rolle` gesetzt ist). Es gibt kein
  separates Admin-Layout – Admin ist nur `gruppenfuehrer_rolle === "admin"`
  innerhalb desselben `GruppenfuehrerLayout.tsx` (`/gruppenfuehrer/*`), der
  Fix betrifft also nur eine Datei.
- Akzeptanzkriterien: Im Sidebar-Footer von `GruppenfuehrerLayout.tsx`
  (neben/oberhalb des bestehenden Abmelden-Buttons, ca. Zeile 259-261) ein
  neuer Link/Button „Zurück zur Mitgliederseite", der per `navigate("/mitglied")`
  navigiert, **ohne** `gruppenfuehrerAbmelden()` aufzurufen (JWT bleibt
  erhalten, falls die Person später wieder in den Gruppenführer-/Admin-Bereich
  wechselt). Gilt für Gruppenführer- und Admin-Rolle gleichermaßen. Test in
  `GruppenfuehrerLayout.test.tsx` (Link vorhanden, navigiert zu `/mitglied`,
  ruft nicht ab).
- Notizen: Nur sinnvoll sichtbar, wenn die Person tatsächlich eine
  Mitglied-Identität hat (Mitglied-Namens-Cookie/`angezeigter_name` gesetzt) –
  sonst würde `/mitglied` eine leere/nicht eingeloggte Seite zeigen. Prüfen,
  ob das im `AuthContext` schon abfragbar ist (z. B. vorhandener
  `angezeigterName`-State) oder ob der Link einfach immer sichtbar sein kann,
  weil `MitgliedHub` bei fehlender Mitglied-Session ohnehin einen sinnvollen
  Leerzustand zeigt.

---

## Etappe AF – Rechtliches/Datenschutz-Compliance für externen Betrieb (18.08.2026)

> Aus einer Rückfrage des Nutzers (18.08.2026): „Ist Betrieb in Deutschland
> auf einem lokalen Server mit externem Zugriff möglich, passt rechtlich
> alles, was ist datenschutzmäßig zu beachten?" Technisch ist die App genau
> dafür gebaut (Kiosk lokal + öffentlicher Mitglieder-Login); die
> `Datenschutz.tsx`-Seite deckt bereits die meisten Verarbeitungen gut ab.
> Diese Etappe sammelt die dabei gefundenen **rechtlichen/organisatorischen
> Lücken** – die meisten sind keine reinen Code-Aufgaben, sondern brauchen
> eine Entscheidung/Prüfung durch die verantwortliche Stelle bzw. einen
> echten Datenschutzbeauftragten (keine Rechtsberatung durch Claude).

### Impressum-Seite fehlt komplett

- Status: Erledigt (24.08.2026, direkt auf beta)
- Umsetzung: Neue Config-Werte `impressum_verantwortliche_person`/
  `_anschrift`/`_email`/`_telefon`/`_zusatz` (`config_defaults.py`, alle
  leer/neutral), über `OeffentlicheKonfiguration` öffentlich ausgeliefert
  (keine Login-Pflicht fürs Impressum). Neue Seite `frontend/src/pages/
  Impressum.tsx` (Route `/impressum`), zeigt bei leeren Feldern einen
  Hinweis statt einer leeren Rechtsseite. Admin-Editierung in
  `Einstellungen.tsx` (neue Karte „Impressum" neben „Organisation &
  Branding"). Footer-Link in `Layout.tsx` neben Datenschutz/Team-Login.
  Bewusst freie Textfelder statt starrer Rechtsform-Logik (Verein/Gemeinde-
  Feuerwehr variieren) - Inhalt liegt vollständig beim Betreiber, keine
  Rechtsberatung durch die App. 2 neue Backend-Tests
  (`test_impressum_config.py`) + 2 neue Frontend-Tests
  (`Impressum.test.tsx`). Volle Suiten grün (Backend 514, Frontend 29/88).
- Priorität: Hoch
- Kategorie: Frontend
- Skills: geraetehaus-patterns, review
- Beschreibung: Es existiert keine Impressum-Route/-Seite im Frontend (nur
  `/datenschutz`, siehe `frontend/src/App.tsx:58`). Bei einer über das
  Internet erreichbaren Anwendung mit personenbezogenen Daten ist eine
  Anbieterkennzeichnung nach **§ 5 DDG** (früher TMG § 5) praktisch Pflicht.
- Akzeptanzkriterien: Neue Seite `/impressum` (analog `Datenschutz.tsx`
  organisationsspezifisch über `config`/Setup-Wizard befüllbar, keine
  hart kodierten Werte laut oberster CLAUDE.md-Regel), im Footer/Login-
  Bereich verlinkt.
- Notizen: Aus Rechtlich/Datenschutz-Nachfrage 18.08.2026. Felder
  (verantwortliche Person, Anschrift, Kontakt) vermutlich analog zu
  `organisation_name` in `app_config` ablegen.

### TLS/Reverse-Proxy vor der App ist nicht dokumentiert

- Status: Erledigt (24.08.2026, direkt auf beta)
- Umsetzung: Neuer README-Abschnitt „🌐 Externer Zugriff & HTTPS" (vor
  „Konfiguration", TOC ergänzt) – Caddy-Beispiel (`Caddyfile`, automatisches
  Let's-Encrypt-Zertifikat), Traefik/nginx+certbot als Alternative erwähnt,
  Hinweis dass HTTP-only für Produktivbetrieb ungeeignet ist (Art. 32 DSGVO),
  plus konkreter Hinweis `oeffentliche_basis_url` nach Einrichtung auf die
  HTTPS-Domain zu setzen und nur Port 443 nach außen zu routen statt
  `HTTP_PORT` direkt. Reine Doku-Änderung, keine Tests nötig.
- Priorität: Hoch
- Kategorie: Dokumentation
- Skills: knowledge-management, review
- Beschreibung: `frontend/nginx.conf` terminiert **kein** TLS selbst („HSTS
  bewusst weiterhin nicht [gesetzt], da TLS im Reverse-Proxy terminiert
  wird" laut Backlog-Notiz in Etappe P). Das README beschreibt aber keinen
  Schritt, wie ein Betreiber einen vorgeschalteten Reverse-Proxy mit
  Zertifikat (z. B. Caddy/Traefik + Let's Encrypt) aufsetzt. Für externen
  Zugriff mit personenbezogenen Daten ist HTTPS nach Art. 32 DSGVO
  praktisch Pflicht – ein Betreiber könnte die App sonst versehentlich nur
  über HTTP exponieren.
- Akzeptanzkriterien: README-Abschnitt „Externer Zugriff/Deployment" ergänzt
  einen empfohlenen Reverse-Proxy-Aufbau (Beispiel-Compose-Snippet oder
  klare Doku-Verlinkung) inkl. Hinweis, dass HTTP-only für Produktivbetrieb
  ungeeignet ist.
- Notizen: Aus Rechtlich/Datenschutz-Nachfrage 18.08.2026. Reine Doku-
  Aufgabe, keine Code-Änderung an der App selbst nötig.

### Telegram-Kanal: Drittlandtransfer ohne dokumentierte Rechtsgrundlage

- Status: Backlog
- Priorität: Mittel
- Kategorie: Dokumentation
- Skills: knowledge-management, review
- Beschreibung: `Datenschutz.tsx` erwähnt die Telegram-Chat-ID-Übermittlung
  nur als „Übermittlung an Telegram als externen Dienst". Telegram FZ-LLC
  sitzt außerhalb der EU – das ist ein Drittlandtransfer (Art. 44 ff.
  DSGVO), der eine explizite Rechtsgrundlage braucht (z. B. Standard-
  vertragsklauseln oder Einwilligung), die aktuell nirgends benannt ist.
- Akzeptanzkriterien: Rechtliche Prüfung durch die verantwortliche
  Stelle/DSB, ob/wie der Telegram-Kanal weiter angeboten werden darf;
  Ergebnis in `Datenschutz.tsx` präzisieren (Rechtsgrundlage benennen)
  oder Kanal ggf. nur mit gesonderter Einwilligung anbieten.
- Notizen: Aus Rechtlich/Datenschutz-Nachfrage 18.08.2026. Keine reine
  Code-Aufgabe – Entscheidung liegt bei der Organisation, Umsetzung danach
  ggf. klein (Text-/Consent-Anpassung).

### AVVs für extern angebundene Dienste prüfen/abschließen

- Status: Backlog
- Priorität: Mittel
- Kategorie: Dokumentation
- Skills: knowledge-management, review
- Beschreibung: Je nach Konfiguration der Organisation verarbeiten externe
  Dienste Daten im Auftrag (Auftragsverarbeitung, Art. 28 DSGVO): Sentry
  (falls „Fehlerberichte" aktiviert), Divera 24/7 (falls angebunden),
  externes Backup-Ziel (WebDAV/Nextcloud/S3/SFTP, falls konfiguriert),
  externer S3/MinIO-Anbieter (falls nicht selbst gehostet). Für jeden
  tatsächlich genutzten Dienst braucht es einen abgeschlossenen AVV.
- Akzeptanzkriterien: Checkliste/Doku, welche AVVs je nach genutzter
  Konfiguration nötig sind (z. B. als Abschnitt in `docs/backup.md` /
  `docs/minio.md` / `docs/divera.md` ergänzt, damit Betreiber es beim
  Aktivieren des jeweiligen Moduls sehen).
- Notizen: Aus Rechtlich/Datenschutz-Nachfrage 18.08.2026. Rein lokal
  gehostet ohne externes Backup-Ziel und mit Sentry aus entfällt der
  Großteil automatisch – Hinweis sollte das klarstellen.

### DSB-Pflicht als öffentliche Stelle klären

- Status: Backlog
- Priorität: Mittel
- Kategorie: Dokumentation
- Skills: knowledge-management
- Beschreibung: Anders als bei privaten Unternehmen (BDSG-Schwelle: 20
  Personen) müssen **öffentliche Stellen** nach den meisten Landes-
  datenschutzgesetzen unabhängig von der Größe einen Datenschutz-
  beauftragten benennen. Da Freiwillige Feuerwehren im Regelfall
  rechtlich Teil der Gemeinde sind (öffentliche Stelle), nicht ein
  eingetragener Verein, ist diese Pflicht wahrscheinlich einschlägig –
  muss aber organisationsspezifisch geklärt werden (Trägerschaft prüfen).
- Akzeptanzkriterien: Klärung durch die Organisation (nicht durch Claude
  entscheidbar); Ergebnis ggf. als Hinweis im Setup-Wizard/README
  festhalten („vor Produktivbetrieb: DSB-Benennung + Freigabe prüfen").
- Notizen: Aus Rechtlich/Datenschutz-Nachfrage 18.08.2026. Reine
  Organisationsaufgabe, kein Code.

### Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO) fehlt formal

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Dokumentation
- Skills: knowledge-management
- Beschreibung: `Datenschutz.tsx` beschreibt die Verarbeitungen bereits
  inhaltlich sehr gründlich, ersetzt aber kein formales Verzeichnis von
  Verarbeitungstätigkeiten nach Art. 30 DSGVO, das die verantwortliche
  Stelle führen muss.
- Akzeptanzkriterien: Vorlage/Muster-Verzeichnis (kann sich eng an
  `Datenschutz.tsx`-Abschnitten orientieren) für Betreiber bereitstellen,
  z. B. als `docs/`-Vorlage, die pro Instanz ausgefüllt wird.
- Notizen: Aus Rechtlich/Datenschutz-Nachfrage 18.08.2026.

### Künftiges Tauglichkeiten-Modul verarbeitet Gesundheitsdaten (Art. 9 DSGVO)

- Status: Backlog
- Priorität: Mittel
- Kategorie: Neues Modul / Dokumentation
- Skills: planner, knowledge-management
- Beschreibung: Laut Vorhaben ist ein Tauglichkeiten-Modul geplant
  (medizinische Eignung, z. B. G26-Untersuchungen). Das sind
  **Gesundheitsdaten nach Art. 9 DSGVO** (besondere Kategorie) – deutlich
  höhere Anforderungen als die bisherigen Module: eigene Rechtsgrundlage
  (Art. 9 Abs. 2), ggf. Datenschutz-Folgenabschätzung (Art. 35), strengere
  Zugriffsbeschränkung/Protokollierung als beim übrigen Personal-Modul.
- Akzeptanzkriterien: Vor Implementierungsbeginn Rechtsgrundlage +ggf.
  DSFA-Bedarf mit der Organisation klären; erst danach technische
  Umsetzung planen (Skill `planner`).
- Notizen: Aus Rechtlich/Datenschutz-Nachfrage 18.08.2026. Bewusst **vor**
  Beginn der Implementierung einplanen, nicht nachträglich nachrüsten.

---

## Etappe AE – Frontend-Performance/Modernisierung (Audit 18.08.2026)

> Aus einer Gesamtanalyse der App (Sicherheit + Frontend-Performance,
> 18.08.2026). Vier Einzelpunkte, unabhängig voneinander umsetzbar.

### Kein Code-Splitting – ein einziges Riesen-Bundle

- Status: Erledigt (24.08.2026, direkt auf beta)
- Umsetzung: `App.tsx` importiert jetzt nur noch die schlanke Kiosk-/
  Landing-Startseite eager (`Layout`, Route-Guards, `LandingPage`,
  `Datenschutz`, `Impressum`, `NotFound`); alle ~28 übrigen Seiten (gesamter
  `/gruppenfuehrer/*`-Admin-Bereich, Setup-Wizard, alle Kalender-/Barcode-/
  Token-Formular-Seiten) per `React.lazy(() => import(...).then(m => ({
  default: m.X })))` – `.then(...)` nötig, da die Seiten benannte statt
  Default-Exports nutzen. Ein einziger `<Suspense fallback={<Ladeanzeige
  />}>` um den gesamten `<Routes>`-Baum statt vieler einzelner Boundaries.
  **Ergebnis (`npm run build`-Output vorher/nachher):** Haupt-Bundle
  `index-*.js` 1.517,83 kB (gzip 415,82 kB) → **474,80 kB (gzip 152,79 kB)**
  – **~63 % weniger** im kritischen Erstlade-Pfad. Schwere Bibliotheken
  landen jetzt in eigenen, erst bei Bedarf geladenen Chunks: Barcode-Scanner
  (`@zxing`, via `PersonIdentifikation`) 476,63 kB, Kalender
  (`react-big-calendar`, via `Fahrzeugbuchung`) 227,71 kB,
  `ModulUnterseite` 118,51 kB, plus ~25 kleine Chunks (1-13 kB) für die
  restlichen Admin-/Formular-Seiten.
  **Korrektur zum Audit-Befund:** „Karte/Fahrzeug" (`leaflet`/
  `react-leaflet`) gibt es im Code aktuell gar nicht – die Pakete stehen
  zwar noch in `package.json`, werden aber nirgends importiert (waren daher
  ohnehin nie im Bundle enthalten, kein Lazy-Loading nötig).
  `vite.config.ts`s `manualChunks` bewusst nicht ergänzt – das routenbasierte
  Splitting deckt das Ziel (kleines Erstlade-Bundle) bereits vollständig ab,
  zusätzliches manuelles Chunking hätte nur Komplexität ohne klaren
  Zusatznutzen gebracht. Volle Vitest-Suite (29 Dateien, 88 Tests) grün, kein
  Verhaltensunterschied.
- Priorität: Hoch
- Kategorie: Frontend / Performance
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: `frontend/src/App.tsx` importiert alle ~30 Seiten (inkl.
  Setup-Wizard, Kalender/`react-big-calendar`, Karte/`leaflet`+
  `react-leaflet`, Barcode-Scanner/`@zxing/library`) statisch, kein
  `React.lazy`/`import()`. `frontend/vite.config.ts` hat kein
  `manualChunks`. Damit lädt selbst die einfache Kiosk-Startseite
  Bibliotheken mit, die nur auf einzelnen Unterseiten gebraucht werden –
  verzögert den ersten Render unnötig, besonders auf dem Kiosk-Tablet/
  mobilen Netzen.
- Akzeptanzkriterien: `React.lazy()` + `Suspense` mindestens für die
  schweren, selten genutzten Routen (Kalender/Buchung, Karte/Fahrzeug,
  Barcode-Generator/-Scanner, Setup-Wizard, Admin-Unterseiten). Messbare
  Reduktion der initial geladenen Bundle-Größe (`npm run build`-Output
  vorher/nachher vergleichen).
- Notizen: Aus Frontend-Performance-Audit 18.08.2026.

### React-Performance: fehlende Memoisierung (useMemo/useCallback/Context)

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Frontend / Performance
- Skills: geraetehaus-patterns, review
- Beschreibung: Im gesamten Frontend (91+ Komponentendateien) faktisch
  keine Verwendung von `useMemo`/`useCallback`. Konkret
  `src/pages/gruppenfuehrer/Personal.tsx` (~1392 Zeilen, ~35 `useState`):
  die gefilterte Liste wird bei jedem Render neu berechnet, auch bei
  unabhängigem Modal-/Formular-State. `src/context/ConfigContext.tsx`
  (Provider-`value`) erzeugt bei jedem Render ein neues Objekt ohne
  `useMemo` – jeder Consumer würde bei Provider-Rerender mit neu rendern.
  Bei aktuellen Wehrgrößen (wenige hundert Personen) noch unkritisch, wird
  aber bei wachsenden Listen spürbar.
- Akzeptanzkriterien: Teure Berechnungen (Filter/Sort großer Listen) in
  Kernkomponenten mit `useMemo` versehen, Context-Provider-`value`
  memoisiert. Kein Verhaltensunterschied, nur Performance.
- Notizen: Aus Frontend-Performance-Audit 18.08.2026. Hängt inhaltlich mit
  „Kein ESLint/Prettier-Setup" zusammen – seit dessen Umsetzung (24.08.2026)
  liefert `npm run lint` eine konkrete Fundliste von 16
  `react-hooks/exhaustive-deps`/`react-refresh`-Warnungen (u. a. mehrere
  `useEffect` mit fehlendem `laden`-Dependency in Dashboard/AuditLog/
  Berechtigungen/Buchungsmanagement/Systemstatus/Update/Fahrzeugbuchung) –
  Ausgangspunkt für die Umsetzung dieser Aufgabe, statt neu zu suchen.

### N+1-Fetch bei Buchungs-Konfliktvergleich

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Frontend / Backend / Performance
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: `src/pages/gruppenfuehrer/Buchungsmanagement.tsx` lädt den
  Konfliktvergleich aktuell mit
  `Promise.all(liste.map(b => holeKonfliktvergleich(b.id)))` – ein eigener
  Request pro ausstehender Buchung statt eines Batch-Endpunkts. Bei
  mehreren gleichzeitig offenen Buchungsanfragen unnötig viele Roundtrips.
- Akzeptanzkriterien: Neuer Backend-Endpunkt für Batch-Konfliktvergleich
  (mehrere Buchungs-IDs auf einmal), Frontend nutzt ihn statt der
  Einzel-Requests.
- Notizen: Aus Frontend-Performance-Audit 18.08.2026.

### Kein ESLint/Prettier-Setup im Frontend

- Status: Erledigt (24.08.2026, direkt auf beta)
- Umsetzung: ESLint 9 (Flat Config, `frontend/eslint.config.js`) +
  `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`;
  neues `npm run lint`-Script. Erster Lauf zeigte 4 Fehler (alle dasselbe
  harmlose Muster: Ternary nur für Seiteneffekt statt Wert, z. B.
  `set.has(x) ? set.delete(x) : set.add(x)` in `BackupModul.tsx` (2x) und
  `PresseberichtModul.tsx`; plus ein veralteter Triple-Slash-Import in
  `vite.config.ts`) – alle vier behoben (zu `if/else` bzw. normalem
  `import`, keine Verhaltensänderung). Zusätzlich 4 inzwischen wirkungslose
  `eslint-disable-next-line react-hooks/exhaustive-deps`-Kommentare entfernt
  (ESLint selbst bestätigte „no problems were reported", reine
  Kommentar-Leichen). **Bewusst nicht behoben:** die verbleibenden 16
  `react-hooks/exhaustive-deps`/`react-refresh`-Warnungen (Baseline nach
  Fixes: 0 Fehler, 16 Warnungen, `npm run lint` exit 0) – das ist exakt der
  Umfang der separaten [[Etappe AE]] „React-Performance: fehlende
  Memoisierung" und dort jetzt konkret als Fundliste verwertbar. Prettier
  nicht ergänzt (bestehende Formatierung durchgängig konsistent, deckt sich
  mit der im Akzeptanzkriterium erlaubten Alternative). Volle Vitest-Suite
  (28 Dateien, 86 Tests) + Build grün.
- Priorität: Niedrig
- Kategorie: Frontend / DevOps
- Skills: geraetehaus-patterns, review
- Beschreibung: Frontend hat ein gutes `tsconfig.json` (`strict`,
  `noUnusedLocals`), aber kein Lint-Setup. Ein Setup mit
  `eslint-plugin-react-hooks` würde fehlende Hook-Dependencies und die o. g.
  Memoisierungs-Lücken automatisch aufzeigen und künftig verhindern.
- Akzeptanzkriterien: ESLint (+ Prettier oder vorhandene Formatierung) im
  Frontend eingerichtet, `npm run lint`-Script, CI-Integration optional.
- Notizen: Aus Frontend-Performance-Audit 18.08.2026. Bereits im Backlog
  behandelt (nicht hier duplizieren): Profilbilder komprimieren/cachen =
  [[Etappe AC]]. Fonts/PWA-Caching bereits vorbildlich (self-hosted,
  `font-display: swap`) – kein Handlungsbedarf.

---

## Etappe AD – Sicherheitsaudit-Funde (18.08.2026)

> Aus einer Gesamtanalyse der App (Sicherheit + Frontend-Performance,
> 18.08.2026), ergänzend zur bereits weitgehend abgearbeiteten
> [[Etappe P]] (Sicherheits-Roadmap). Die API selbst ist über
> docker-compose bereits korrekt abgeschottet (nur der Frontend-Nginx-Port
> ist nach außen gebunden, Backend/DB nicht öffentlich erreichbar) – kein
> Finding dazu nötig.

### JWT- und Cookie-Secret ohne Startup-Schutz gegen Default-Werte

- Status: Erledigt (19.08.2026, direkt auf beta)
- Umsetzung: `Settings.unsichere_default_secrets` (`config.py`) meldet, welche
  der beiden Secrets noch den `.env.example`-Platzhalter tragen;
  `main.py`s `_pruefe_secrets()` bricht den Start mit `RuntimeError` ab,
  wenn das UND `environment == "production"` zutrifft (Tests/lokale Dev-Umgebungen
  mit `ENVIRONMENT=test` unberührt). Vor dem Push live geprüft: die tatsächliche
  `.env` dieser Instanz hat bereits echte Secrets, kein Bruch beim nächsten
  Neustart. 5 neue Tests (`test_startup_secrets.py`); volle Suite 509 grün.
- Priorität: Hoch
- Kategorie: Backend / Sicherheit
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: `backend/app/core/config.py:25,28` – `jwt_secret_key` und
  `cookie_secret_key` haben hart codierte Default-Werte
  („change-me-to-a-random-secret" / „change-me-to-another-random-secret"),
  die im öffentlichen Repo stehen. Es gibt keinen Startup-Check (weder in
  `main.py`s `lifespan`, noch in `docker-entrypoint.sh`), der eine
  Produktivinstanz mit unverändertem Default verhindert oder wenigstens
  laut warnt. Vergisst ein Admin beim Setup, `.env` anzupassen, signiert
  die App JWTs/Mitglieder-Session-Cookies mit einem jedem bekannten
  Secret – jeder könnte damit gültige Admin-/Gruppenführer-Tokens fälschen.
- Akzeptanzkriterien: Beim Start (production) wird geprüft, ob
  `jwt_secret_key`/`cookie_secret_key` noch dem Default entsprechen; falls
  ja, harter Fehlschlag (oder mindestens sehr auffällige Warnung in Log +
  Health-Endpoint) statt stillem Weiterlaufen. Test dafür.
- Notizen: Aus Sicherheitsaudit 18.08.2026.

### Keine Token-Invalidierung bei Passwortänderung/2FA-Reset (Gruppenführer/Admin)

- Status: Backlog
- Priorität: Mittel
- Kategorie: Backend / Sicherheit
- Skills: planner, geraetehaus-patterns, tests, review
- Beschreibung: `app/api/deps.py` (`get_current_gruppenfuehrer`) prüft pro
  Request nur, ob die Rolle noch gesetzt ist – nicht, ob das JWT nach der
  letzten Passwortänderung ausgestellt wurde. `gruppenfuehrer_service.
  person_passwort_setzen` sowie `auth.py`s `mein_passwort_setzen` ändern
  das Passwort, laufende Tokens bleiben aber bis `exp` (bis zu 480 Min,
  `jwt_expire_minutes`) gültig. Ein gestohlenes Token überlebt damit eine
  Passwort-Änderung, die eigentlich als Reaktion auf eine Kompromittierung
  gedacht ist, bis zu 8 Stunden.
- Akzeptanzkriterien: Passwortänderung/2FA-Reset invalidiert bestehende
  Tokens (z. B. `passwort_geaendert_am`-Claim im Token gegen DB-Wert
  prüfen, oder Token-Version/Revocation-Liste). Regressionstest: altes
  Token nach Passwortänderung wird abgelehnt.
- Notizen: Aus Sicherheitsaudit 18.08.2026.

### Langlebige Session-Cookies ohne secure-Flag

- Status: Erledigt (23.08.2026, direkt auf beta; **korrigiert 24.08.2026**
  nach echtem Produktionsausfall - siehe [[Etappe AI]])
- **Korrektur (24.08.2026):** Der ursprüngliche Fix (`secure=settings.
  environment == "production"`) hat exakt die Instanz ausgesperrt, die er
  schützen sollte – „production" heißt nur "kein Test-/Dev-Lauf", nicht
  "läuft nachweislich hinter einem HTTPS-Reverse-Proxy". Diese Instanz lief
  mit `environment=production`, aber (noch) ohne funktionierendes HTTPS →
  Namens-Cookie wurde vom Browser nie mehr gesendet → niemand konnte mehr
  Dienststunden stempeln. Live per curl reproduziert (siehe Etappe AI).
  Fix: neue dedizierte Einstellung `COOKIES_SECURE` (`.env`, Default
  **aus**) statt Kopplung an `environment`; `auth.py` nutzt jetzt
  `settings.cookies_secure`. README-Abschnitt „Externer Zugriff & HTTPS"
  ergänzt um den Hinweis, `COOKIES_SECURE=true` **erst** nach bestätigt
  funktionierendem Reverse-Proxy zu setzen. 3 Tests in
  `test_cookie_security.py` entsprechend angepasst (Default aus statt
  environment-abhängig). Lehre in `LESSONS.md` festgehalten.
- Ursprüngliche Umsetzung (23.08.2026, seither korrigiert): `secure=
  settings.environment == "production"` auf Namens- und Trusted-Device-
  Cookie in `auth.py` ergänzt. 3 neue Tests (`test_cookie_security.py`).
  **Nebenfund beim Testen:** `scripts/test-backend.sh` läuft über
  `docker compose run ... backend` und erbt dadurch die ECHTE `.env` dieser
  Instanz (inkl. echtem `ENVIRONMENT=production` + echten Secrets + echtem
  `UPLOAD_DIR`) – `conftest.py`s `os.environ.setdefault(...)` war für genau
  diese vier Variablen ein No-op, weil sie im Environment schon gesetzt
  waren. Die Tests liefen dadurch unbemerkt mit Produktions-Environment/
  -Secrets statt der Test-Werte (harmlos, solange nichts umgebungsabhängig
  verzweigte) – bis der neue `secure`-Flag mangels echtem HTTPS im
  Testclient reihenweise 401 statt 200 lieferte (Cookie wurde vom
  Testclient nicht zurückgesendet). Fix: `conftest.py` erzwingt
  `ENVIRONMENT`/`JWT_SECRET_KEY`/`COOKIE_SECRET_KEY`/`UPLOAD_DIR` jetzt per
  direkter Zuweisung statt `setdefault` (nur `DATABASE_URL` bleibt bewusst
  `setdefault`, CI überschreibt sie gezielt). Volle Suite 512 grün.
- Priorität: Mittel
- Kategorie: Backend / Sicherheit
- Skills: bugfix, review
- Beschreibung: `app/api/v1/auth.py` setzt das Namens-Cookie (5 Jahre
  Gültigkeit) und das Trusted-Device-Cookie (30 Tage) mit
  `httponly=True, samesite="lax"`, aber ohne `secure=True`. Bei einer
  versehentlich per HTTP statt HTTPS erreichbaren Instanz (z. B.
  Fehlkonfiguration im Reverse-Proxy, lokale Tests) würden diese
  langlebigen Cookies im Klartext übertragen.
- Akzeptanzkriterien: `secure=True` für diese Cookies in Produktion (über
  Setting togglebar, damit lokale HTTP-Entwicklung weiter funktioniert).
- Notizen: Aus Sicherheitsaudit 18.08.2026.

### Rate-Limit auf lesenden Reservierungs-Token-Endpunkten nachziehen (Konsistenz)

- Status: Erledigt (22.08.2026, direkt auf beta)
- Umsetzung: `Depends(rate_limit(...))` auf die GET-Routen aller fünf
  Reservierungs-/Token-Router ergänzt (nicht nur die drei explizit genannten,
  sondern konsistent auf die ganze Familie): `reservierungen.py`,
  `dienststunden_reservierungen.py`, `dienstbuch_reservierungen.py`,
  `fahrzeugbuchung_reservierungen.py` (`GET /{token}` + `GET /{token}/personen`,
  je `rate_limit(15, 60)` analog dem bestehenden `vorschau`-PUT derselben
  Datei) und `person_bild_reservierungen.py` (`GET /{token}`,
  `rate_limit(10, 60)` analog dem einzigen POST dort). Keine neuen Tests nötig
  – folgt demselben Muster wie die bereits rate-limitierten PUT/POST-Routen
  derselben Dateien, die ebenfalls nicht einzeln endpunktspezifisch getestet
  sind (`rate_limit` selbst ist generisch in `test_security.py` abgedeckt).
  Volle Backend-Suite 509 grün.
- Priorität: Niedrig
- Kategorie: Backend / Sicherheit
- Skills: geraetehaus-patterns, review
- Beschreibung: Die GET-Endpunkte (`GET /{token}`, `GET /{token}/personen`)
  in `dienststunden_reservierungen.py` und den Analoga (Fahrzeugbuchung,
  Personenbild) haben – anders als die schreibenden Endpunkte derselben
  Router – kein `Depends(rate_limit(...))`. Tokens haben zwar 128 Bit
  Entropie (praktisch nicht brute-forcebar), aber inkonsistent zum sonst
  durchgängig angewendeten Muster.
- Akzeptanzkriterien: Auch die GET-Routen der Reservierungs-Token-
  Endpunkte mit `rate_limit` versehen, analog den POST-Pendants.
- Notizen: Aus Sicherheitsaudit 18.08.2026. Bewusst nicht erneut gemeldet:
  Swagger/OpenAPI unter `/api/v1/docs` ist laut [[Etappe P]] Punkt (0)
  bereits bewusst akzeptiert („ohne offene sensible Daten" ist das
  eigentliche Kriterium, nicht Abschalten).

---

## Etappe AC – Profilbilder komprimieren + im Kiosk cachen (Ladezeit)

### Bilder beim Upload verkleinern; Kiosk-Anzeige möglichst aus dem Cache

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Backend / Frontend / Performance
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Zwei zusammenhängende Punkte für schnelleres Laden der
  Profilbilder (v. a. im Kiosk mit vielen Kacheln/Personen):
  1. **Komprimierung beim Upload fehlt.** `_bild_verarbeiten`
     (`backend/app/services/stammdaten_service.py:486-511`) kodiert Bilder zwar
     neu (EXIF weg, JPEG `quality=88`), **skaliert sie aber nicht herunter** –
     ein per Handy hochgeladenes Foto (bis 5 MB, ggf. mehrere Tausend Pixel
     Kantenlänge) wird in voller Auflösung gespeichert und ausgeliefert, obwohl
     es nur klein angezeigt wird (Kiosk-Kachel, Personal-Avatar, ~200 px).
     Gewünscht: beim Upload auf eine sinnvolle Maximalkantenlänge (z. B.
     400-600 px) herunterskalieren, bevor gespeichert wird.
  2. **Kiosk-Bilder werden nicht wirksam gecacht.** Die `location /uploads/`
     in `frontend/nginx.conf:35-37` setzt **keinen** `Cache-Control`-Header;
     zusätzlich läuft die Auslieferung über `GeschuetzteUploads`
     (`backend/app/main.py:167-182`) mit einem **signierten `?token=`** pro
     Aufruf – falls sich dieser Token zwischen Aufrufen ändert, verhindert das
     zusätzlich jede URL-basierte Browser-Cache-Wiederverwendung, selbst wenn
     ein `Cache-Control`-Header gesetzt würde.
- Akzeptanzkriterien: Neu hochgeladene Profilbilder sind spürbar kleiner
  (Ziel-Kantenlänge definieren, bestehende Bilder unangetastet/keine
  Rückwirkende Migration nötig); Kiosk lädt ein einmal gesehenes Profilbild
  bei erneuter Anzeige merklich schneller (aus Cache statt erneutem Download).
  Tests für die Skalierung (Downscale bei großen Bildern, kleine Bilder
  bleiben unangetastet).
- Notizen: Vor Umsetzung klären, ob der `?token=` bei `GeschuetzteUploads`
  pro Person/Zeitraum stabil ist (dann reicht ein normaler
  `Cache-Control`-Header) oder sich bei jedem Aufruf ändert (dann bräuchte es
  z. B. eine kiosk-seitige Runtime-Cache-Strategie im Service Worker statt
  reinem HTTP-Caching). Skalierung mit Pillow (`Image.thumbnail(...)`, bereits
  Projektabhängigkeit) direkt in `_bild_verarbeiten` ergänzen.

---

## Etappe AB – Profilbild per QR-Upload: Galerie-Auswahl statt nur Kamera

### `capture="environment"` verhindert Foto-Auswahl aus der Galerie auf dem Handy

- Status: Erledigt (19.08.2026, direkt auf beta)
- Umsetzung: `capture="environment"` aus dem `<input type="file">` in
  `PersonBildHochladen.tsx` entfernt – Button-Text „Foto aufnehmen oder
  auswählen" passte bereits. Native Dateiauswahl bietet auf iOS/Android jetzt
  wieder Kamera **und** Galerie an. Regressionstest (`PersonBildHochladen.test.tsx`),
  prüft, dass das Input-Element kein `capture`-Attribut mehr trägt.
- Priorität: Niedrig
- Kategorie: Bug / Frontend
- Skills: bugfix, review
- Beschreibung: Auf der mobilen Profilbild-Upload-Seite (nach QR-Scan,
  `frontend/src/pages/PersonBildHochladen.tsx`, Zeile 128-135) hat das
  `<input type="file">` das Attribut `capture="environment"` gesetzt. Das
  zwingt mobile Browser dazu, **direkt die Kamera** zu öffnen, statt die
  native Dateiauswahl (mit Option „Aus Galerie wählen") anzuzeigen – ein
  bereits vorhandenes Foto kann so nicht hochgeladen werden, nur ein frisch
  aufgenommenes.
- Akzeptanzkriterien: Auf dem Handy lässt sich beim Profilbild-Upload sowohl
  ein neues Foto aufnehmen **als auch** ein vorhandenes Bild aus der Galerie
  wählen (native Auswahl des Betriebssystems).
- Notizen: Vermutlich reicht das Entfernen von `capture="environment"` (dann
  bietet das native Auswahl-Dialogfeld i. d. R. sowohl Kamera als auch Galerie
  an); kurz auf iOS **und** Android prüfen, da sich das Verhalten je Browser/
  OS unterscheiden kann. Button-Text „Foto aufnehmen" (`t.foto_aufnehmen`)
  ggf. anpassen, falls er dann nicht mehr exakt passt.

---

## Etappe AA – Zwei-Faktor-Anmeldung wieder verpflichtend, mit Druck-Fallback statt Mail

### 2FA-Pflicht reaktivieren; bei SMTP-Ausfall Code über Netzwerkdrucker statt E-Mail

- Status: Backlog
- Priorität: Mittel
- Kategorie: Backend / Sicherheit / Feature
- Skills: planner, geraetehaus-patterns, tests, review
- Beschreibung: Revidiert [[Etappe V]] (2FA-Pflicht wurde dort standardmäßig
  **deaktiviert**, weil ein SMTP-Ausfall sonst zum kompletten Login-Ausschluss
  führen konnte). Nutzerwunsch jetzt: 2FA soll **immer aktiv/verpflichtend**
  sein – aber statt bei SMTP-Problemen einfach auszusperren, soll der
  Anmelde-Code alternativ **ausgedruckt** werden, wenn der Mailversand nicht
  funktioniert (vermutlich über denselben Netzwerkdrucker/IPP-Mechanismus, der
  bereits für den PDF-Druck-Fallback existiert, siehe [[Etappe K]] –
  `drucker_service`/IPP-Integration dort als Ausgangspunkt prüfen).
- Akzeptanzkriterien: `zwei_faktor_pflicht`-Default wieder `true` (Gegenteil von
  Etappe V); schlägt der Mailversand des OTP-Codes fehl (oder ist SMTP gar nicht
  konfiguriert), wird der Code stattdessen an einen konfigurierten Netzwerk-
  drucker geschickt, sodass der Login trotzdem gelingt; ist weder SMTP noch
  Drucker verfügbar, bleiben die bereits vorhandenen Recovery-Codes
  (`zwei_faktor_service.recovery_codes_erzeugen`) als letzter Ausweg; Tests für
  beide Fallback-Pfade (Druck bei SMTP-Fehler, Recovery-Code ganz ohne beides).
- Notizen: Vor Umsetzung klären – (1) wie erkennt der Service zuverlässig
  „SMTP schlägt fehl" (Exception beim Versand direkt abfangen ist robuster als
  der in Etappe V verworfene Verifizierungs-Config-Key); (2) ist immer ein
  Drucker vorhanden/konfiguriert, oder ist der Druck-Fallback selbst optional
  (dann bräuchte es eine klare Priorität Mail → Druck → Recovery-Code); (3)
  Sicherheitsaspekt: ein am Gerätehaus-Drucker ausgeworfener Code ist für alle
  physisch Anwesenden sichtbar – prüfen, ob das für den Anwendungsfall
  akzeptabel ist oder der Ausdruck z. B. automatisch eingezogen/kurzlebig sein
  muss. Größerer, sicherheitsrelevanter Umbau → eigener Feature-Branch + PR.

---

## Etappe Z – Mitglied-Hub: „Meine Dienststunden" nur mit Stunden > 0 anzeigen

### Funktionen ohne geleistete Stunden nicht in der eigenen Übersicht auflisten

- Status: Erledigt (19.08.2026, direkt auf beta)
- Umsetzung: Frontend-Filterung wie in den Notizen vorgeschlagen –
  `dienststundenSichtbar = uebersicht.dienststunden.filter(d => d.summe_stunden > 0)`
  in `StatBereich` (`MitgliedHub.tsx`), sowohl für die Leer-Prüfung als auch
  das Rendering verwendet. Backend/`eigene_summen` unverändert (Rohdaten
  bleiben verfügbar, falls anderswo gebraucht). Zwei neue Tests in
  `MitgliedHub.test.tsx` (nur >0-Funktionen sichtbar; Kartenelement komplett
  ausgeblendet, wenn alle Funktionen 0 Stunden haben). Volle Vitest-Suite
  (27 Dateien, 83 Tests) + Build grün.
- Priorität: Niedrig
- Kategorie: Frontend / Backend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Im Mitglied-Hub (`MitgliedHub.tsx`, Abschnitt „Meine
  Dienststunden", ca. Zeile 69-90) werden alle Einträge aus
  `uebersicht.dienststunden` gezeigt – auch Funktionen, für die die Person
  noch **0 Stunden** hat (`summe_stunden === 0`). Gewünscht: nur Funktionen
  mit `summe_stunden > 0` anzeigen.
- Akzeptanzkriterien: Funktionen ohne geleistete Stunden erscheinen nicht
  mehr in „Meine Dienststunden"; hat eine Person überall 0 Stunden, greift
  weiterhin die bestehende Leer-Prüfung (aktuell `dienststunden.length > 0`
  fürs ganze Kartenelement).
- Notizen: Filterung reicht vermutlich rein im Frontend
  (`uebersicht.dienststunden.filter(d => d.summe_stunden > 0)` vor dem
  `.map(...)`); alternativ direkt in `dienststunden_service.eigene_summen`
  (Backend) filtern, falls die ungefilterten Summen sonst nirgends gebraucht
  werden – kurz prüfen, ob `eigene_summen` noch anderswo (z. B.
  Gruppenführer-Auswertung) mit den Nullwerten verwendet wird.

---

## Etappe Y – Formulare: E-Mail-Empfänger als Personen-Auswahl statt Freitext

### Bei neuer Einreichung Person(en) auswählen statt E-Mail-Adresse einzutippen

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Frontend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: In der Formular-Modul-Unterseite (`FormularModul.tsx`, ca.
  Zeile 258-267) ist „E-Mail-Empfänger bei neuer Einreichung" ein reines
  Freitext-`<input type="email">`-Feld (sogar nur eine einzelne Adresse). Die
  E-Mail-Adressen der Personen sind aber bereits in Stammdaten hinterlegt.
  Gewünscht: Statt der Adresse selbst tippt man die/den Empfänger als Personen
  aus, ausgewählt aus der bestehenden Personenliste (die hinterlegte E-Mail
  wird dann intern genutzt).
- Akzeptanzkriterien: Personen-Auswahl (z. B. Mehrfachauswahl/Autocomplete wie
  an anderen Stellen im Projekt) statt Freitext; nur Personen mit hinterlegter
  E-Mail wählbar bzw. Hinweis, wenn keine E-Mail vorhanden; bestehende
  Freitext-Werte migrationsfrei nutzbar oder klar migriert (klären: reicht
  Weiterversand an die alte Adresse, bis jemand umstellt?).
- Notizen: Prüfen, ob `email_empfaenger` weiterhin ein reiner String bleibt
  (kommagetrennt bei Mehrfachauswahl) oder ob eine Relation/JSON-Liste
  sinnvoller ist – ggf. Migration nötig, je nach gewählter Umsetzung.

---

## Etappe X – Personal: Tabs „Zugang" und „Erhöhter Zugang" zusammenlegen

### Kiosk-Zugang (PIN/Barcode) und Erhöhter Zugang (Admin/Gruppenführer-Passwort) in einem Tab

- Status: Erledigt (24.08.2026, direkt auf beta)
- Umsetzung: Die beiden Tab-Objekte im `tabs`-Array (`Personal.tsx`)
  zusammengelegt – der separate „Erhöhter Zugang"-Tab-Eintrag entfernt,
  sein Inhalt (Rollen-Auswahl, Passwort, 2FA-Status, Zugang-entziehen) als
  eigener Abschnitt mit `<h3>`-Zwischenüberschrift ans Ende des „Zugang"-Tabs
  angehängt, weiterhin nur für Admins sichtbar (`{istAdmin && (...)}` statt
  des vorherigen `sichtbar: istAdmin` auf Tab-Ebene). Keine Funktionalität
  entfernt, reine UI-Umgruppierung. `npm run build` + volle Vitest-Suite
  (29 Dateien, 88 Tests) grün.
- Priorität: Niedrig
- Kategorie: Frontend
- Skills: geraetehaus-patterns, review
- Beschreibung: In der Personal-Detailansicht (`Personal.tsx`) gibt es zwei
  separate Tabs: **„Zugang"** (Zeile ~1117-1201: PIN setzen/entsperren,
  Barcode erzeugen/per Mail senden – Kiosk-Identifikation) und **„Erhöhter
  Zugang"** (Zeile ~1286ff: Admin-/Gruppenführer-Rolle, Passwort setzen,
  2FA-Reset). Gewünscht: beide zu einem Tab zusammenlegen, damit „wie
  identifiziert/meldet sich diese Person an" an einer Stelle steht statt auf
  zwei Tabs verteilt.
- Akzeptanzkriterien: Ein gemeinsamer Tab zeigt PIN-Verwaltung,
  Barcode-Verwaltung (nur wenn Modul aktiv) UND Erhöhter-Zugang-Verwaltung
  untereinander; keine Funktionalität geht verloren; bestehende Tests für
  beide Bereiche bleiben grün (ggf. Selektoren anpassen).
- Notizen: Rein UI – keine Backend-/API-Änderung nötig. Auf sinnvolle
  Abschnittsgliederung/Überschriften innerhalb des zusammengelegten Tabs
  achten, da inhaltlich schon jetzt beide Bereiche recht umfangreich sind.

---

## Etappe W – Person anlegen: alles in einem Formular statt mehrerer Schritte

### Beim Anlegen einer Person direkt PIN, E-Mail, Passwort, Benachrichtigungen mit einstellen können

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Frontend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Das „Person anlegen"-Formular in `Personal.tsx` (`anlegen()`,
  Zeile ~383-399) fragt aktuell nur Vorname/Zwischenname/Nachname ab. Danach
  muss man erst in die Detailansicht wechseln und dort über mehrere separate
  Tabs (Stammdaten für E-Mail/Gruppe/Funktion, PIN, „Erhöhter Zugang" für
  Passwort, Benachrichtigungskanäle/-Abos) alles einzeln nachtragen.
  Gewünscht: Direkt beim Anlegen alles auf einmal einstellbar – E-Mail,
  PIN, Passwort (falls erhöhter Zugang gewünscht), Benachrichtigungen.
- Akzeptanzkriterien: Erweiterte Anlegen-Maske (oder optionale
  „Mehr Einstellungen"-Sektion direkt im Anlegen-Dialog) für E-Mail, PIN,
  Benachrichtigungskanäle; kein Zwang, alles auszufüllen (Felder bleiben
  optional wie bisher in den Einzeltabs). Test für „Person mit allen Feldern
  in einem Rutsch angelegt".
- Notizen: Rein additiv – bestehende Einzel-Tabs (Stammdaten/PIN/Erhöhter
  Zugang/Benachrichtigungen) bleiben für spätere Änderungen bestehen, nur die
  Ersteinrichtung wird gebündelt. Vor Umsetzung prüfen, ob ein einzelnes
  großes Formular oder ein mehrstufiger Dialog (analog Setup-Wizard) die
  bessere UX ist – Personal-Liste ist ohnehin schon recht dicht.

---

## Etappe V – Zwei-Faktor-Pflicht standardmäßig aus

### 2FA nicht mehr verpflichtend – Aussperrungsrisiko vermeiden

- **Revidiert durch [[Etappe AA]]** (18.08.2026): Nutzerwunsch jetzt wieder 2FA-Pflicht,
  aber mit Druck-Fallback statt Mail bei SMTP-Ausfall statt „Pflicht einfach aus".
- Status: Erledigt (18.08.2026, direkt auf beta)
- Priorität: Mittel
- Kategorie: Backend / Sicherheit
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Ursprünglich sollte 2FA erst greifen, wenn SMTP nachweislich
  funktioniert (nicht nur konfiguriert) – siehe Analyse unten. Nutzer-Entscheidung
  nach Rücksprache: einfacher als die SMTP-Verifizierung nachzurüsten ist, die
  2FA-**Pflicht** einfach nicht mehr standardmäßig zu erzwingen. Grund: ein
  Backup-Code für den Fall „2FA/Internet geht nicht" wurde gewünscht – existiert
  aber **bereits** (`zwei_faktor_service.recovery_codes_erzeugen`, werden bei
  jeder 2FA-Einrichtung angezeigt, README erwähnt sie). Der Rest-Risiko-Fall
  (SMTP fehlerhaft UND Pflicht aktiv UND keine Recovery-Codes gesichert) ist
  damit selten genug, dass „Pflicht standardmäßig aus, opt-in" die pragmatischere
  Lösung ist als die SMTP-Verifizierungs-Logik zu bauen.
- Umsetzung: `zwei_faktor_pflicht`-Default in `config_defaults.py` und der
  Fallback in `gruppenfuehrer_service.zugang_entscheiden` von `true` auf
  `false` geändert; Frontend-Fallback in `Einstellungen.tsx` ebenso. 2FA bleibt
  vollständig nutzbar und in Einstellungen weiterhin **aktivierbar** – nur nicht
  mehr der Default. Bestehende Instanzen, die den Wert bereits explizit
  gespeichert haben (jeder Einstellungen-Save schreibt ihn), sind unberührt
  (`ensure_defaults` nutzt `ON CONFLICT DO NOTHING`). README-Stelle „2FA-Pflicht
  bleibt als Schutzschicht bestehen" auf „optional, in Einstellungen
  aktivierbar" korrigiert.
- Ursprüngliche Analyse (Ist-Zustand vor der Änderung, zur Doku): In
  `gruppenfuehrer_service.zugang_entscheiden` gab es bereits eine Kopplung an
  SMTP-**Konfiguration** (`notifier_email_smtp_host` nicht leer) – aber keine
  Prüfung, ob SMTP tatsächlich **funktioniert** (falsche Zugangsdaten hätten die
  Pflicht trotzdem ausgelöst, der Anmelde-Code wäre nie angekommen). Dieser Weg
  (neuer Config-Key `notifier_email_smtp_verifiziert_am`, gesetzt bei
  erfolgreichem Mail-/Testmail-Versand) bleibt als Option bestehen, falls die
  Pflicht später doch wieder standardmäßig aktiv sein soll.

---

## Etappe U – Personal-Liste: Filter „Ohne PIN"

### Filtermöglichkeit für Personen ohne gesetzten PIN

- Status: Erledigt (19.08.2026, direkt auf beta)
- Umsetzung: Neuer Toggle-Filter „Ohne PIN" analog `filterKeinBild`
  (`filterOhnePin`/`setFilterOhnePin`, filtert `p.pin_gesetzt`), zählt in
  `aktiveFilter` mit und wird von „Filter zurücksetzen" mit zurückgesetzt.
  Kein dedizierter Test ergänzt (Personal.tsx hat wie die drei anderen
  bestehenden Filter dort keine Testabdeckung – bestehendes Muster der Datei);
  `npm run build`/Vitest-Gesamtsuite grün.
- Priorität: Niedrig
- Kategorie: Frontend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Auf der Personal-Seite (`frontend/src/pages/gruppenfuehrer/Personal.tsx`)
  gibt es bereits ein Filter-Panel mit mehreren Toggle-Filtern (`filterKeineMail`,
  `filterKeinBild`, `filterBenachrichtigung`, `filterAbo` – ca. Zeile 193–616).
  Ergänzend soll ein Filter „Ohne PIN" hinzukommen, der nur Personen ohne
  gesetzten PIN zeigt (praktisch z. B. um vor einem Einsatz gezielt zu sehen,
  wer noch keinen PIN hat und ggf. einen Freigabe-Link anzustoßen).
  `pin_gesetzt` ist im `PersonOut`-Typ (`frontend/src/api/types.ts`) bereits
  vorhanden – keine Backend-Änderung nötig, reine Frontend-Ergänzung analog zu
  `filterKeinBild` (`if (filterKeinBild && p.bild_url) return false;`).
- Akzeptanzkriterien: Neuer Toggle-Filter „Ohne PIN" im Filter-Panel; aktiv
  gesetzt zeigt die Liste nur Personen mit `pin_gesetzt === false`; zählt in
  `aktiveFilter` mit; wird von „Filter zurücksetzen" mit zurückgesetzt.
- Notizen: Passt thematisch zur ohne-PIN-Kennzeichnung (v0.6.1) – Kontext dazu
  in `docs/personal.md` / `docs/barcode.md`.

---

## Etappe T – Personen-Verlauf: Benachrichtigungs-/Kanal-Änderungen protokollieren

### Änderungen an Benachrichtigungen/Kanälen einer Person landen nicht im Verlauf

- Status: Backlog
- Priorität: Mittel
- Kategorie: Bug / Datenbank / Backend
- Skills: planner, geraetehaus-patterns, tests, review
- Beschreibung: Ändert ein Gruppenführer/Admin bei einer Person die
  Benachrichtigungskanäle (z. B. `PersonKanaele.tsx`) oder die Ereignis-Abos
  (welche Ereignisse pro Modul zugestellt werden), wird das aktuell **nicht**
  in der Personen-Timeline (`PersonEreignis`) protokolliert – anders als z. B.
  Stammdaten-Änderungen (`person_aktualisieren` → `stammdaten_geaendert`,
  loggt bereits ein lesbares Diff). Betroffen: `benachrichtigungskanal_service.py`
  (`setzen`, `loeschen`, `set_abo`) sowie deren Router
  `gruppenfuehrer_person_kanaele.py` – keine Stelle ruft dort
  `person_ereignis_protokollieren` auf.
  - Gewünscht: Protokollieren, **was** geändert wurde (z. B. „E-Mail-Kanal
    aktiviert", „Abo für Ereignis X deaktiviert") **und wer** es geändert hat.
  - **Wichtiger Befund bei der Analyse:** `PersonEreignis` /
    `person_ereignis_protokollieren(db, person_id, typ, beschreibung)` hat
    aktuell **gar kein Akteurs-Feld** – „wer" wird nirgends im bestehenden
    Audit-Mechanismus gespeichert, auch nicht bei den schon protokollierten
    Stammdaten-/PIN-/Bild-Änderungen. Das „wer" nachzurüsten ist daher keine
    Kleinigkeit nur für Benachrichtigungen, sondern eine Erweiterung des
    gesamten `PersonEreignis`-Mechanismus (neue Spalte, z. B. `akteur_id`/
    `akteur_name`, Migration, Model, und Übergabe der aufrufenden Identität
    an `person_ereignis_protokollieren` an allen bestehenden Aufrufstellen).
- Akzeptanzkriterien: Jede Änderung an Benachrichtigungskanälen/Ereignis-Abos
  einer Person erzeugt einen `PersonEreignis`-Eintrag mit lesbarem Diff (was
  geändert wurde) und dem handelnden Gruppenführer/Admin (wer). Migration für
  das neue Akteurs-Feld; bestehende Einträge ohne Akteur bleiben gültig
  (Feld nullable, alte Einträge zeigen „unbekannt"/leer). Regressionstest.
- Notizen: Vor Umsetzung klären, ob das Akteurs-Feld gleich für **alle**
  `PersonEreignis`-Aufrufstellen nachgerüstet wird (konsistent) oder erstmal
  nur für die neuen Benachrichtigungs-Einträge – erstere Variante ist
  sauberer, aber größerer Umbau (DB-weit → eigener Feature-Branch + PR).

---

## Etappe S – Neues Modul „ELW" (Einsatzleitwagen-Upload)

### Modul „ELW": bei Einsatz-Anlage Login-losen MinIO-Upload-Link per Mail

- Status: Erledigt (PR #62 in `beta` gemergt + **deployt** 11.07.2026; Backend + Frontend +
  Doku + Datenschutz vollständig; stateless (keine Migration); Modul standardmäßig aus)
- Priorität: Mittel
- Kategorie: Neues Modul
- Plan: Ja
- Skills: planner, new-module, geraetehaus-patterns, tests, review
- Beschreibung: Neues (nicht mitgliederseitiges) Feature-Modul. **Sobald ein Einsatz
  angelegt wird** (manuell **und** via Divera-Import, nur offene), geht eine Mail an
  **eine im Modul konfigurierte feste Adresse** (`elw_email`) mit einem **Login-losen
  Upload-Link** zum Einsatz-Ordner. Der ELW kann darüber Einsatzberichte etc. **hochladen**;
  die Dateien landen im MinIO-Einsatz-Ordner. **Gültig, solange der Einsatz offen ist.**
- Mit Nutzer geklärt (11.07.2026): Presigned-artiger Upload-Link **ohne Login**, der bei
  Abschluss **technisch ungültig** wird, an **eine feste Adresse**.
- **Technische Auflösung des Presigned-Widerspruchs:** Ein echter S3-Presigned-Link ist
  nicht vorzeitig widerrufbar. Stattdessen **token-gestützte Upload-Seite in der App**:
  Der Link enthält ein **HMAC-signiertes Token** (mit `cookie_secret_key`, kodiert
  `einsatz_id`) statt eines Logins. Die App verifiziert das Token, prüft bei jedem
  Aufruf **`Einsatz offen?`** (sonst 410) und lädt die Datei mit den **eigenen
  MinIO-Credentials** in den Einsatz-Ordner. → kein Login, echte Sperre bei Abschluss,
  MinIO-Zugangsdaten bleiben serverseitig. **Stateless (kein DB-Token) → keine Migration.**
- Sicherheits-Anforderungen (öffentlicher Upload!): Token unfälschbar (HMAC + `compare_digest`);
  nur bei offenem Einsatz; **Rate-Limit pro IP**; **Datei-Bereinigung** (Magic-Bytes,
  EXIF-Strip via `formular_service._datei_bereinigen`; erlaubt PDF+Bilder), Größenlimit;
  Dateinamen sanitisieren (kein Traversal). Upload als Einsatz-Timeline-Ereignis
  protokollieren („Datei per ELW-Link hochgeladen: <name>").
- Umsetzung (Checkliste neues Modul):
  - [x] config_defaults: `modul_elw_aktiv` (false) + `elw_email` (leer)
  - [x] FEATURE_MODULE-Eintrag (`mitgliederseitig=False`) — Modul-Icon: Frontend
  - [x] `elw_service`: Token erzeugen/verifizieren (HMAC via itsdangerous), Anlage-Mail
        (fest `elw_email`, best-effort), Upload verarbeiten (Bereinigung + MinIO + Timeline)
  - [x] `minio_service`: Upload-Ablage im Einsatz-Ordner (`einsatz-<id>/uploads/…`)
  - [x] Öffentl. Router `/api/v1/elw/<token>` (Info) + `/upload` (POST, Rate-Limit 60/30,
        410 bei geschlossen, 403 bei ungültig) — **kein** `require_zugriff`, Token IST die Berechtigung
  - [x] Hook bei Einsatz-Anlage (`einsatz_anlegen` + `importiere_alarm`, nur offene)
  - [x] Backend-Tests `test_elw.py` (10) + feature_modul-Listen; volle Suite 427 grün
  - [x] Frontend: öffentliche Seite `/elw-upload/:token` (`ElwUpload`, Info + Upload,
        410/403-Handling) + Admin-Unterseite `ElwModul` (`elw_email`) + Module-Toggle
        (automatisch via FEATURE_MODULE) + Icon (`elw`→Fahrzeug) + i18n `texte.elw`
  - [x] Doku `docs/elw.md` + Index; Datenschutz-Abschnitt „ELW-Upload" ergänzt
  - [ ] PR nach beta (Review) — Backend-Suite 427 grün, Frontend-Build grün
- Notizen: Neues Modul + öffentlicher Upload = Feature-Branch → PR nach beta (nicht direkt).

---

## Etappe P – Neues Modul „Pressebericht"

### Modul „Pressebericht" (konfigurierbarer Einsatz-Pressebericht als PDF-Mail)

- Status: Erledigt (PR #61 in `beta` gemergt + **deployt** 10.07.2026; Migration 0065 live,
  Modul in FEATURE_MODULE + Config-Defaults registriert, Backend-Suite 412 grün)
- Nachtrag (10.07.2026, direkt auf beta): **Modul-Icon** (Zeitungs-Line-Icon) in
  `navIcons`/`MODUL_ICON` ergänzt (vorher kein Icon in der Modul-Nav). **Versand-UX
  präzisiert** (Nutzer-Rückfrage): Dropdown-Option „Eine bestimmte **Anzahl Stunden** nach
  Abschluss" (statt „Zeit"), Stunden-Feld mit Einheit + Hilfetext (Dauer nach Abschluss,
  keine Uhrzeit; Job prüft alle 15 min), Uhrzeit-Modus mit Hilfetext. Build grün.
- Priorität: Mittel
- Kategorie: Neues Modul
- Skills: planner, new-module, geraetehaus-patterns, tests, review
- Beschreibung: Neues (nicht mitgliederseitiges) Feature-Modul. Für einen Einsatz
  wird ein **Pressebericht** als PDF erzeugt, per Mail an die Abonnenten des
  Ereignisses `benachrichtigung_pressebericht` versendet, im MinIO-Einsatzordner
  abgelegt und der Versand in der Einsatz-Timeline protokolliert. Der Inhalt ist in
  den Modul-Einstellungen (Admin-Unterseite) konfigurierbar.
- Konfigurierbarer Inhalt (Modul-Einstellungen, alles in `app_config`):
  - `pressebericht_felder_grunddaten` (bool): Titel/Zeitpunkt/Adresse/Meldung/Nr.
  - `pressebericht_zusatzfelder` (JSON-Liste von Feld-Schlüsseln): **einzeln**
    wählbare Einsatz-Zusatzfelder (Nutzerwunsch: granular + Blöcke).
  - `pressebericht_felder_divera` (bool): Divera-Infos.
  - `pressebericht_teilnehmer_anzahl` (bool) **und/oder**
    `pressebericht_teilnehmer_namen` (bool): getrennt schaltbar.
  - `pressebericht_fahrzeuge` (bool): Auflistung der Fahrzeuge mit Besatzung.
  - `pressebericht_minio_link` (bool): App-interner Link zum MinIO-Dateibrowser des
    Einsatz-Ordners (Login nötig – bewusst kein öffentlicher Presigned-Link).
- Versandzeitpunkt (`pressebericht_versand_modus`):
  - `schliessen`: sofort beim Abschließen des Einsatzes.
  - `stunden`: `pressebericht_versand_stunden` Stunden **nach Abschluss**.
  - `uhrzeit`: täglich um `pressebericht_versand_uhrzeit`, nur für **abgeschlossene**
    Einsätze, die noch keinen Pressebericht haben.
  - Idempotenz über neue Spalte `einsaetze.pressebericht_gesendet_am`.
- Umsetzung (Checkliste neues Modul):
  - [x] Migration 0065 (`einsaetze.pressebericht_gesendet_am`)
  - [x] Model-Feld, config_defaults (`modul_pressebericht_aktiv` + Inhalt/Versand)
  - [x] FEATURE_MODULE-Eintrag (`mitgliederseitig=False`)
  - [x] Ereignis `benachrichtigung_pressebericht` (EREIGNIS_TYPEN + MODUL_LABEL +
        notifier BETREFF/VORLAGE + Vorlagen-Config-Default)
  - [x] `pressebericht_service` (Daten sammeln, PDF, Versand+MinIO+Timeline)
  - [x] PDF-Template `pressebericht.html`
  - [x] Hook in `einsatz_abschliessen` (Modus `schliessen`) + Scheduler-Job
        (Modus `stunden`/`uhrzeit`)
  - [x] Backend-Tests
  - [x] Frontend: Modul-Unterseite `PresseberichtModul` (Inhalt/Zusatzfelder einzeln/
        Versandmodus) + Module-Übersicht-Toggle (automatisch via FEATURE_MODULE) +
        MinIO-Dateibrowser Deep-Link (`?bucket=&prefix=`)
  - [x] Doku `docs/pressebericht.md` + Index
  - [x] Datenschutz-Seite ergänzt (11.07.2026): eigener „Pressebericht (optional)"-Abschnitt
        in `Datenschutz.tsx` (PDF mit Teilnehmer-Namen/Fahrzeugen, Versand per Mail an
        Abonnenten, Ablage im Objektspeicher, Versandzeitpunkt). Build grün.
- Akzeptanzkriterien: Modul an/abschaltbar; Inhalt konfigurierbar; PDF enthält nur
  aktivierte Blöcke; Versand in allen drei Modi; Timeline-Eintrag; PDF im MinIO-
  Ordner; Abonnenten-Mail; `scripts/test-backend.sh` + `npm run build` grün.
- Notizen: Neues Modul = Feature-Branch → PR nach beta (nicht direkt), NICHT main.
  Geklärt mit Nutzer (10.07.2026): interner MinIO-Ordner-Link, Zusatzfelder einzeln
  wählbar, Teilnehmer Anzahl und/oder Namen getrennt schaltbar.

---

## Etappe C – Dienststunden-Erfassung touch-freundlich

### Dienstbuch-Felder analog Einsatz-Felder (+ Typ „Auswahl")

- Status: Erledigt (Feature-Branch `feature/dienstbuch-zusatzfelder` → PR nach beta, 06.07.2026)
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
- Umsetzung (06.07.2026): Migration 0057 (`dienstbuch_feld_definitionen` inkl.
  `optionen`-JSONB + `dienstbuecher.zusatzfelder`-JSONB), Model
  `DienstbuchFeldDefinition`, Schemas (`ERLAUBTE_TYPEN` = text/mehrzeilig/checkbox/
  **auswahl**), Service-CRUD + `zusatzfelder_aktualisieren`, Router (Moderator-CRUD
  `/moderator/stammdaten/dienstbuch-felder` unter `stammdaten`-Recht; öffentlich
  gegatet `/dienstbuecher/feld-definitionen` + `PATCH /dienstbuecher/{id}/zusatzfelder`).
  PDF-Export gibt Zusatzfelder aus. Frontend: `DienstbuchFelderVerwaltung`
  (Modul-Unterseite Dienstbuch, inkl. Optionen-Editor), Rendering aller Feldtypen im
  Dienstbuch-Anlegen-Formular + Anzeige in der Liste. Tests `test_dienstbuch_felder.py`
  (4). Volle Suite 332 grün, `npm run build` grün.
- **Follow-up (offen, niedrig):** Typ „auswahl" auch für **Einsatz**-Felder
  nachrüsten (braucht `optionen`-Spalte auf `einsatz_feld_definitionen` + Anpassung
  Einsatz-Formular/PDF). Bewusst separat, um das laufende Einsatz-Flow nicht zu
  gefährden.

---

## Etappe D – Moderator-Bereich Mobile-Optimierung

### Personal-Seite: Detailansicht-Navigation auf Mobile (Screenshot-Befund)

- Status: Erledigt (Commit 57de26d, Etappe D + E; verifiziert 06.07.2026)
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

- Status: Erledigt (09.07.2026)
- Priorität: Mittel
- Kategorie: Bug / Frontend
- Skills: bugfix, review
- Beschreibung: Auf schmalen Screens ist rechts eine abgeschnittene Karte sichtbar
  (horizontaler Overflow). Ursache prüfen (festes `min-width` bzw. flex/grid ohne
  `overflow`); alle Moderator-Seiten auf horizontalen Scroll prüfen und beheben.
- Akzeptanzkriterien: Kein horizontaler Scroll/Overflow auf schmalen Screens.
- Umsetzung (09.07.2026): Layout-Container geprüft – alle defensiv (`.mod-content`/
  `.personal-detail` `min-width:0`, `.formular-zeile`/`.personal-*` `flex-wrap`,
  Tabellen in `.tabelle-scroll`, mobile Sidebar `position:fixed` off-canvas). **Ursache:
  keine `overflow-wrap`/`word-break`-Regel** → lange, nicht umbrechbare Strings (E-Mails,
  URLs, Barcode-Tokens, Recovery-Codes) zogen Karten über die Viewport-Breite. Fix in
  `index.css`: `body { overflow-wrap: break-word }` (Ursache) + `#root { overflow-x: clip }`
  als sticky-sicheres Netz (`clip` statt `hidden` → kein Scroll-Container, `position:sticky`
  der Personal-Suche unberührt; `.tabelle-scroll` scrollt weiter intern). Build grün.

### Personal-Liste mobile: Sticky Suche/Button

- Status: Erledigt
- Priorität: Niedrig
- Kategorie: Frontend / Design
- Skills: geraetehaus-patterns, review
- Beschreibung: „+ Person hinzufügen"-Button und Suche als Sticky-Leiste oben
  fixieren, damit man in langen Listen nicht zurückscrollen muss; Suche prominenter
  (volle Breite, direkt unter dem Titel).
- Akzeptanzkriterien: Suche/Button bleiben beim Scrollen erreichbar.
- Notizen: `Personal.tsx`.

### Dark Mode: alternatives Logo hinterlegbar

- Status: Erledigt
- Priorität: Niedrig
- Kategorie: Feature / Frontend
- Skills: geraetehaus-patterns, review
- Beschreibung: Zweites Logo-Upload-Feld in den Einstellungen, das im Dark Mode
  statt des Standard-Logos angezeigt wird.
- Akzeptanzkriterien: Im Dark Mode wird das Alternativ-Logo genutzt, sonst das
  Standard-Logo.
- Notizen: `prefers-color-scheme` bzw. vorhandener Darkmode-State in `index.css`.

### Moderator-Navigationsmenü optisch aufwerten (Screenshot-Befund)

- Status: Erledigt
- Priorität: Niedrig
- Kategorie: Frontend / Design / UX
- Skills: geraetehaus-patterns, review
- Umsetzung (03.07.2026): Komplett neu als moderne **Sidebar** umgesetzt
  (`ModeratorLayout.tsx` + `navIcons.tsx`, Styles in `index.css`). Gruppen mit
  Zwischenüberschriften (Listen / Verwaltung / Module); je Eintrag ein Line-Icon
  (Feather-Stil). „Listen" und „Module" sind auf-/zuklappbar; deren Unterpunkte
  (Modul-Unterseiten bzw. Listen-Tabs) hängen eingerückt darunter und werden bei
  deaktiviertem Modul ausgeblendet. Aktiver Punkt mit farbiger Fläche/Tint.
  Mobil als Off-Canvas-Drawer mit Overlay + Schließen-Button; „Abmelden" fest am
  unteren Sidebar-Rand verankert, Nav-Liste scrollt (Button bleibt erreichbar,
  `100dvh` für die mobile Browserleiste).
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

- Status: Erledigt (Commit 57de26d, Etappe D + E; verifiziert 06.07.2026)
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

- Status: Erledigt (Commit 57de26d, Etappe D + E; verifiziert 06.07.2026)
- Priorität: Niedrig
- Kategorie: Frontend / Design
- Skills: geraetehaus-patterns, review
- Beschreibung: Kompakter Streifen mit Avatar (~40 px, Bild oder Initialen), Name
  daneben, „Abmelden" als kleiner Textlink rechts – spart Höhe.
- Akzeptanzkriterien: Profil-Zeile ersetzt den großen Begrüßungsblock.
- Notizen: nur `MitgliedHub.tsx` + `index.css`.

### (2) Kacheln 2-spaltig im CSS-Grid

- Status: Erledigt (Commit 57de26d, Etappe D + E; verifiziert 06.07.2026)
- Priorität: Niedrig
- Kategorie: Frontend / Design
- Skills: geraetehaus-patterns, review
- Beschreibung: Quadratische Kacheln (Icon oben, Label unten) analog Kiosk, auf
  schmalen Screens 2 Spalten statt Vollbreite-Stack.
- Akzeptanzkriterien: 2-spaltiges Grid auf Mobil.
- Notizen: nur `MitgliedHub.tsx` + `index.css`.

### (3) Einheitliche Kachel-Styles

- Status: Erledigt (Commit 57de26d, Etappe D + E; verifiziert 06.07.2026)
- Priorität: Niedrig
- Kategorie: Frontend / Design
- Skills: geraetehaus-patterns, review
- Beschreibung: Keinen selektiven orangen Rand (wirkt wie hängengebliebener
  Aktiv-State); Aktiv/Hover nur bei echtem Touch/Klick.
- Akzeptanzkriterien: Konsistente Kachel-Optik ohne falschen Aktiv-Zustand.
- Notizen: nur `MitgliedHub.tsx` + `index.css`.

### (4) „Abmelden" in die Profil-Zeile integrieren

- Status: Erledigt (Commit 57de26d, Etappe D + E; verifiziert 06.07.2026)
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

- Status: Erledigt
- Priorität: Mittel
- Kategorie: Frontend
- Skills: geraetehaus-patterns, review
- Beschreibung: Sobald die Person sich am Handy mit Name und PIN eingeloggt hat,
  neben dem QR-Code sofort Profilbild und Name anzeigen.
- Akzeptanzkriterien: Nach Login erscheint Bild+Name beim QR-Code der Buchung.
- Erledigt (06.07.2026, verifiziert): Bereits umgesetzt in
  `pages/fahrzeugbuchung/Fahrzeugbuchung.tsx` – die QR-Ansicht pollt
  `holeFahrzeugbuchungReservierung` und zeigt nach dem PIN-Login der Person
  `vorschau_person_name` + `vorschau_bild_url` (mit Initialen-Fallback) neben dem
  QR-Code an (min. 3 s sichtbar). Status war irrtümlich noch „Backlog".

### „Barcode vergessen": überall Name+PIN erzwingen

- Status: Erledigt (PR #33 gemergt + auf beta deployt, 06.07.2026)
- Priorität: Hoch
- Kategorie: Bug / Sicherheit
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Überall wo „Barcode vergessen" geklickt wird, muss am Handy
  Name+PIN eingegeben werden, bevor Bilder erscheinen. Ohne PIN Option sperren und
  dies in der Personen-Timeline vermerken.
- Akzeptanzkriterien: Kein Bild-Zugriff ohne PIN-Login; PIN-lose Personen gesperrt;
  Timeline-Vermerk; Test.
- Umsetzung (06.07.2026): Restlücke geschlossen. PIN-Zwang, Sperre PIN-loser Personen
  und Timeline-Vermerk (`pin_zugriff_verweigert`) waren bereits serverseitig in
  `stammdaten_service.pin_login_erzwingen` umgesetzt (greift für alle vier Module über
  `*_vorschau_setzen`/`einloesen`); ebenso ist das Vorschaubild am Gerätehaus-Display
  schon hinter korrektem PIN. **Offene Lücke:** Der Roster-Endpunkt
  `GET /…reservierungen/{token}/personen` lieferte den **kompletten `PersonOut` inkl.
  `bild_url`** – jeder Token-Inhaber konnte so die Profilbilder aller Mitglieder
  abgreifen, und die mobile „Ohne Barcode eintragen"-Seite zeigte das Foto direkt bei
  der Namensauswahl (vor PIN). Fix: neues schlankes Schema `ReservierungPerson`
  (id/name/pin_gesetzt/gruppe_id/funktion_id, **kein `bild_url`**) als `response_model`
  aller vier Roster-Endpunkte (Einsatz/Dienstbuch/Dienststunden/Fahrzeugbuchung); die
  vier mobilen Seiten zeigen nur noch Initialen statt Foto. Regressionstest in
  `test_barcode_pin_pflicht.py` (Roster ohne `bild_url`); volle Suite 268 grün,
  `npm run build` grün.

---

## Etappe G – Per-Zugang-Benachrichtigungen (sequenziell)

### (1) E-Mail-Adresse pro Moderatoren-Zugang

- Status: Erledigt (PR #37 gemergt + auf beta deployt, 06.07.2026)
- Umsetzung (06.07.2026): Migration 0055 (`moderatoren.email` nullable), Model +
  Schemas (`ModeratorOut.email`, `ModeratorAnlegen.email`, neues
  `ModeratorAktualisieren`), Service (`moderator_anlegen(email)` +
  `moderator_email_setzen`, leer→NULL). API: `email` beim Anlegen +
  neuer `PATCH /moderator/einstellungen/moderatoren/{id}` (Audit-Hook
  `moderator_email_geaendert`). Frontend: E-Mail-Spalte + „E-Mail"-Button (Prompt)
  je Zugang und E-Mail-Feld im Anlegen-Formular (`Einstellungen.tsx`). Tests
  `test_moderator_email.py` (3); Suite 291 grün, `npm run build` grün.
- Priorität: Mittel
- Kategorie: Feature / Datenbank / Backend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Neues Feld `email` auf `moderatoren` (Migration), Endpunkte
  `moderator_anlegen`/`moderator_aktualisieren` erweitern, E-Mail-Feld in
  `Einstellungen.tsx` (Bereich Admin-/Gruppenführer-Zugänge).
- Akzeptanzkriterien: E-Mail pro Moderator speicherbar; Migration; Test.
- Notizen: Voraussetzung für (2) **und** für E-Mail-OTP-2FA (Etappe P4).

### (2) Benachrichtigungen pro Moderatoren-Zugang statt global

- Status: Erledigt (Feature-Branch `feature/g2-moderator-benachrichtigungen` → PR nach beta, 07.07.2026)
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
- Umsetzung (07.07.2026, Scope + non-breaking Default mit Nutzer geklärt): Feld
  `moderatoren.benachrichtigungen_aktiv` (Migration 0058, Default aus) statt eigener
  Tabelle – die **admin-/betrieblichen** Mails betreffen faktisch nur wenige Ereignisse
  (Buchungsanfrage-Aktionen, Backup-Status), daher ein Opt-in-Flag statt einer
  Ereignis-Matrix. Zentraler Resolver `moderator_service.admin_benachrichtigungs_empfaenger`
  = opted-in Moderatoren **∪ bestehende globale Liste `notifier_email_recipients`**
  (case-insensitiv dedupliziert) → **non-breaking**, bestehende Empfänger behalten ihre
  Mails, Moderatoren kommen additiv dazu. Eingehängt in `aktions_mail_versenden`
  (Buchung) und beide Backup-Mail-Stellen. API: `benachrichtigungen_aktiv` in
  ModeratorOut/Anlegen/Aktualisieren; PATCH nutzt `model_fields_set` (Teil-Update ohne
  E-Mail-Verlust). Frontend: Checkbox-Spalte „Benachrichtigungen" in der
  Moderatoren-Verwaltung (nur mit hinterlegter E-Mail aktivierbar). Tests
  `test_g2_moderator_benachrichtigungen.py` (4). Suite 352 grün, `npm run build` grün.
- **Bewusste Abweichung:** Die globalen `benachrichtigung_*`-Master-Schalter bleiben –
  sie steuern die **Mitglieder**-Ereignis-Abos (anderer Zweck als die Admin-Empfänger)
  und wurden **nicht** entfernt, um das Mitglieder-Notification-Verhalten nicht zu
  ändern. Die globale `notifier_email_recipients`-Liste bleibt als non-breaking
  Zusatzquelle/Backup-Ziel erhalten.

### (3) Mitglieder-Benachrichtigungen pro Modul

- Status: Erledigt (Feature-Branch `feature/benachrichtigung-pro-modul` → PR nach beta, 07.07.2026)
- Priorität: Mittel
- Kategorie: Feature / Backend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Statt einem `benachrichtigungen_aktiv`-Schalter pro Person je Modul
  (Einsatz/Dienstbuch/Dienststunden/Fahrzeugbuchung) separat wählbar. Neue Tabelle
  `person_benachrichtigungen` oder JSONB-Feld auf `Person`; Pro-Modul-Schalter in
  der Mitglied-Profilseite.
- Akzeptanzkriterien: Pro-Modul-Opt-in wirkt; Migration; Test.
- Umsetzung (07.07.2026, Scope mit Nutzer geklärt): **Steuerung im Personal-Bereich
  (moderatorseitig), pro aktiviertem Modul** – nicht als Mitglied-Selfservice. Baut
  auf dem bestehenden Pro-Ereignis-Abo-System (`PersonEreignisAbo`) auf statt einer
  neuen Tabelle; **keine Migration nötig**. Jedes `EreignisTyp` trägt jetzt eine
  Modulzuordnung (`modul`), neuer Helper `verfuegbare_ereignis_typen()` liefert
  modulunabhängige Ereignisse immer, modulgebundene nur bei aktivem `modul_<key>_aktiv`.
  `/moderator/ereignis-typen` filtert entsprechend und liefert `modul`/`modul_label`;
  die Abo-UI in `PersonKanaele.tsx` gruppiert die Ereignisse nach Modul. Tests
  `test_benachrichtigung_pro_modul.py` (2) + bestehender Routing-Test angepasst.
  Suite 342 grün, `npm run build` grün.
- **Hinweis:** Kein Mitglied-Selfservice/Profilseite und keine neue Tabelle – der
  Backlog-Wortlaut („Mitglied-Profilseite", „Migration") wurde nach Rücksprache auf
  die moderatorseitige, migrationsfreie Umsetzung angepasst.

---

## Etappe H – Personen-Auswertung & Timeline-Details

### Personen-Auswertungsseite (Timeline + Punkteverlauf)

- Status: Erledigt (07.07.2026 – Timeline filterbar; Punkteteil gegenstandslos)
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
- Umsetzung (07.07.2026): Der **Punkteverlauf-Teil entfällt** – ein Punktesystem
  existiert im Code nicht (mehr). Eine **chronologische Personen-Timeline existiert
  bereits inline** (Personal-Detail, Tab „Verlauf", `GET /personen/{id}/timeline`),
  ein separater Endpunkt/eine eigene Route wären redundant. Verbleibender Nutzen –
  **„filterbar"** – umgesetzt: Filter-Dropdown „Nach Ereignistyp" im Verlaufs-Tab
  (dynamisch aus den vorhandenen `typ`-Werten, mit lesbaren Labels, Fallback auf
  Rohwert; erscheint erst ab >1 Typ; robust bei Personenwechsel). `npm run build` grün.

### Timeline-Einträge im Admin-Bereich detaillierter

- Status: Erledigt/gegenstandslos (07.07.2026 – geprüft, kein Handlungsbedarf)
- Priorität: Niedrig
- Kategorie: Feature / Backend / Frontend
- Skills: geraetehaus-patterns, review
- Beschreibung: `PersonEreignis`-Einträge mit mehr Kontext anzeigen (Punkte:
  Anzahl/Grund/Vergeber; Einsätze: Titel/Funktion/Fahrzeug; Dienstbuch: Typ).
  Prüfen ob `detail`-Feld reicht oder beim Schreiben angereichert werden muss.
  Mitglieder-Timeline separat/anders (eigener Punkt, offen).
- Akzeptanzkriterien: Timeline-Einträge zeigen den relevanten Kontext.
- Notizen: teilweise punktebezogen – siehe Etappe-N-Konflikt.
- Prüfung (07.07.2026): Kein Handlungsbedarf. **Punkte** existieren im Code nicht
  (mehr) → entfällt. **Einsatz-/Dienstbuch-Teilnahmen werden gar nicht in die
  Personen-Timeline (`PersonEreignis`) geschrieben** – dort landen nur Stammdaten-/
  PIN-/Bild-/Dienststunden-Ereignisse; Einsatz-/Dienstbuch-Verlauf liegt in
  `EinsatzEreignis`/Dienstbuch. Die **Dienststunden-Einträge sind bereits detailliert**
  („5 Stunden als Truppmann am …"). Damit sind die beschriebenen Anreicherungen
  gegenstandslos bzw. bereits vorhanden.

---

## Etappe I – Externe Kalender im Buchungskalender

### Externe/iCal-Kalender im Buchungskalender überlagern

- Status: Erledigt (Feature-Branch `feature/ical-kalender` → PR nach beta, 07.07.2026)
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
- Umsetzung (07.07.2026, Design mit Nutzer geklärt): Deps `icalendar` +
  `recurring-ical-events` (RRULE-Expansion). Config `fahrzeugbuchung_ical_urls`
  (eine URL/Zeile, webcal→https). `externe_termine_service` lädt (httpx, 5-Min-Cache,
  fehlertolerant – Feed-Fehler brechen die Buchung nie) und parst die Feeds; Termine
  UTC-normalisiert. `hat_konflikt` bezieht Fremdtermine ein (**global über alle
  Fahrzeuge, weicher Konflikt-Hinweis** – Buchung bleibt möglich, wird markiert; passt
  zum bestehenden Soft-Konflikt-Modell). Endpunkt `GET /buchungen/externe-termine`.
  Frontend: `BuchungsKalender` überlagert Fremdtermine (grau/gestrichelt, nicht
  klickbar, Legende), `Fahrzeugbuchung` lädt sie, Admin-Config in der
  Fahrzeugbuchung-Modul-Unterseite (iCal-URLs-Textarea). Tests
  `test_externe_termine.py` (5, HTTP gemockt). Suite 348 grün, `npm run build` grün.
- **Hinweis:** Divera-eigener API-Abruf statt iCal wurde bewusst nicht umgesetzt –
  Divera bietet iCal-Export, der generische iCal-Weg deckt das ab.

---

## Etappe J – Personen-CSV-Import

### CSV-Import für Personen inkl. Beispieldatei

- Status: Erledigt
- Priorität: Mittel
- Kategorie: Feature / Backend / Frontend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Neuer Endpunkt `POST /moderator/stammdaten/personen/csv-import`,
  der eine CSV zeilenweise über `person_anlegen()` verarbeitet (inkl. Punkte/
  Timeline), Gruppen/Funktionen per Name auflöst, Fehler pro Zeile sammelt statt
  abzubrechen. Beispiel-CSV als statische Datei zum Download neben dem Upload-Button.
- Akzeptanzkriterien: CSV-Upload legt Personen an, Fehlerreport pro Zeile;
  Beispieldatei verfügbar; Test.
- Notizen: Erledigt (PR nach `beta`). Service `personen_csv_importieren`
  (Trennzeichen `;`/`,` autoerkennung, utf-8-sig, Name→Gruppe/Funktion
  case-insensitiv), Endpunkte `.../personen/csv-import` + `.../personen/csv-vorlage`,
  UI im Personal-Kopf (Button „CSV-Import" → Modal mit Vorlage-Download,
  Upload, Fehlerreport pro Zeile). Tests `test_personen_csv_import.py` (5).

---

## Etappe K – Druck-Fallback für Einsatz-/Dienstbuch-PDF (Netzwerkdrucker per IPP)

Geklärter Scope: **nur** für die beiden Benachrichtigungen mit PDF-Anhang (Einsatz-/
Dienstbuch-Abschluss). Standard: Fallback, wenn SMTP fehlschlägt (druckt das bereits
erzeugte Anhang-PDF); zusätzlich pro Modul optional „immer ausdrucken". Zieldrucker:
Netzwerkdrucker mit IPP/CUPS im LAN.

### Druck-Fallback per IPP (gesamtes Feature)

- Status: Erledigt (PR #59 in `beta` gemergt + deployt, 09.07.2026; IPP-Transport in
  Tests gemockt → **Praxis-Check an echtem IPP-Drucker weiterhin empfohlen**)
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
- Umsetzung (09.07.2026, Feature-Branch `feature/druck-ipp`): `druck_service.py` mit
  **minimalem IPP-`Print-Job` über httpx** (keine neue Abhängigkeit; `drucke_pdf`,
  `drucke_pdf_falls_konfiguriert`, `test_drucken`). Config-Keys `drucker_aktiv`/
  `drucker_ipp_url`/`drucker_immer_einsatz`/`drucker_immer_dienstbuch` in `config_defaults`.
  Einsatz-/Dienstbuch-Abschluss-Hook druckt als **Fallback** bei Mail-Fehler und **immer**
  bei `drucker_immer_*` (auch ohne Mail; PDF nur einmal erzeugt). Endpunkt
  `POST /moderator/einstellungen/testdruck` (502 bei Druckfehler, analog Testmail).
  Frontend: Karte „Netzwerkdrucker (IPP)" in `NotifierEinstellungen.tsx` (Schalter, URL,
  zwei „immer"-Checkboxen, Testdruck-Button). Tests `test_druck.py` (12, grün: IPP-Kodierung,
  HTTP/IPP-Fehler, Fallback- + Immer-Pfad Einsatz/Dienstbuch, Endpunkt); volle Suite 405 grün;
  Frontend-Build grün. **Offen:** Verifikation an echtem IPP-Drucker + Doku bei Release.

---

## Etappe L – Dienstbuch „Relevant"-Markierung + Mindest-Dienstbeteiligung

### Dienstbuch-Eintrag als „relevant" markieren

- Status: Erledigt
- Priorität: Mittel
- Kategorie: Feature / Datenbank / Backend / Frontend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Neues Bool-Feld `relevant` auf `Dienstbuch`; Endpunkt
  `PATCH /moderator/dienstbuecher/{id}/relevant` (CurrentModerator); Button in der
  Dienstbuch-Detailansicht.
- Akzeptanzkriterien: Markierung setz-/rücksetzbar; Migration; Test.
- Erledigt (04.07.2026, beta): Migration 0047 (`dienstbuecher.relevant`, additiv/
  non-breaking), Model/Schema (`DienstbuchOut.relevant` + `RelevantSetzen`),
  `dienstbuch_service.relevant_setzen`, Endpunkt `PATCH /dienstbuecher/{id}/relevant`
  (CurrentModerator). Frontend: Toggle-Button + „★ relevant"-Badge in
  `DienstbuchDetailModerator.tsx`. Tests `test_dienstbuch_relevant.py` (3, grün);
  volle Suite 186 grün. Doku `docs/dienstbuch.md` ergänzt. Baut die Grundlage für
  „Anzahl relevanter Dienste pro Person" (nächster Punkt).

### Anzahl relevanter Dienste pro Person abrufbar

- Status: Erledigt
- Priorität: Niedrig
- Kategorie: Feature / Backend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Query-Parameter/Endpunkt für die Anzahl relevanter Dienste pro
  Person – Grundlage für ein späteres Mindest-Dienstbeteiligungs-Modul.
- Akzeptanzkriterien: Wert abrufbar; Test.
- Erledigt (05.07.2026, beta): `dienstbuch_service.relevante_dienste_pro_person(db,
  von, bis)` (gruppierte Query, distinct je Dienstbuch, optionaler Zeitraum) +
  Endpunkt `GET /dienstbuecher/relevante-uebersicht?von=&bis=` (CurrentModerator,
  vor `/{id}` platziert) + Schema `RelevanteDiensteEintrag`. Tests in
  `test_dienstbuch_relevant.py`. Volle Suite 215 grün. Nächster Baustein:
  Mindest-Dienstbeteiligung (Schwelle + Ampel/Benachrichtigung) – siehe Vorschlag.md.

---

## Etappe M – Modul-Architektur & Zeitzone (Feature-Branch + PR erforderlich)

### Einheitliche Modul-Bereiche (Mitglied/Moderator/Admin)

- Status: Erledigt
- Priorität: Mittel
- Kategorie: Architektur / Dokumentation
- Skills: planner, geraetehaus-patterns, review
- Umsetzung (03.07.2026): Durch die Modul-Architektur (Feature-Module + je Modul
  eine Admin-Unterseite, die alle Einstellungen/Daten bündelt; An/Aus + Kiosk-
  Anzeige + Außenzugriff auf der „Module"-Übersicht) sind alle Module konform. Die
  Drei-Bereiche-Konvention (Mitglied/Kiosk, Moderator, Admin) ist in `CLAUDE.md`
  (Abschnitt „Module") dokumentiert.
- Beschreibung: Jedes Modul soll drei Bereiche haben: (1) Mitglieder/Kiosk,
  (2) Moderator/Gruppenführer, (3) Admin (Einstellungen; konfigurierbar: Moderator-
  Schreibrechte, Außenzugriff). Bestehende Module auf Konformität prüfen und
  fehlende Admin-Einstellungen nachrüsten; Konvention in `CLAUDE.md` dokumentieren.
- Akzeptanzkriterien: Module konform; Konvention dokumentiert.

### Modul-Erweiterbarkeit: Checkliste in CLAUDE.md

- Status: Erledigt
- Priorität: Niedrig
- Kategorie: Dokumentation
- Skills: knowledge-management
- Umsetzung (03.07.2026): Kompakte Checkliste für neue Module im Abschnitt
  „Module" von `CLAUDE.md` ergänzt (Migration/Model/Schema/Service/Router mit
  `require_modul_aktiv()`, `FEATURE_MODULE`-Eintrag, `modul_*`-Config-Defaults,
  Frontend inkl. Modul-Unterseite, Kiosk-/Hub-Kachel, Benachrichtigungs-Hook,
  Tests); Detail-Checkliste bleibt im `new-module`-Skill.
- Beschreibung: Checkliste für neue Module (Router, Service, Migration,
  `modul_*`-Config-Keys, Frontend-Route, Kiosk-/Hub-Kachel, Benachrichtigungs-Hook)
  in `CLAUDE.md`. Prüfen ob ein eigener Skill sinnvoll ist.
- Akzeptanzkriterien: Checkliste vorhanden.
- Notizen: Teil-Überschneidung mit dem bestehenden `new-module`-Skill.

### Zeitzone durchgängig Europe/Berlin

- Status: Erledigt (07.07.2026 – Anzeige app-weit zeitzonenkorrekt)
- Priorität: Mittel
- Kategorie: Feature / Backend / Frontend
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Backend (Server, DB-Timestamps, Scheduler) und Frontend-Anzeige
  durchgängig Europe/Berlin statt UTC/Server-Zeit; DB speichert weiter UTC. Neuer
  app_config-Schlüssel `zeitzone` (Default `Europe/Berlin`); zentrale Konvertierung
  UTC→Zeitzone (nicht pro Modul), inkl. Sommer-/Winterzeit. Kein Setup-Wizard-Feld.
- Akzeptanzkriterien: Anzeige/Speicherung zeitzonenkorrekt; Test.
- Umsetzung (07.07.2026): Backend war für Vergleiche/Scheduler bereits
  zeitzonenkorrekt (`app/core/zeit.py`); `zeitzone` wird über
  `/oeffentliche-konfiguration` ans Frontend ausgeliefert. Zentrale Formatier-Helfer
  `utils/datum.ts` (`formatiereDatumZeit/Datum/Zeit`, modulweite aktive Zeitzone via
  `setZeitzone`, gesetzt aus der Konfig im `ConfigContext`) rechnen für die Anzeige in
  die Org-Zeitzone um (inkl. Sommer-/Winterzeit über `Intl`). **Alle `toLocale*`-
  Aufrufe app-weit ersetzt** – zuerst Mitglieder-/Kiosk-Seiten (PR #51), dann sämtliche
  Moderator-/Admin-Seiten (Listen, AuditLog, Systemstatus, BarcodeGenerator,
  Einsatz-/Dienstbuch-Detail, Buchungsmanagement, Update, Personal, Backup-/Minio-/
  Divera-/Formular-Modul). Kein `toLocale` mehr im Frontend. Tests `utils/datum.test.ts`
  (4) + Backend `test_konfig_liefert_zeitzone`; Suite 343 grün, `npm run build`/`test` (25) grün.

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
- Bugfix (06.07.2026, direkt auf beta): **Beta-Kanal bot fälschlich ein Stable-Update
  an** (Nutzermeldung). Ursachen: (1) `_passende_release` gab im Beta-Kanal das neueste
  Release *inkl. Stable* zurück → jetzt liefert der Beta-Kanal **nur Prereleases**
  (Wechsel auf Stable ist bewusst ein Kanalwechsel); (2) `update_verfuegbar` prüfte nur
  auf Ungleichheit (`!=`) → jetzt echte „neuer als"-Prüfung via `packaging.version`
  (neuer `_ist_neuer`), verhindert Downgrade-Anzeige (installiert 0.4.0 vs. ältere
  0.4.0-beta.1). Regressionstests in `test_update_kanal.py`; Suite 277 grün.

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

- Status: Erledigt
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
- Notiz (Stand 04.07.2026): **Stable v0.4.0** veröffentlicht (GitHub-Release, latest, kein
  Prerelease). Checkliste durchlaufen: Datenschutz (Backups/Objektspeicher ergänzt), README,
  alle docs/*.md geprüft, pytest (179) + npm run build grün. Migrationen bis 0046.
- Notiz (Stand 03.07.2026): Beta **0.3.0-beta.3** veröffentlicht (GitHub-Prerelease).
  Release-Checkliste dabei abgearbeitet: Datenschutz-Seite aktualisiert; README
  gegen aktuellen Stand geprüft und nachgezogen (Punktesystem entfernt, Module/
  Berechtigungen, Divera-Adresse/Meldung/Personal, Updater, Hintergrundjobs). Ein
  eigenständiges **Stable-Release** (Nicht-Prerelease) steht weiterhin aus.
- Notiz (Stand 03.07.2026): Nach dem Merge des Barcode-/Namen+PIN-Logins die
  Datenschutz-Seite (`Datenschutz.tsx`) erneut nachgezogen: PIN ist jetzt der
  Standard-Login (Namensauswahl + PIN am Kiosk und beim Außenzugriff), inkl. der
  neuen E-Mail-Verarbeitung (PIN-Self-Service-Link, Moderator-Freigabe,
  Erinnerungsmails) und Barcode als optionale Alternative.

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
- Notiz (09.07.2026): Auch auf ausdrückliche Nutzer-Aufforderung **zweimal vom
  Self-Modification-Guard blockiert** – das Schreiben einer Permission-Allowlist in
  `.claude/settings.json` durch den Agenten ist im Auto-Mode gesperrt (der Guard will,
  dass der Nutzer die konkreten Regeln selbst prüft/einträgt). **Muss der Nutzer selbst
  anlegen** (fertiger Inhalt wurde in der Konversation als Copy-&-Paste-Block geliefert)
  oder außerhalb des Auto-Mode freigeben. Danach kann der Punkt auf Erledigt.

### Frontend-Container-Healthcheck meldet „unhealthy" (IPv4/IPv6)

- Status: Erledigt
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
- Erledigt (03.07.2026): Variante (a) umgesetzt – Healthcheck nutzt jetzt
  `http://127.0.0.1:80/` (IPv4 erzwungen). Container meldet nach Rebuild `healthy`.

---

## Einsatztagebuch

### Einsatz-Statistik: Jahresanzahl mit Vorjahresvergleich zum Stichtag

- Status: Erledigt (direkt auf beta, 07.07.2026)
- Priorität: Niedrig
- Kategorie: Feature / Backend / Frontend
- Skills: geraetehaus-patterns, tests, review
- Umsetzung (07.07.2026): `einsatz_service.jahres_statistik` (Zählbasis = **angelegte**
  Einsätze nach `zeitpunkt`, zeitzonenkorrekt via `zeit.jetzt_lokal`; Vorjahr bis
  gleicher Kalendertag, 29.02.→28.02. abgefangen). Config `einsatz_statistik_offset`
  (+ `_offset_jahr`) als Startwert vor App-Einführung. Endpunkt `GET /einsaetze/statistik`
  (gegatet wie die Liste). Frontend: Statistik-Zeile im Einsatztagebuch
  („<Jahr>: <n> Einsätze ±diff (Stichtag heute)"), Startwert-Felder in der
  Einsatztagebuch-Modul-Unterseite. Tests `test_einsatz_statistik.py` (4). Suite 340
  grün, `npm run build` grün.
- **Abweichung/Follow-up:** Der Startwert wird bewusst in der **Modul-Unterseite**
  gepflegt statt im Setup-Wizard – der First-Run-Wizard bleibt schlank (Branding/
  Admin), org-/modulspezifische Werte gehören laut CLAUDE.md in die Modul-Unterseite.
  Falls der Wizard-Punkt gewünscht ist, wäre das ein kleiner Zusatz.
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

### Bug: Barcode-Erneuerungsmail trotz deaktiviertem Barcode-Modul

- Status: Erledigt
- Priorität: Hoch
- Kategorie: Bug / Backend
- Skills: bugfix, tests
- Beschreibung: Bei deaktiviertem Barcode-Modul (Login per Name+PIN) verschickte der
  tägliche `_barcode_erneuerung_job` trotzdem neue Barcodes per Mail, weil weder Job
  noch Service `modul_barcode_aktiv` prüften.
- Erledigt (06.07.2026, direkt auf beta): Guard in `barcode_service.erneuerung_mail_senden`
  (dem zentralen Choke-Point aller Erneuerungs-Aufrufer – Scheduler-Job, Moderator-
  Trigger, Login-Hintergrundtask): bei `modul_barcode_aktiv=false` sofortiger Abbruch,
  keine Neuerzeugung/kein Versand. Regressionstest `test_barcode_modul_aus.py`.

### Personal-Filter nach Benachrichtigungs-Freigaben

- Status: Erledigt
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
- Erledigt (04.07.2026): Gebündelter Endpunkt
  `GET /moderator/personen/benachrichtigungs-uebersicht`
  (`benachrichtigungskanal_service.benachrichtigungs_uebersicht`) liefert je Person
  Abos + `mail_aktiv` (aktiver Mail-Kanal UND hinterlegte Personen-E-Mail). In
  `Personal.tsx` neuer Filter „Abonniert Ereignis"; Personen mit aktivem Mail-Kanal
  bekommen ein 📧-Badge. Tests: Service + Endpunkt.

### Web Push nutzbar machen (Frontend-Abo-Flow)

- Status: Erledigt (direkt auf beta, 07.07.2026)
- Priorität: Niedrig
- Kategorie: Feature / Frontend
- Skills: geraetehaus-patterns, review
- Umsetzung (07.07.2026): Frontend-Abo-Flow ergänzt. `api/push.ts`
  (`holeVapidPublicKey`, `pushSubscribe`, `pushUnsubscribe` – Endpoint als Query),
  `utils/webpush.ts` (`pushWirdUnterstuetzt` inkl. Secure-Context-Check,
  `urlBase64ToUint8Array`), Komponente `PushAktivierung` (holt VAPID-Key, fragt
  Notification-Permission, `pushManager.subscribe`, sendet Subscription; Umschalter
  Aktivieren/Deaktivieren). Eingebunden in `MitgliedHub`. Blendet sich aus, wenn Push
  nicht unterstützt wird (kein HTTPS/Secure Context) oder kein VAPID-Key im Backend
  hinterlegt ist. Tests `utils/webpush.test.ts` (Base64URL-Dekodierung,
  Support-Erkennung); `npm run build` + `npm run test` (18) grün.
- **Hinweis:** End-to-End-Zustellung nur unter HTTPS + echtem Browser testbar (nicht
  in dieser Umgebung); Build/Unit-Tests grün, Zustellung auf der HTTPS-Live-Instanz
  zu verifizieren. Datenschutz.tsx deckt Web-Push bereits ab.
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

## Modul Formular

### Neues Modul „Formular" (Formular-Builder + Einreichungen)

- Status: Erledigt
- Priorität: Mittel
- Kategorie: Neues Modul / Feature / Datenbank / Backend / Frontend
- Skills: planner, new-module, geraetehaus-patterns, tests, review
- Beschreibung: Konfigurierbare Formulare (Feldtypen Text/Mehrzeilig/Checkbox/
  Sterne/Dropdown/Dropdown-Mehrfach, Pflichtfelder), öffentlich oder mit
  Mitglieder-Login absendbar, formularspezifischer E-Mail-Empfänger, Einreichungen
  gespeichert und auswertbar (Admin immer, Moderator je Formular freigebbar).
- Erledigt (04.07.2026, Feature-Branch `feature/formular-modul` → PR nach `beta`):
  Migration 0049 (formulare/formular_felder/formular_einreichungen); Models/Schemas/
  Service (Validierung + Snapshot + `EmailNotifier.send_an`); Router
  `moderator_formular` (Admin) + öffentlicher `formulare` (require_modul_aktiv,
  Rate-Limit, Login-Gate); Feature-Modul `formular` (mitgliederseitig) +
  `modul_formular_*`-Config + öffentliche Config. Frontend: Admin-Unterseite
  `FormularModul`, öffentliche `FormularListe`/`FormularAusfuellen`, Kiosk-/Hub-Kachel,
  Moderator-Tab „Listen → Formulare". Tests `test_formular.py`; `npm run build` grün.
  Doku `docs/formular.md` + Datenschutz ergänzt.
- Erweiterung (04.07.2026, selber PR): **Ablaufdatum** je Formular (Migration 0050,
  `ablauf_am`/`zusammenfassung_gesendet_am`) – abgelaufene Formulare nicht mehr
  absendbar; **teilbarer Link** (kopierbar im Admin) für anonyme Umfragen;
  **Zwischenstand/Auswertung** (Ø/Verteilung/Freitexte) im Admin- und Moderator-
  Bereich (`GET …/zusammenfassung`); **Ablauf-Job** (alle 15 min) schickt bei Ablauf
  eine Auswertung an den E-Mail-Empfänger. Tests erweitert; volle Suite 202 grün.
- Ausbaupaket (04.07.2026, Branch `feature/formular-ausbau` → PR nach `beta`,
  Migration 0051): neue Feldtypen (datum/zahl/email/telefon/ja_nein/skala/datei) +
  Feld-Hilfetext; **Startdatum**, **Kapazität** (ausgebucht), **Aufbewahrungsfrist**
  (Auto-Löschung, Tagesjob), **Danke-Text**, **öffentliches Ergebnis** (ohne Freitext),
  **DSGVO-Einwilligung** (Pflichthäkchen), **Mehrfach-Schutz** (Login: serverseitig;
  anonym: Honeypot + Browser-Marker), **QR-Code** + **CSV-Export** + **Duplizieren**,
  Datei-Upload (`/uploads/formulare`, 10 MB, Bild/PDF). Tests (`test_formular.py`, 20);
  volle Suite 213 grün; `npm run build` grün. Bewusst ausgelassen: Warteliste (nur
  hartes Limit), PDF-Export (nur CSV), MinIO-Archivierung der Uploads.

---

## Personal

### Aktivitäts-Ampel für Personal

- Status: Erledigt
- Priorität: Mittel
- Kategorie: Feature / Datenbank / Backend / Frontend
- Skills: planner, geraetehaus-patterns, tests, review
- Beschreibung: Zwei in Tagen konfigurierbare Schwellen (gelb/rot). Personen ohne
  Eintrag in Einsatz/Dienstbuch/Dienststunden (nur aktive Module) überschreiten die
  Schwelle → Personen-Kachel wird gelb/rot umrandet. Personen als „inaktiv"
  markierbar (keine Ampel/Benachrichtigung/Auto-Löschung). Zwei neue, abonnierbare
  Benachrichtigungen (Ampel gelb/rot), einmalig beim Überschreiten.
- Erledigt (04.07.2026, Feature-Branch `feature/personal-ampel` → PR nach `beta`):
  Migration 0048 (`personen.inaktiv`, `ampel_gemeldet`); `ampel_service`
  (Bulk-Übersicht + Tagesjob mit Zustandswechsel-Logik); Endpunkt
  `GET /moderator/stammdaten/personen/ampel`; 2 Ereignisse verdrahtet
  (`benachrichtigung_person_ampel_gelb/_rot`); Schwellen+Toggles auf der
  Personal-Modul-Unterseite; Rahmenfarbe + Inaktiv-Checkbox + Legende in
  `Personal.tsx`; Tagesjob 7:15 Uhr. Die `inaktiv`-Markierung steuert nur die
  Ampel; die separate Inaktivitäts-Auto-Löschung bleibt davon unberührt (auf
  Wunsch). Tests `test_ampel.py` (7); volle Suite 193 grün; `npm run build` grün.

## Berechtigungsverwaltung & Modul-System

### Granulare, individuelle Berechtigungsverwaltung als eigenständiges Modul

- Status: Erledigt (08.07.2026 – granulares Berechtigungssystem vollständig; letzter
  Baustein „Gruppenführer-Arbeitsbereiche gaten" via PR #56 gemergt + deployt). Bewusst
  **nicht** umgesetzt: die literale Entfernung der `rolle`-Spalte („Phase 5") – eine
  Admin-Instanz bleibt nötig (Rechtevergabe + admin-only Audit/Backup/MinIO/Systemstatus),
  Modell ist auf **Admin vs. rechtebasiert** reduziert. Siehe Item (2) unter Etappe P.
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

### Moderator-Zugänge in Personal integrieren (Person = Konto)

- Status: Erledigt (PR #58 in `beta` gemergt + deployt, 09.07.2026). **Offen als
  Folge:** (a) Migration `0061` = `moderatoren`-Tabelle + `moderator_id`-Spalten
  droppen – **erst nach bestätigtem Livebetrieb** (0060 hält sie für Rollback); (b) der
  Terminologie-Rename „Moderator → Gruppenführer" ist damit **entblockt**. Post-Merge-
  Fix: `test_druck.py`-Admin-Fixture (Moderator → elevated Person).
- Priorität: Hoch
- Kategorie: Auth / Datenbank / Feature (breaking)
- Plan: Ja
- Beschreibung: Die **Person wird das Konto**. „Administrator"/„Gruppenführer" wird in
  Personal an der Person vergeben; Login elevated = **Name + Passwort (+2FA)** an der
  Person (PIN bleibt für Kiosk/Mitglied); Wizard legt erste Person als Admin an; separate
  Moderator-Benachrichtigungen entfallen. Migration: **nur Admin automatisch**, GF manuell.
- Fortschritt (09.07.2026, **Phase 1 – additive DB-Basis**): Migration `0060` +
  Models. `personen` um Moderator-Auth-Felder erweitert (`moderator_rolle`,
  `passwort_hash`, 2FA-Felder, Login-Sperre); `berechtigungen`/`moderator_recovery_codes`/
  `moderator_trusted_devices` um nullable `person_id` (FK), `moderator_id` → nullable
  (Rollback möglich, `moderatoren` bleibt). **Rein additiv** – Code nutzt weiter die
  Moderator-Tabelle. Verifiziert: `alembic upgrade`→0060 **und** downgrade sauber auf
  Scratch-DB; volle Suite **393 grün**.
- Fortschritt (09.07.2026, **Phase 2 – Auth-Engine, WIP-Checkpoint 1**): Strategie mit
  Nutzer bestätigt = **voller Merge** (über mehrere Durchläufe, Merge erst nach voller
  grüner Suite + Smoke-Test). `berechtigungs_service` + `api/deps.py` auf **Person**
  umgestellt (`ist_admin/ist_elevated/hat_zugriff/meine_keys/matrix/set_berechtigung`
  gegen `Berechtigung.person_id`; `CurrentModerator`/`CurrentAdmin` = elevated `Person`,
  JWT-`sub` = `Person.name`). Import-Check grün. **Branch bewusst noch nicht test-grün.**
- Fortschritt (09.07.2026, **Phase 2 – WIP-Checkpoint 2 (Login-Kern)**):
  `zwei_faktor_service` (OTP/Recovery/Trusted-Device) auf **Person + `person_id`**;
  `moderator_service.login_pruefen(name, passwort)` → **Person** (nur mit gesetztem
  Passwort), `admin_benachrichtigungs_empfaenger` → elevated Personen; `auth.py`-Login
  (`/moderator/login` Name+Passwort, `/moderator/2fa`, `_moderator_token` → `sub=Person.name`,
  Challenge/2FA über Person via `stammdaten_service.get_person`); `setup`/Wizard legt die
  **initiale Admin-Person** an (`ist_eingerichtet` am Config-Flag). Import-Check grün.
- Fortschritt (09.07.2026, **Phase 2 – WIP-Checkpoint 3 (Endpunkte)**): Akteur-Zugriffe
  in allen Endpunkten auf Person (`moderator/akteur/admin/ich.username`→`.name`,
  `moderator.rolle`→`.moderator_rolle` inkl. `moderator_formular` Admin-Check);
  `moderator_berechtigungen`-Matrix auf **elevated Personen** (`set_berechtigung(person_id)`);
  `moderator_konto`-2FA-Self auf Person. **`app.main` importiert vollständig sauber**
  (alle Router mit Person-basiertem `deps`). Noch offen in `moderator_einstellungen`:
  die Konto-**Verwaltung** (anlegen/liste/löschen) hängt bewusst noch an der alten
  `moderatoren`-Tabelle (dead-ish) – Umbau zu Person-Elevation im Verwaltungs-Checkpoint.
- Fortschritt (09.07.2026, **Phase 2 – WIP-Checkpoint 4 (Admin-Datenmigration)**):
  Datenmigration in `0060` ergänzt: pro **Admin**-Moderator die namens-/e-mail-gleiche
  Person suchen → dort `moderator_rolle='admin'` + Passwort/2FA/Login-Felder übernehmen;
  ohne Treffer → **neue Admin-Person** anlegen; Rechte/Recovery/Trusted-Devices auf
  `person_id` umhängen. **Gruppenführer werden NICHT migriert** (manuell neu). **Ende-zu-
  Ende auf Scratch-DB verifiziert** (Match-Fall, Neu-Fall, GF-Ausschluss, Rechte-Umhängen)
  + `alembic downgrade` sauber.
- Fortschritt (09.07.2026, **Phase 2 – WIP-Checkpoint 5 (Verwaltungs-Umbau)**):
  Management von Moderator-Konten → **Person-Elevation**. `moderator_service`: alte
  Moderator-CRUD entfernt, neu `elevated_liste`/`person_elevieren`/`person_de_elevieren`
  (räumt 2FA ab)/`person_passwort_setzen`/`anzahl_admins`. Schemas: `ElevatedPersonOut`/
  `PersonElevieren`/`PersonPasswortSetzen` (Moderator*-Schemas raus). `moderator_einstellungen`:
  `/moderatoren`-Endpunkte entfernt. **`moderator_stammdaten`**: neue Admin-only-Endpunkte
  `GET /elevated`, `PUT/DELETE /personen/{id}/elevation`, `PUT /personen/{id}/passwort-setzen`,
  `POST /personen/{id}/2fa-zuruecksetzen` (letzter-Admin-Schutz). `app.main` importiert sauber.
- Fortschritt (09.07.2026, **Phase 2 – WIP-Checkpoint 6 (Tests grün)**): **31 Test-Dateien**
  von Moderator-Fixtures auf **elevated Person** umgestellt (Konstruktor `Person(name=…,
  moderator_rolle=…, passwort_hash=…)`, Login per Name). Management-Tests der entfernten
  `/moderatoren`-Endpunkte umgeschrieben: `test_audit_log` prüft jetzt `person_eleviert`/
  `person_passwort_gesetzt`/`person_de_eleviert` über die neuen Stammdaten-Endpunkte;
  `test_moderator_2fa` Admin-Reset auf `/stammdaten/personen/{id}/2fa-zuruecksetzen`;
  `test_g2` auf Resolver-Tests reduziert (pro-Moderator-CRUD entfällt); `test_moderator_email`
  gelöscht (E-Mail ist reines Person-Feld); `test_anti_aussperr_seed` seedet Rechte über
  `person_id`. **Ergebnis: volle Suite 388 passed / 0 failed** – erster e2e-Meilenstein erreicht.
- Fortschritt (09.07.2026, **Phase 2 – WIP-Checkpoint 7 (Frontend)**): `api/moderator.ts`
  alte Moderator-CRUD durch Elevation-Endpunkte ersetzt (`holeElevatedPersonen`,
  `personElevieren`/`personDeElevieren`/`personPasswortSetzen`/`person2faZuruecksetzen`).
  **Personal.tsx**: neuer Admin-only-Tab **„Zugang"** je Person – Rolle Normal/Gruppenführer/
  Administrator setzen (erstes Mal mit Login-Passwort), Passwort neu setzen, 2FA zurücksetzen,
  Zugang entziehen (nutzt admin-only `/elevated`-Resolver, kein Rollen-Leak in `PersonOut`).
  **ModeratorLogin**: Feld „Benutzername" → „Name" (+ Test). **Einstellungen.tsx**: alte
  `ModeratorenVerwaltung` entfernt (rief entfernte `/moderatoren`-Endpunkte). Validiert:
  `tsc --noEmit` grün, **Production-Build im Docker-Build-Stage grün**, Login-Unit-Test 2/2.
- Offen: **PR nach beta** (Pflicht-Smoke-Test durch Nutzer) → nach bestätigtem Betrieb
  Folge-`0061` (Drop `moderatoren` + `moderator_id`-Spalten). Danach separater Pass:
  Terminologie **Moderator → Gruppenführer** überall (inkl. Gate-Aliase noch
  `Annotated[Moderator]`, Routen/Bezeichner/Kommentare/Docs).

---

## Monitoring & Fehler-Analyse (Sentry)

### Sentry-Ausbau: Cron-Monitoring, Tracing, Frontend + Session Replay

- Status: Erledigt (PR #34 gemergt + auf beta deployt, 06.07.2026)
- Priorität: Mittel
- Kategorie: Feature / Backend / Frontend / DevOps
- Skills: geraetehaus-patterns, tests, review
- Beschreibung: Bestehende Sentry-Anbindung (Backend-Fehler/Logs, opt-in via
  `fehlerberichte_aktiv`) vollständig ausbauen – u. a. Schedule-/Cron-Überwachung.
- Umsetzung (06.07.2026):
  - **Backend**: Performance-Tracing + Profiling (`traces_/profiles_sample_rate=0.15`),
    `AsyncioIntegration`; öffentlicher Helper `sentry_setup.aktuelle_umgebung()`.
  - **Cron-Monitoring**: Dekorator `_ueberwacht` in `scheduler.py` meldet jeden der 14
    Jobs als Sentry-Cron-Check-in (Slug + Schedule) → Sentry erkennt ausgefallene/
    verspätete Läufe und misst die Laufzeit; No-op, wenn Sentry aus ist.
  - **Frontend**: `@sentry/react` (`frontend/src/sentry.ts`), init über die öffentliche
    Konfiguration (`fehlerberichte_aktiv`/`sentry_dsn`/`sentry_environment`), Browser-
    Tracing; **Session Replay NUR in der Beta** (Text maskiert, Medien blockiert; in
    Produktion Sample-Rate 0 = aus). Zustimmung/DSN werden über
    `/oeffentliche-konfiguration` geliefert (DSN nur bei Zustimmung).
  - **Datenschutz** um Abschnitt „Fehler-Monitoring (Sentry)" inkl. Session-Replay-
    Hinweis (nur Beta, EU/DE-Verarbeitung) ergänzt.
  - Tests `test_sentry_config.py`; volle Suite 277 grün; `npm run build` grün.
- Notizen: Alarme/Dashboards werden in der Sentry-UI konfiguriert (nicht im Code).

---

## Etappe P – Sicherheits-Roadmap öffentliche Instanz (Priorität hoch)

> Übertragen aus `Vorschlag.md` (05.07.2026). Kontext: Instanz **voll öffentlich
> über HTTPS**, überschaubare Wehr (<100 Mitglieder), Datenschutz zentral. Fokus:
> Sicherheit/Berechtigungen. Reihenfolge 1→6 wie unten. Auth-/DB-weite Umbauten
> grundsätzlich über **Feature-Branch → PR nach `beta`**.

> **Dependency-Audit (08.07.2026):** `npm audit` (Frontend) = 0. `pip-audit` (Backend):
> die 5 **pip**-CVEs durch pip-Upgrade im backend/Dockerfile (26.1.2) geschlossen.
> Das frühere `ecdsa`-Restrisiko (**PYSEC-2026-1325**, transitiv über `python-jose`) ist
> **behoben statt akzeptiert**: JWT-Handling auf **PyJWT** migriert, `python-jose`+`ecdsa`
> aus den Dependencies entfernt → Advisory verschwunden. **PR #57 gemergt + auf beta
> deployt** (08.07.2026); `--ignore-vuln` in `security.yml` entfernt. Live verifiziert
> (Login-Pfad lädt, 401 bei Fehl-Login).
> Damit sind Frontend **und** Backend advisory-frei.
>
> **Re-Audit (11.07.2026):** `npm audit --audit-level=high` (Frontend) = **0** Schwachstellen;
> `pip-audit` (Backend) = **„No known vulnerabilities found"** (nur die App selbst
> `geratehaus-app 0.6.0b1` mangels PyPI-Eintrag übersprungen). Weiterhin advisory-frei.

### (0) Öffentliche Daten-API absichern – Phase 2

- Status: In Bearbeitung (Mitglieder-Session = PR #30 gemergt + deployt 05.07.2026; Rest offen)
- Priorität: Hoch
- Kategorie: Backend / Sicherheit / Auth
- Skills: planner, geraetehaus-patterns, tests, review
- Plan: Ja
- Beschreibung: **Phase 1 erledigt** (v0.4.1 / PR #26): Gate `require_zugriff`
  (Kiosk-Token `X-Kiosk-Token` / Moderator-JWT / Mitglieds-Cookie) als Router-Level-
  Dependency auf `einsaetze`, `dienstbuecher`, `dienststunden`, `buchungen`,
  `stammdaten`; Frontend sendet Kiosk-Token; `zusatzfelder`-Write geschlossen; Tests
  `test_api_zugriff.py`.
- Fortschritt (05.07.2026): **Signierte Mitglieder-Session umgesetzt.**
  `geraetehaus_name`-Cookie enthält jetzt einen mit `cookie_secret_key` **signierten**
  Wert (neues `app/core/mitglied_session.py`) statt des Klartext-Namens → nicht mehr
  fälschbar. Ausgestellt nur nach echter Identifikation (Barcode/Name+PIN);
  `get_current_person`, `require_zugriff` und `formulare.optionale_person` verifizieren
  die Signatur (fehlend/manipuliert → 401 bzw. anonym). Der **PIN-lose `POST /auth/name`
  ist entfernt** (Frontend `NameForm`/`namenEintragen` mit); Kiosk (X-Kiosk-Token) und
  PIN/Barcode-Login unverändert. Tests `test_mitglied_session.py` + Regression in
  `test_api_zugriff.py` (gefälschtes Klartext-Cookie → 401). **Betriebshinweis:**
  bereits „von zu Hause" angemeldete Mitglieder müssen sich einmalig neu per PIN
  anmelden (alte Klartext-Cookies werden nicht mehr akzeptiert).
- Fortschritt (05.07.2026): **Divera-Webhook gehärtet (direkt auf beta).** Der
  öffentliche `POST /divera/webhook` vergleicht den `accesskey` jetzt **zeitkonstant**
  (`hmac.compare_digest`, kein Timing-Seitenkanal auf den Divera-API-Key mehr), lehnt
  einen **nicht konfigurierten (leeren) Key** aktiv ab (kein Durchrutschen per leerem
  accesskey) und ist **ratenbegrenzt** (60/min pro IP) gegen Brute-Force. Tests
  `test_divera_webhook.py` (5).
- Fortschritt (08.07.2026): **Accesskey per Header ermöglicht (non-breaking).** Der
  Webhook akzeptiert den Accesskey jetzt **entweder** im Header `X-Divera-Accesskey`
  (bevorzugt – hält das Secret aus URL/Access-Logs heraus) **oder** wie bisher als
  `?accesskey=`-Query-Param (rückwärtskompatibel). Zeitkonstanter Vergleich unverändert.
  Tests `test_divera_webhook.py` (jetzt 8: Header ok / falscher Header / ohne Key → 403).
  Doku `divera.md` ergänzt. Bewusst **additiv** statt „aus der URL entfernen": ob die
  Verlagerung tatsächlich genutzt werden kann, hängt von der Webhook-Quelle (Divera) ab
  – die sichere Option existiert nun, ohne den Live-Webhook zu brechen.
- **Rest offen (optional, braucht Divera-Capability-Info):** echte **HMAC-Payload-
  Signatur** (Divera signiert den Request) – nur sinnvoll, falls Divera Request-Signing
  unterstützt.
- **Offen (Rest von Phase 2):** `GET /auth/personen`-Namensliste ist bereits
  rate-limitiert (30/60); Divera-`accesskey` endgültig aus der URL in Header/HMAC
  verlagern (Divera-Capability vorausgesetzt).
- Akzeptanzkriterien: ~~Mitglieds-Zugriff über signiertes Session-Token; kein
  PIN-loses Setzen des Namens-Cookies mehr~~ ✓; Swagger erneut ohne offene sensible
  Daten (Divera-Webhook-Secret offen).
- Notizen: Baut auf `require_zugriff` (`api/deps.py`) auf.

### (1) PIN-Brute-Force-Schutz (Mitglieder-/Kiosk-Login)

- Status: Erledigt (PR #27 gemergt + auf beta deployt, 05.07.2026)
- Priorität: Hoch
- Kategorie: Backend / Sicherheit
- Skills: planner, geraetehaus-patterns, tests, review
- Plan: Ja
- Beschreibung: Öffentliche 4–6-stellige PINs sind ratbar. Fehlversuchs-Zähler +
  temporäre Sperre **pro Person** und Rate-Limit **pro IP** am Name+PIN-Login.
  **Beschlossen:** 5 Fehlversuche → 15 Min Sperre pro Person, nach Ablauf automatisch
  frei; **Moderator kann manuell entsperren**; zusätzlich Rate-Limit pro IP. Sperre
  als `PersonEreignis` protokollieren; ggf. Verzögerung/Captcha nach N Versuchen.
- Akzeptanzkriterien: Nach 5 Fehlversuchen 15-Min-Sperre; IP-Rate-Limit greift;
  Moderator-Entsperren vorhanden; PersonEreignis geschrieben; Tests.
- Notizen: Rate-Limit-Baustein aus `test_security.py`/vorhandenem Limiter nutzen.

### (2) Berechtigungssystem fertigstellen

- Status: Erledigt (Arbeitsbereiche gegated = **PR #56 gemergt + auf beta deployt**,
  08.07.2026; Teil 1 = PR #28; Barcodes/Kiosk/Stammdaten = PR 06.07.2026). Damit sind
  alle mitgliederseitigen Feature-Module rechtebasiert; Admin-Rolle bleibt bewusst.
- Fortschritt (06.07.2026, non-breaking): **Barcodes- und Kiosk-Geräte-Router granular
  geschaltet.** Alle bislang `CurrentAdmin`-Endpunkte in `moderator_barcodes.py` nutzen
  jetzt `require_modul_zugriff` – Barcode-Endpunkte Key `barcodes`, Kiosk-Endpunkte Key
  `kiosk-geraete` (bewusst getrennt). Non-breaking: Admins passieren via Bypass,
  Gruppenführer sind erst mit erteiltem Recht zugelassen (vorher gar kein Zugriff → kein
  Aussperren). Frontend: `/moderator/barcodes` und `/moderator/kiosk-geraete` von
  `AdminRoute` auf `BerechtigungRoute` umgestellt. Tests `test_p2_gate_barcodes_kiosk.py`
  (5: Admin-Bypass, GF ohne Recht → 403, GF mit Recht → 200, getrennte Rechte). Suite 316
  grün, `npm run build` grün.
- Fortschritt (06.07.2026, non-breaking): **`moderator_stammdaten` granular geschaltet.**
  Alle 37 `CurrentAdmin`-Endpunkte über signaturbasierte Gates (`StammdatenZugriff`/
  `PersonalZugriff` = `Annotated[Moderator, Depends(require_modul_zugriff(...))]`):
  Config (Fahrzeuge/Funktionen/Gruppen/Zusatzfelder) → Key `stammdaten`, Personen-
  Mutationen → Key `personal`. Die drei `CurrentModerator`-Endpunkte (Personen-Liste,
  Ampel, PIN-Entsperren) bleiben bewusst **für alle Moderatoren offen** → non-breaking.
  Admins via Bypass. Tests `test_p2_gate_stammdaten.py` (5, inkl. Regressionstest
  „GF sieht Personen-Liste weiterhin"). Suite 321 grün.
- `benachrichtigungen` ist kein eigener Router → wird über das bereits gegatete
  `einstellungen`-Modul bedient (NotifierEinstellungen nutzt `/moderator/einstellungen`);
  nur der Frontend-Route-Guard bleibt anzugleichen.
- Fortschritt (06.07.2026): **`permissions.md` aktualisiert** – dokumentiert jetzt den
  Ist-Stand (granulares `require_modul_zugriff` inkl. Admin-Bypass + gegatete Router,
  signierte Mitglieder-Session, `require_zugriff`-Datentor, 2FA) statt des veralteten
  reinen Rollenmodells.
- Fortschritt (06.07.2026, non-breaking): **Nav-Surfacing umgesetzt.** Berechtigte
  Gruppenführer sehen die freigeschalteten Modul-Unterseiten jetzt in der Sidebar-Gruppe
  „Module" und können sie öffnen. Neue Map `modulRechte.ts`
  (`GRANTBARE_MODUL_UNTERSEITEN`: personal→personal, fahrzeuge→stammdaten,
  barcode→barcodes, kiosk→kiosk-geraete). `ModulUnterseite` prüft den Zugriff pro
  `:key` selbst (Admins alles; grantbare Unterseite → ihr Recht; übrige →
  „einstellungen"), Route dafür aus dem `einstellungen`-Guard herausgelöst. Sidebar:
  „Module"-Gruppe erscheint für GF mit Grant, rendert für Nicht-Admins nur die
  freigeschalteten Unterseiten (Admins unverändert via `aktiveModule`). Übersicht-Punkt
  bleibt an „einstellungen". Tests `modulRechte.test.ts`; `npm run test`/`build` grün.
- Noch offen: breaking Gruppenführer-Bereiche + Rechte-Seed; altes Rollenmodell ablösen
  (Phase 5).
- Fortschritt (05.07.2026): **Frontend-Guards** begonnen – neuer Endpunkt
  `GET /moderator/meta/meine-berechtigungen` + `berechtigungs_service.meine_keys`;
  AuthContext lädt eigene Modul-Rechte und bietet `hatModulZugriff(key)`; neuer
  `BerechtigungRoute`. Nav/Routen der bereits backend-gegateten Verwaltungs-Module
  (Einstellungen/Module/Update → Key `einstellungen`, Berechtigungen) prüfen jetzt
  `hat_zugriff` statt der Rolle (Admins via Bypass, non-breaking).
- Fortschritt (08.07.2026, „Phase 5" – Feature-Branch → PR): **Gruppenführer-
  Arbeitsbereiche granular gegated.** Die Moderator-Endpunkte der vier Feature-Module
  (`einsatztagebuch`: abschließen/wieder-öffnen/löschen; `dienstbuch`: Auswertungen/
  schließen/wieder-öffnen/relevant; `dienststunden` + `fahrzeugbuchung`: genehmigen/
  ablehnen; plus die bereichsspezifischen Listen/PDFs in `moderator_listen`) hängen
  jetzt an `require_modul_zugriff("<key>")` statt `CurrentModerator`. Kiosk-/
  Mitglieder-Endpunkte (require_zugriff) bleiben unangetastet. **Anti-Aussperr-
  Migration `0059`** seedet bestehenden Non-Admins genau diese vier Rechte (Status quo).
  Frontend: Nav-/Listen-Tabs + Routen (`/moderator/buchungen`, `einsaetze/:id`,
  `dienstbuecher/:id`, Listen-Tabs) über `hatModulZugriff`/`BerechtigungRoute` gegated.
  **Admin-Rolle bewusst behalten** (Bypass + admin-only Bereiche – volle Entfernung wäre
  Downgrade). Tests `test_p2_gate_arbeitsbereiche.py` (15). Backend 388 grün, Frontend
  Build + 26 Tests grün. `permissions.md` aktualisiert. **Vor Merge:** kurzer
  Browser-Smoke-Test mit einem Gruppenführer-Zugang.
- **Noch offen (bewusst nicht in dieser PR):** literale Entfernung der `rolle`-Spalte
  (nicht gewünscht – Admin-Instanz bleibt nötig); `benachrichtigungen` läuft über das
  bereits gegatete `einstellungen`-Modul.
- Priorität: Hoch
- Kategorie: Backend / Frontend / Sicherheit
- Skills: planner, geraetehaus-patterns, tests, review
- Plan: Ja
- Beschreibung: Granulares Modul ist gebaut, aber unvollständig: Frontend-Guards
  prüfen weiter `istAdmin` statt `hat_zugriff`; viele Router (`stammdaten`,
  `barcodes`, `kiosk-geraete`, Gruppenführer-Bereiche) sind noch nicht über
  `require_modul_zugriff` gesichert; altes Rollenmodell ablösen (inkl. Datenmigration
  Rollen→Rechte, ohne bestehende Zugänge auszusperren).
- Akzeptanzkriterien: Restliche Router mit `require_modul_zugriff`; Frontend-Guards
  auf `hat_zugriff`; Migration Rollen→Rechte; Tests.
- Notizen: **Führt die bestehende Aufgabe „Granulare Berechtigungsverwaltung"
  (Abschnitt unten) zu Ende** – dort zusammenführen, nicht doppelt umsetzen.

### (3) Geschützte Datei-Auslieferung

- Status: Erledigt (Profilbilder **und** Formular-Dateien; PR #55 gemergt + auf beta
  deployt, 08.07.2026)
- Fortschritt (05.07.2026, Phase 1): **Durchzählbares Profilbild-Leck geschlossen.**
  Profilbilder lagen als `/uploads/personen/person-<id>.<ext>` unter einem öffentlichen
  Static-Mount → per ID abzählbar. Jetzt: **Zufallstoken-Dateinamen** (nicht erratbar),
  **Magic-Bytes-Prüfung + EXIF-Entfernung** über Pillow-Re-Encode, altes Bild wird beim
  Ersetzen gelöscht; **einmalige idempotente Backfill-Umbenennung** bestehender
  `person-<id>`-Dateien beim App-Start. Gilt auch für den „Barcode-vergessen"-Upload
  (nutzt dieselbe Funktion). Formular-Uploads nutzen bereits Zufallsnamen. Tests in
  `test_person_bild_schutz.py`.
- Fortschritt (06.07.2026, Phase 2 – Formular-Upload-Härtung, direkt auf beta):
  `formular_service.datei_speichern` prüfte bisher nur den (spoofbaren) Content-Type
  und speicherte die Bytes **unverändert**. Jetzt neuer `_datei_bereinigen`: Bilder
  (PNG/JPEG/WebP) werden über Pillow **neu kodiert → EXIF/Metadaten entfernt** und per
  **Magic-Bytes** validiert; PDFs per `%PDF-`-Magic geprüft; sonst 415. Tests
  `test_formular_datei.py` (4, inkl. EXIF-Strip + gefälschtes Bild). Suite 311 grün.
- Fortschritt (08.07.2026, Phase 2 – Profilbild-Zugriffsschutz, Feature-Branch → PR):
  **`/uploads/personen/…` ist nicht mehr dauerhaft/anonym abrufbar.** Neuer
  `app/core/datei_token.py`: signierter, zeitlich begrenzter Freischalt-Token
  (`URLSafeTimedSerializer`, `cookie_secret_key`, bindet den **exakten** Pfad, Ablauf
  über `datei_token_max_age_stunden`, Default 7 Tage – technischer .env-Wert). Der
  `/uploads`-Mount ist jetzt `GeschuetzteUploads` (StaticFiles-Subklasse): geschützte
  Pfade **erfordern gültigen `?token=`** (sonst 403), das **Logo bleibt öffentlich**
  (E-Mail/PDF-Referenzen). Den Token stellt der Server **nur in berechtigten
  Antwortpfaden** aus – zentral in `personen_zu_out` plus alle Direkt-Emitter
  (auth-Barcode/Name/Profil, sechs Reservierungs-/Login-Vorschauen). `<img>` sendet
  keine Auth-Header → Berechtigung liegt im signierten Query-Token; Frontend
  **unverändert**. Kein DB-/Datei-Umzug (bild_url bleibt stabil; `PersonCreate/Update`
  nehmen bild_url nicht an → kein Round-Trip-Risiko). Tests `test_datei_token.py` (9,
  inkl. E2E: `person_zu_out`-URL tatsächlich abrufbar); volle Suite **369 grün**.
  **Vor Merge:** Browser-Smoke-Test (Kiosk-Personenliste, Barcode-vergessen-Vorschau,
  Moderator-Personal, Mitglied-Login-Vorschau zeigen Bilder).
- Fortschritt (08.07.2026, Phase 2 – Formular-Datei-Zugriffsschutz, gleiche PR #55):
  **`/uploads/formulare/…` analog abgesichert** – zu `GESCHUETZTE_PRAEFIXE` ergänzt, ab
  jetzt nur mit Token abrufbar. Token wird an allen Stellen angehängt, an denen ein
  Moderator eine hochgeladene Formular-Datei **öffnen** kann: neue
  `formular_service.einreichungen_out` (tokenisiert `datei`-Antworten im
  `EinreichungOut`, Router `GET …/einreichungen` nutzt sie jetzt; gespeicherter
  `antworten`-Snapshot bleibt unangetastet), `_wert_text` (CSV-Export + Empfänger-Mail)
  und die `datei`-Freitexte der Zusammenfassung. In der Moderator-UI wird eine
  Datei-Antwort ohnehin nur als **Text** (nicht auto-geladenes `<img>`) angezeigt →
  keine Frontend-Änderung nötig. Tests `test_datei_token.py` (jetzt 14, inkl.
  Formular-Guard 403/200 + `_wert_text`-Tokenisierung); volle Suite **373 grün**.
  Etappe P3 damit vollständig (Personen- + Formular-Dateien).
- Priorität: Mittel
- Kategorie: Backend / Sicherheit / Datenschutz
- Skills: planner, geraetehaus-patterns, tests, review
- Plan: Ja
- Beschreibung: Personenbezogene Uploads (Personenbilder, Formular-Dateien) nicht
  mehr statisch/dauerhaft öffentlich unter `/uploads`, sondern über **kurzlebige,
  signierte Token-Links** je Datei ausliefern (nur für Berechtigte). Beim Upload
  zusätzlich **Magic-Bytes-Prüfung** (nicht nur `content_type`) und **EXIF entfernen**.
- Akzeptanzkriterien: Kein dauerhaft öffentlicher Uploads-Pfad; signierte Token-
  Links; Magic-Bytes-Check + EXIF-Strip beim Upload; Tests.
- Notizen: Offene Detailfrage: Personenbilder am Kiosk müssen schnell laden –
  Token-Serve (kurzlebiger Link) vs. session-geschützt abwägen.

### (4) Admin-/Moderator-Login härten + 2FA

- Status: Erledigt (E-Mail-OTP-2FA = PR #38 gemergt + auf beta deployt, 06.07.2026;
  Login-Lockout = Phase 1 bereits live)
- Fortschritt (06.07.2026, Phase 2 – E-Mail-OTP-2FA, opt-in): Migration 0056
  (`moderatoren.zwei_faktor_aktiv`/`otp_*` + Tabellen `moderator_recovery_codes`,
  `moderator_trusted_devices`). Service `zwei_faktor_service` (OTP erzeugen/senden/
  prüfen, Recovery-Codes bcrypt, Trusted-Device SHA-256 30 Tage, aktivieren/
  deaktivieren=Admin-Reset). Login-Flow: `POST /auth/moderator/login` liefert bei
  aktivem 2FA (und unbekanntem Gerät) `zwei_faktor_erforderlich`+`challenge`
  (signiert, 10 Min) statt Token und mailt den 6-stelligen Code; `POST /auth/moderator/2fa`
  prüft OTP **oder** Recovery-Code, stellt Token aus und setzt optional ein
  Trusted-Device-Cookie. Selbstverwaltung `moderator_konto` (`/moderator/konto/2fa*`,
  für ALLE Moderatoren, nicht einstellungs-gegated); Admin-Reset
  `POST /moderator/einstellungen/moderatoren/{id}/2fa-zuruecksetzen`. Audit-Hooks.
  Frontend: 2-Schritt-Login (`ModeratorLogin.tsx`, „Gerät 30 Tage vertrauen"),
  Selbst-2FA-Karte + „2FA zurücksetzen"-Button (`Einstellungen.tsx`). Tests
  `test_moderator_2fa.py` (9); Suite 300 grün, `npm run build` grün.
  **Offen (Phase 3):** Passkeys/WebAuthn als optionale Alternative; 2FA-Aktivierung
  ggf. mit Bestätigungs-OTP absichern; Selbst-2FA-UI auch für reine Gruppenführer
  (Backend erlaubt es bereits, UI liegt derzeit unter Einstellungen).
- Status-alt: In Bearbeitung (Login-Lockout als PR 05.07.2026 – `feature/moderator-login-lockout-p4`)
- Priorität: Hoch
- Kategorie: Backend / Frontend / Sicherheit / Auth
- Skills: planner, geraetehaus-patterns, tests, review
- Plan: Ja
- Fortschritt (05.07.2026, Phase 1): **Login-Lockout umgesetzt** (analog PIN-Brute-
  Force). Moderator-Felder `login_fehlversuche` + `login_gesperrt_bis` (Migration 0054);
  `moderator_service.login_pruefen()` sperrt nach `moderator_login_max_fehlversuche`
  (Default 5) für `moderator_login_sperre_minuten` (Default 15, auto-Freigabe),
  Reset bei Erfolg; `/auth/moderator/login` liefert 429 bei Sperre. Zusätzlich zum
  bestehenden IP-Rate-Limit (10/60). Tests `test_moderator_login_lockout.py`.
  **Offen (Phase 2 = die eigentliche 2FA):** E-Mail-OTP + Passkey/WebAuthn,
  Trusted-Device (30 Tage), Recovery-Codes + „zweiter Admin entsperrt/resettet"
  (Escape-Hatch bei ausgesperrtem Zugang).
- Beschreibung: Login-**Rate-Limit + Lockout** bei Fehlversuchen. **2FA für Admin +
  Moderator**: **E-Mail-Code (OTP)** als Standard (viele nutzen keine Authenticator-
  App), **Passkeys/WebAuthn** als optionale starke, phishing-resistente Alternative.
  Abfrage **nur bei neuem/unbekanntem Gerät** (Trusted-Device 30 Tage merken).
  **Recovery:** Recovery-Codes bei der Einrichtung **und** ein zweiter Admin kann 2FA
  zurücksetzen (doppeltes Netz).
- Akzeptanzkriterien: Login-Lockout/Rate-Limit; E-Mail-OTP-Flow (setzt SMTP voraus);
  Passkey opt-in; Trusted-Device 30 Tage; Recovery-Codes + Admin-Reset; Tests.
- Notizen: ⚠ Voraussetzung mind. **2 Admin-Zugänge** (sonst Aussperr-Risiko) – im
  Setup/Doku darauf hinweisen. Offene Detailfrage: OTP nur bei neuem Gerät oder immer;
  2FA optional auch für Mitglieder-Login?

### (5) Audit-Log (Löschungen/Freigaben/Rechteänderungen)

- Status: Erledigt (Phase 1 = PR #31; Phase 2 direkt auf beta, 05.07.2026 – alle
  Akzeptanzkriterien erfüllt)
- Fortschritt (05.07.2026, Phase 1): **Audit-Infrastruktur + erste Hooks + Admin-API.**
  Neue Tabelle `audit_logs` (Migration 0053) + `AuditLog`-Model + `audit_service`
  (`protokolliere` / `liste` mit Filter, neueste zuerst). Protokolliert werden Akteur
  (Moderator-Username), Aktion, Objekt-Typ/-ID und Details. Router-Hooks:
  Person-Löschung, Einsatz-Löschung, Buchung genehmigt/abgelehnt, Berechtigung
  geändert. Admin-Leseendpunkt `GET /moderator/audit` (nur Admin, `?aktion=`-Filter).
  Automatisch im Voll-Backup enthalten. Tests `test_audit_log.py`.
- Fortschritt (05.07.2026, Phase 2 – Hooks für privilegierte Aktionen, direkt auf beta):
  Bisher ungeloggte **Konten-/Modul-Änderungen** ergänzt: `moderator_angelegt`,
  `moderator_passwort_geaendert`, `moderator_geloescht` (in `moderator_einstellungen.py`,
  je mit `CurrentModerator`-Akteur) und `modul_flag_geaendert` (An/Aus + Kiosk/
  Außenzugriff in `moderator_feature_module.py`). Genau die „Wer hat Zugänge/Zugriff
  geändert"-Ereignisse, die bisher fehlten. Tests in `test_audit_log.py` (4 neu, Suite
  263 grün).
- Fortschritt (05.07.2026, Phase 2 – Retention-Job, direkt auf beta): **1-Jahr-
  Aufbewahrung umgesetzt.** `audit_service.aufbewahrung_bereinigen` löscht Einträge
  älter als `audit_aufbewahrung_tage` (Config-Default 365, `0` = unbegrenzt); täglicher
  Scheduler-Job `audit_retention` (03:50). Tests in `test_audit_log.py` (2 neu, Suite
  265 grün).
- Fortschritt (05.07.2026, Phase 2 – Admin-Frontend-Ansicht, direkt auf beta):
  **Audit-Log ist jetzt in der Oberfläche einsehbar.** Neue Admin-Seite
  `pages/moderator/AuditLog.tsx` (Route `/moderator/audit` unter `AdminRoute`,
  Nav-Punkt „Audit-Log" in der Gruppe Verwaltung, `nurAdmin`) mit Tabelle
  (Zeitpunkt/Akteur/Aktion/Objekt/Details), Filter nach Aktion und „Neu laden".
  API-Modul `api/audit.ts` gegen den bestehenden `GET /moderator/audit`. Maschinelle
  Aktions-Schlüssel werden über eine Label-Map menschenlesbar dargestellt (robust
  gegen neue Hooks). `npm run build` grün.
- Fortschritt (05.07.2026, Phase 2 – CSV/JSON-Export, direkt auf beta): Neuer Admin-
  Endpunkt `GET /moderator/audit/export?format=csv|json&aktion=` (`audit_service.csv_export`
  /`json_export`, vollständiger Export, optional gefiltert, CSV mit UTF-8-BOM für Excel)
  + „Export CSV"/„Export JSON"-Buttons in `AuditLog.tsx` (Download via authentifiziertem
  Blob, respektiert den gesetzten Aktions-Filter). Tests `test_audit_log.py` (2 neu);
  Suite 267 grün; `npm run build` grün.
- **Alle Akzeptanzkriterien erfüllt.** Optionaler Ausbau (nicht Teil der Kriterien,
  Backlog-Idee): zusätzliche Hooks für Formular-Löschung und Divera-Vorschlag-Freigabe.
- Priorität: Mittel
- Kategorie: Backend / Frontend / Sicherheit
- Skills: planner, geraetehaus-patterns, tests, review
- Plan: Ja
- Beschreibung: Modulübergreifendes Protokoll: wer hat wann was **gelöscht**
  (Einsätze, Personen, Formular-Einreichungen …), **freigegeben** (Buchungen,
  Divera-Vorschläge) oder an **Rechten/Rollen** geändert. **Nur für Admin** einsehbar/
  filterbar. Ergänzt die rein personenbezogene Timeline. **Beschlossen:** 1 Jahr in
  der DB, danach automatisch löschen; **Admin-Export (CSV/JSON)**; bewusst **keine
  MinIO-Archivierung** (Over-Engineering; Frist = Datenminimierung; liegt im Backup).
- Akzeptanzkriterien: Audit-Einträge für Löschungen/Freigaben/Rechteänderungen;
  Admin-Ansicht mit Filter; 1-Jahr-Retention-Job; CSV/JSON-Export; Tests.
- Notizen: Neue Tabelle + Migration + Service-Hooks in den betroffenen Services.

### (6) Security-Härtung Querschnitt

- Status: Erledigt (08.07.2026 – alle Akzeptanzkriterien erfüllt: Security-Header,
  Dependency-/Secret-Scan in CI, Rate-Limit auf öffentlichen POSTs, CSP **enforcing**
  (deployt) + selbst-gehostete Fonts; zuletzt `ecdsa`-Advisory via PyJWT-Migration
  eliminiert, PR #57 gemergt)
- Priorität: Mittel
- Kategorie: Backend / DevOps / Sicherheit
- Skills: geraetehaus-patterns, review
- Plan: Nein
- Beschreibung: CSP/Security-Header-Review; Abhängigkeits-/Secret-Scanning in CI;
  konsequentes Rate-Limit auf **allen** öffentlichen POST-Endpunkten.
- Fortschritt (05.07.2026): **Rate-Limit auf öffentlichen POSTs erledigt.** Bisher
  ungeschützte öffentliche POSTs abgesichert (Reservierungs-/`{token}/einloesen`-
  Endpunkte für Einsatz/Dienstbuch/Dienststunden/Fahrzeugbuchung, Personenbild-Upload,
  Mitglied-Login-Reservierung anlegen, Push subscribe/unsubscribe). Zusätzlich
  `rate_limit` so gehärtet, dass es pro **Routen-Muster** statt pro konkretem Pfad
  begrenzt – sonst wäre jeder geratene Token ein eigener Bucket (Token-Brute-Force).
  Tests in `test_security.py`.
- Fortschritt (05.07.2026): **Dependency-/Secret-Scanning erledigt.**
  `.github/workflows/security.yml` – `pip-audit` (Python) und `npm audit` (Frontend,
  je nicht-blockierend/informativ) plus `gitleaks` Secret-Scanning; Trigger PR/Push
  auf beta/main + wöchentlich. Setzt auf die neue CI (Etappe Q) auf.
- Fortschritt (05.07.2026): **Security-Header-Review erledigt (ohne CSP).**
  `SecurityHeadersMiddleware` um `Cross-Origin-Opener-Policy: same-origin`,
  `X-Permitted-Cross-Domain-Policies: none` und eine erweiterte `Permissions-Policy`
  (usb/serial/bluetooth/hid/Sensoren/browsing-topics aus; **camera bewusst erlaubt**,
  da Barcode-Scanner; geolocation aus, da im Frontend ungenutzt) ergänzt. HSTS bewusst
  weiterhin nicht (TLS terminiert im Reverse-Proxy). Test in `test_security.py`.
- Fortschritt (06.07.2026): **CSP als Report-Only ausgerollt (direkt auf beta).**
  Da die SPA von **nginx** (nicht FastAPI) ausgeliefert wird, sitzt die CSP in
  `frontend/nginx.conf` auf den HTML-Dokument-Antworten (`= /index.html` + SPA-Fallback
  `/`) als `Content-Security-Policy-Report-Only` – blockiert nichts, meldet aber
  Verstöße in der Browser-Konsole. Policy: `default-src 'self'`; `script-src 'self'`
  (keine Inline-Skripte im Vite-Build); `style-src 'self' 'unsafe-inline'
  https://fonts.googleapis.com` (React-Inline-Styles + Google Fonts); `font-src 'self'
  data: https://fonts.gstatic.com`; `img-src 'self' data: blob:` (QR-/Barcodes,
  Uploads); `connect-/manifest-/worker-src 'self'`; `frame-ancestors 'none'`,
  `object-src 'none'`, `base-uri`/`form-action 'self'`. `nginx -t` grün.
- Akzeptanzkriterien: ~~Security-Header geprüft/ergänzt~~ ✓; ~~Dependency-/Secret-Scan
  in CI~~ ✓; ~~Rate-Limit auf öffentlichen POSTs~~ ✓; CSP als Report-Only aktiv (Enforcing
  folgt nach Auswertung).
- Fortschritt (06.07.2026): **CSP-Report-Collector ergänzt (direkt auf beta).** Die
  Report-Only-CSP hat jetzt `report-uri /api/v1/csp-report`; neuer öffentlicher,
  ratenbegrenzter Endpunkt `csp_report.py` protokolliert **distinkte** Verstöße
  (`csp_verstoss` auf INFO → Logs/Sentry-Breadcrumb, kein Issue-Spam; In-Memory-Dedup).
  Damit lässt sich vor dem Scharfschalten sehen, was blockiert würde (z. B. externes
  Logo). Tests `test_csp_report.py`. `nginx -t` grün.
- Fortschritt (08.07.2026): **CSP enforcing-ready gemacht** (weiter Report-Only,
  kein Verhaltensrisiko). Analyse der App-Ressourcen ergab **eine sichere Lücke**: bei
  aktiven Fehlerberichten/Session-Replay sendet das Frontend an **Sentry-Ingest**, was
  `connect-src 'self'` beim Scharfschalten geblockt hätte. `connect-src` deshalb um
  `https://*.ingest.sentry.io`, `*.ingest.de.sentry.io`, `*.ingest.us.sentry.io`
  ergänzt (self-gehostetes Sentry → eigene Domain nachtragen). Kommentar in
  `nginx.conf` dokumentiert jetzt den Scharfschalt-Weg. Übrige Direktiven decken die
  bekannten Ressourcen ab (self, Google Fonts, `img-src` self/data/blob, Inline-Styles,
  Service-Worker). **Letzter Schritt = Nutzer-Entscheidung** (empfohlene Variante „A"):
  gesammelte Reports in Prod sichten + kurzer Browser-Smoke-Test, dann die beiden
  `-Report-Only`-Header auf `Content-Security-Policy` umstellen.
- Fortschritt (08.07.2026): **Google Fonts selbst gehostet** (direkt auf beta,
  Commit `3e34d55`). Alata + Noto Sans (400/600/700, latin + latin-ext) liegen jetzt
  lokal unter `frontend/public/fonts/` und werden über `/fonts/fonts.css` geladen;
  `index.html` lädt nicht mehr von `fonts.googleapis.com`/`fonts.gstatic.com`
  (preconnect entfernt). **DSGVO:** keine Besucher-IP mehr an Google (schließt eine
  latente, nie in der Datenschutzerklärung ausgewiesene Lücke – jetzt nichts Externes
  offenzulegen). **CSP** entsprechend verschlankt: `style-src 'self' 'unsafe-inline'`,
  `font-src 'self'` (externe Font-Ausnahmen entfallen) – ein weiterer Schritt Richtung
  Scharfschalten. Live verifiziert (CSP-Header, `/fonts/fonts.css` + woff2 → 200,
  kein `googleapis` mehr in index.html); `npm run build` grün.
- Fortschritt (08.07.2026): **CSP scharfgeschaltet (enforcing) – direkt auf beta,
  auf Nutzer-Freigabe.** Beide `Content-Security-Policy-Report-Only`-Header in
  `nginx.conf` auf `Content-Security-Policy` umgestellt. Vorab-Analyse bestätigte, dass
  die App **keine externen Runtime-Ressourcen** lädt: Schriften selbst gehostet, Logo =
  same-origin-Upload (kein Freitext-URL-Feld), iCal/WebDAV läuft serverseitig, kein
  CDN/iframe/Fremdskript; Sentry-Ingest ist in `connect-src`. `report-uri` bleibt aktiv
  (Verstöße weiter geloggt). `npm run build` grün, Live-Header verifiziert. Zurücknehmen
  = Header wieder auf `-Report-Only` (im Kommentar dokumentiert). **Nutzer macht** noch
  einen Browser-Smoke-Test am Kiosk (Scan/Login/PDF/Bilder).
- Akzeptanzkriterien: ~~Security-Header~~ ✓; ~~Dependency-/Secret-Scan~~ ✓;
  ~~Rate-Limit öffentliche POSTs~~ ✓; ~~CSP enforcing~~ ✓ (08.07.2026).
- Notizen: ~~Erwägenswert: Google Fonts self-hosten~~ ✓ (08.07.2026, s. o.).

---

## Etappe Q – UX/Mobile/Kiosk & Stabilität (aus Vorschlag)

> Übertragen aus `Vorschlag.md` (05.07.2026). Parallel zur Sicherheits-Roadmap.

### Kiosk-Autolock / Inaktivitäts-Reset

- Status: Erledigt (PR #45 in `beta` gemergt + deployt, 06.07.2026; Status 11.07.2026
  nachgezogen – Feature live: `kiosk_autolock_sekunden` in config_defaults + KioskGeraete)
- Umsetzung (06.07.2026): Config-Key `kiosk_autolock_sekunden` (Default 0 = aus) in
  `config_defaults` + über `/oeffentliche-konfiguration` ans Frontend geliefert. Neuer
  Hook `useKioskAutolock` (in `Layout` gemountet): aktiv nur auf dem Kiosk
  (`localStorage.kiosk_token`) und bei Schwelle > 0; springt nach X Sekunden ohne
  Interaktion zurück zur Kiosk-Startseite `/kiosk/<token>`, jede Aktivität
  (Klick/Taste/Touch/Scroll) und jeder Seitenwechsel setzt den Timer zurück. UI: Feld
  „Auto-Sperre" in der Kiosk-Geräte-Verwaltung. Tests `useKioskAutolock.test.tsx` (4) +
  `test_kiosk_autolock_config.py` (2); Suite 323 grün, `npm run test`/`build` grün.
- Priorität: Mittel
- Kategorie: Frontend / Kiosk / UX
- Skills: geraetehaus-patterns, review
- Plan: Nein
- Beschreibung: Nach X Sekunden Inaktivität zurück zur Kiosk-Startseite (verhindert
  „hängende" Sitzungen mit gewählter Person). Schwelle konfigurierbar (config_defaults).
- Akzeptanzkriterien: Konfigurierbares Timeout; Reset auf Startseite; kein Reset bei
  Aktivität.
- Notizen: Nutzen ⭐⭐.

### Barrierefreiheit (a11y)

- Status: Backlog (Fortschritt 07.07.2026 – einheitliche Fokusringe)
- Priorität: Niedrig
- Kategorie: Frontend / UX
- Skills: geraetehaus-patterns, review
- Plan: Nein
- Beschreibung: Fokusringe, Tastaturbedienung, `aria-*`/`role`, Screenreader – v. a.
  Sterne-/Skala-Auswahl und Kiosk-Kacheln (heute oft `<div>`/`<button>` mit Inline-
  Styles, uneinheitliche Fokus-Zustände).
- Akzeptanzkriterien: Fokusringe + Tastaturbedienung + Labels auf kritischen
  Interaktionen; a11y-Durchlauf dokumentiert.
- Notizen: Nutzen ⭐⭐.
- Fortschritt (07.07.2026): **Einheitliche Tastatur-Fokusringe** via globalem
  `:focus-visible` in `index.css` (3px `--farbe-primaer`, Offset; nur bei
  Tastaturnavigation, folgt dem border-radius; extra Offset für Kacheln/Karten-
  Buttons). Vorher gab es **gar keine** Fokus-Styles → uneinheitliche/teils
  unsichtbare Browser-Defaults. `npm run build` grün.
- Fortschritt (07.07.2026): **Sterne-/Skala-Auswahl (Formular) barrierefrei** –
  Buttons waren schon per Tab/Enter bedienbar; ergänzt: `role="group"` mit
  Feld-Label, beschreibende `aria-label` je Button („3 von 5 Sternen" statt „3")
  und `aria-pressed` für den ausgewählten Wert (Screenreader kennt Auswahlzustand).
  Test in `FormularAusfuellen.test.tsx` (Gruppe/Label/aria-pressed). `npm run build`
  + `npm run test` (26) grün.
- Prüfung (07.07.2026): Kiosk- und Mitglieder-Kacheln sind **bereits `<button>`**
  (tastaturbedienbar, Fokusring greift) – kein `<div>`-Umbau nötig. Damit sind die
  konkret benannten Interaktionen (Fokusringe, Sterne-/Skala-Auswahl, Kacheln)
  versorgt.
- Statik-Audit (07.07.2026): Alle `<img>` haben `alt` (Logos beschriftet, Personen-/
  QR-Bilder mit Namen), es gibt **keine** Icon-only-Buttons ohne Namen (durchgehend
  Text-Buttons), `<main>`-Landmarks im öffentlichen und Moderator-Layout vorhanden.
  Keine offensichtlichen a11y-Lücken mehr statisch auffindbar.
- **Noch offen (nicht autonom abschließbar):** vollständiger Screenreader-Durchlauf –
  braucht ein **manuelles Audit** (headless nicht sinnvoll verifizierbar).

### Einheitliche Fehler-/Ladezustände

- Status: Erledigt (09.07.2026 – Toast-Muster als letztes offenes Stück umgesetzt)
- Priorität: Niedrig
- Kategorie: Frontend / UX
- Skills: geraetehaus-patterns, review
- Plan: Nein
- Beschreibung: Gemeinsames Toast/Alert-Muster + „Erneut versuchen" statt roher
  `String(err.detail)`-Texte. `Ladeanzeige` existiert bereits.
- Akzeptanzkriterien: Zentrales Fehler-/Toast-Muster; Retry; konsistent eingesetzt.
- Notizen: Nutzen ⭐⭐.
- Fortschritt (07.07.2026): Neue Komponente `SeitenFehler` (themed, dark-mode-tauglich
  via CSS-Variablen statt hartem `color:red`, `role="alert"`, optionaler
  „Erneut versuchen"-Button). Ersetzt die 6 verstreuten
  `<div style={{color:"red"}}>Fehler: …</div>`-Blöcke (Einsatztagebuch,
  EinsatzDetail, Dienstbuch, Dienststunden, Fahrzeugbuchung, FahrzeugView) – vier
  davon mit Retry auf ihre `laden()`-Funktion. Test `SeitenFehler.test.tsx` (3).
  `npm run build` + `npm run test` (21) grün.
- Fortschritt (08.07.2026, direkt auf beta): **Inline-Formularfehler vereinheitlicht.**
  Neue Komponente `Fehlertext` (`<p className="fehlertext" role="alert">` – Screenreader
  sagen Fehler jetzt an; Styling bleibt aus der geteilten `.fehlertext`-Klasse). Die 87
  einzeiligen `<p className="fehlertext">…</p>` in 50 Dateien darauf umgestellt
  (verhaltensgleich, nur `role="alert"` ergänzt). `npm run build` + `npm run test` (26) grün.
- Fortschritt (08.07.2026, direkt auf beta): **Restliche `fehlertext`-Stellen migriert.**
  Die 12 mehrzeiligen/gestylten `<p className="fehlertext">` (inkl. `style`-Props) auf
  `<Fehlertext>` umgestellt – Inline-Fehler nutzen jetzt **durchgängig** die
  `role="alert"`-Komponente. Bewusst **nicht** konvertiert: das `<li className="fehlertext">`
  in `Personal.tsx` (Listenelement) und das block-`<div className="fehlertext">` in
  `Buchungsmanagement.tsx` (kein Absatz). `npm run build` + `npm run test` (26) grün.
- Umsetzung (09.07.2026, direkt auf beta): **Toast-Muster** (Design vom Agenten
  entschieden). Leichtes, **abhängigkeitsfreies** Toast-System `context/ToastContext.tsx`
  (`ToastProvider` + `useToast()` → `toast.erfolg/fehler/info`); unten mittig, auto-dismiss
  (Fehler 6 s, sonst 4 s), manuell schließbar, **a11y** (`role="alert"` bei Fehlern, sonst
  `role="status"`, `aria-label` am Schließen-Button), dark-mode-tauglich via CSS-Variablen
  (`.toast*` in `index.css`). Provider in `main.tsx` gemountet. **Alle 8 nativen `alert()`**
  (Personal 6, Einstellungen 2) durch Toasts ersetzt. Klare Abgrenzung dokumentiert:
  `SeitenFehler` = seitenfüllend **+ Retry**, `Fehlertext` = inline, `Toast` = flüchtig.
  Test `ToastContext.test.tsx` (3). `npm run build` + Vitest (29) grün. **Damit erledigt.**

### Inline-Styles → CSS-Klassen

- Status: Backlog
- Priorität: Niedrig
- Kategorie: Frontend / Wartung
- Skills: geraetehaus-patterns, review
- Plan: Nein
- Beschreibung: Sehr viele `style={{…}}` (u. a. Formular-/Ampel-UIs) schrittweise in
  `index.css`-Klassen überführen: bessere Dark-Mode-Konsistenz, kleineres Bundle,
  wartbarer.
- Akzeptanzkriterien: Schrittweise Migration; keine visuelle Regression.
- Notizen: Nutzen ⭐.
- Fortschritt (07.07.2026): **Modal-Overlay** vereinheitlicht – die mehrfach kopierten
  Inline-Style-Objekte (`position:fixed; inset:0; rgba(0,0,0,0.5); flex center;
  z-index:1000`) in CSS-Klassen `.modal-overlay` (+ `.modal-overlay--scroll` für hohe/
  scrollbare Dialoge) überführt und in Personal (4 Dialoge) + DiveraVorschlagModal
  angewendet. Abweichende Overlays (SitzplatzEditor 0.45, BarcodeScanner-Scanner 0.85)
  **bewusst unangetastet**, um keine Optik zu ändern. Styles 1:1 übernommen → keine
  visuelle Änderung erwartet (Optik bitte gegenprüfen). `npm run build` + `npm run test`
  (26) grün.
- Fortschritt (07.07.2026): **Hinweistext-Utility** – das vielfach kopierte
  `style={{ color: var(--farbe-text-mute), fontSize: 0.85rem }}` (beide Reihenfolgen)
  durch die Klasse `.hinweistext` ersetzt: **38 Stellen** in ~20 Dateien. Nur
  exakte Zwei-Property-Objekte ersetzt (kein Klassen-Konflikt, 1:1 gleiche Optik).
  `npm run build` + `npm run test` (26) grün.
- Fortschritt (07.07.2026): **`.hinweis-klein`** (0.8rem, gedämpft) analog für die
  8 exakten `style={{ fontSize: 0.8rem, color: var(--farbe-text-mute) }}`-Stellen.
  1:1 gleiche Optik; Build/Test grün.
- Fortschritt (07.07.2026): **`<Gespeichert />`-Komponente** für den 6-fach identisch
  kopierten „✓ gespeichert"-Erfolgs-Span (Modul-Einstellungsseiten) – DRY-Extraktion
  in eine kleine Komponente. Build/Test grün.
- Fortschritt (07.07.2026): **`.flex-zwischen`** (Space-between-Zeile, vertikal
  zentriert) für den 5-fach exakten `style={{ display:flex; justify-content:
  space-between; align-items:center }}` – sauber, da ohne gap-Variation. Build/Test grün.
- Fortschritt (08.07.2026, direkt auf beta): **`.text-mute`-Utility** – das mit Abstand
  häufigste Inline-Objekt `style={{ color: "var(--farbe-text-mute)" }}` (**77 Stellen**
  in 39 Dateien) durch die Klasse `.text-mute` ersetzt. Nur die Ein-Property-Farbe (keine
  Größe); alle 77 lagen auf einfachen HTML-Tags **ohne** vorhandenes `className` →
  konfliktfrei und **1:1 gleiche Optik** (per Konstruktion; Build fängt jeden
  Doppel-`className`-Fall ab). `npm run build` + `npm run test` (26) grün.
- Fortschritt (09.07.2026, direkt auf beta): **`.text-center` + `.nowrap`-Utilities** –
  die zwei verbliebenen fixwertigen Ein-Property-Objekte extrahiert: `textAlign:"center"`
  (7 Stellen; 4 mit vorhandenem `className="karte"` → zu `className="karte text-center"`
  gemergt, 3 auf `className="text-center"`) und `whiteSpace:"nowrap"` (4 Tabellenzellen/
  Button ohne `className` → `className="nowrap"`). 1:1 gleiche Optik. `npm run build` +
  Vitest (26) grün.
- **Weiter offen (schrittweise, geringer Nutzen):** die verbliebenen Inline-Styles
  sind überwiegend **gap-variantenreiche Flex-Zeilen** (`display:flex; align-items:
  center; gap:4/6/8`) – eine Extraktion bräuchte gap-spezifische Klassen
  (Utility-Wildwuchs) und würde bei Vereinheitlichung die Optik minimal ändern; daher
  bewusst inline belassen. Die klar wiederkehrenden, sauber extrahierbaren Muster
  (Modal-Overlay, Hinweistexte, Textfarbe, „✓ gespeichert", Space-between-Zeile,
  Text-zentriert, nowrap) sind damit **erschöpft**.

### Begriff „Moderator" → „Gruppenführer" (durchgängig umbenennen)

- Status: Erledigt (PR #60 in `beta` gemergt + **deployt** 09.07.2026; Migrationen
  0061–0064 auf der Live-DB angewandt, `moderatoren`-Tabelle gedroppt, `gruppenfuehrer_rolle`
  live, 3 Admins intakt, App läuft auf `/gruppenfuehrer/*`). Nutzer wählte „wirklich alles
  inkl. Routen+DB". **0** „moderator" mehr in Backend/Frontend/Docs (außer 3 historische
  Audit-Aktionswerte).
- Fortschritt (09.07.2026, Schicht 5 – **Legacy-DB-Cleanup + Backend-Prosa + Rest**, grün):
  Nutzer gab den destruktiven Cleanup frei. Migration **0063** droppt Legacy-`moderatoren`-
  Tabelle + alle `moderator_id`-Spalten und benennt die aktiven 2FA-Tabellen
  `moderator_recovery_codes`/`_trusted_devices` → `gruppenfuehrer_*` (Models
  `GruppenfuehrerRecoveryCode`/`TrustedDevice`, Datei `models/moderator.py`→`gruppenfuehrer.py`,
  `Moderator`-Model gelöscht, verwaiste 2FA-Zeilen bereinigt). Gate-Aliase
  `Annotated[Moderator]`→`[Person]`. Schemas `schemas/moderator.py`→`gruppenfuehrer.py`,
  Auth-Schemas `Moderator{Token,LoginErgebnis}`/`Moderator2FA`→`Gruppenfuehrer*`,
  `_moderator_token`/`moderator_login`/Trusted-Device-Cookie → gruppenfuehrer. **DB-Feld
  `formulare.moderator_sichtbar`→`gruppenfuehrer_sichtbar`** (Model/Schema/Service/Endpoint/
  Tests + **Migration 0064**; war nach Schicht 3 FE↔BE-Wire-mismatch → behoben). Backend-
  Prosa (Kommentare/Docstrings) mit ü; Aktor-Params `_moderator`→`_gruppenfuehrer`; 4
  Testdateien umbenannt. **Backend 400 grün, Frontend-Build + Vitest 26 grün, Migrationen
  0061–0064 up+down auf Scratch-DB sauber.** → Merge-PR offen.
- Historische Audit-Aktionswerte `moderator_angelegt`/`-geloescht`/`-passwort_geaendert`
  bleiben als Datenwerte bestehender Audit-Zeilen (bewusst nicht geändert).
- Fortschritt (09.07.2026, Schicht 1 – **DB + Routen**, grün committet `09058b7`):
  DB-Spalte `personen.moderator_rolle` → `gruppenfuehrer_rolle` (Model/Schema/alle Refs +
  Frontend `ElevatedPerson` + **Migration 0061** + Tests); **API-Routen** `/moderator/*` →
  `/gruppenfuehrer/*` (16 Router-Prefixes, Auth-Login, alle Frontend-Calls + React-Router-
  Pfade + Test-Pfade, 407 Stellen); Frontend-Verzeichnis `pages/moderator` →
  `pages/gruppenfuehrer` (git mv). **Backend-Suite 400 grün, Frontend-Build grün.**
- Fortschritt (09.07.2026, Schicht 2 – **Backend-Bezeichner + Dateien + Config**, grün
  committet `c86cc6e`): `CurrentModerator`/`get_current_moderator`/`ModeratorGesperrtError`
  umbenannt; `git mv` aller `api/v1/moderator_*.py`→`gruppenfuehrer_*.py`,
  `services/moderator_service.py`+`moderator_listen_service.py`,
  `core/moderator_2fa_session.py` (+ alle Importe); Audit-Aktionsstrings
  `moderator_2fa_*`→`gruppenfuehrer_2fa_*`; Config-Keys `moderator_login_*`→
  `gruppenfuehrer_login_*` (+ **Migration 0062**). Backend-Suite **400 grün**;
  Migrationskette 0060→0061→0062 auf Scratch-DB sauber angewandt.
- Fortschritt (09.07.2026, Schicht 3 – **Frontend-Bezeichner + Komponenten-Dateien**, grün):
  Symbole umbenannt (`moderatorRolle`/`moderatorToken`/`moderatorAngemeldet`/
  `moderatorAnmelden`/`moderatorAbmelden`/`ModeratorBerechtigung`/`moderator_sichtbar`/
  `Moderator*Login/Layout/Route/Token` …); `git mv` `api/moderator.ts`→`api/gruppenfuehrer.ts`,
  `components/ModeratorRoute`→`GruppenfuehrerRoute`, `pages/gruppenfuehrer/Moderator{Login,Layout}`
  →`Gruppenfuehrer{Login,Layout}`, `Einsatz-/DienstbuchDetailModerator`→`…Gruppenfuehrer`
  (+ `.css`). **Frontend-Build grün, Vitest 26 grün.** Bare-Word-Displaytext („Moderator"/
  „Moderatoren") bewusst noch offen → Schicht 4 (mit ü).
- Fortschritt (09.07.2026, Schicht 4 – **UI-Texte (mit ü) + Frontend fertig**, grün):
  Frontend-Prosa `Moderator`/`Moderatoren`/`Moderatorbereich` → `Gruppenführer`(-bereich)
  in `.tsx/.ts/.css` (Kommentare, JSX-Text, Strings, Datenschutz); `docs/*.md` + README +
  `docs/screenshots/README`; **Backend OpenAPI-Tags** `tags=["moderator:…"]`→`["gruppenfuehrer:…"]`;
  **Matrix-Wire-Key** `moderatoren`→`gruppenfuehrer` + Schema `ModeratorBerechtigungOut`→
  `GruppenfuehrerBerechtigungOut` (Schema+Endpoint+Frontend+Test koordiniert); Rest-Identifier
  `moderator2fa*`→`gruppenfuehrer2fa*`. **Frontend damit vollständig umbenannt.** Backend-Suite
  400 grün, Frontend-Build + Vitest 26 grün.
- Offene Schichten (jeweils grün + committen): (5) **Backend-Prosa** (Kommentare/Docstrings
  „Moderator") – am besten NACH dem Model-Rename, da `\bModerator\b` sonst die Model-Klasse
  trifft; (6) **aktive 2FA-Tabellen** `moderator_recovery_codes`/`moderator_trusted_devices` +
  Models `ModeratorRecoveryCode`/`ModeratorTrustedDevice`, Model-Klasse `Moderator` + Legacy-
  `moderatoren`-Tabelle + `moderator_id`-Spalten (+ Migration; mit dem aufgeschobenen Drop
  bündeln). `backup_service`-Tabellenliste-Eintrag `"moderatoren"` mitziehen. Historische Audit-
  Zeilen `moderator_angelegt`/`-geloescht`/`-passwort_geaendert` bleiben als Label-Keys
  (Daten). **Merge-PR erst nach allen Schichten** (Branch bleibt bis dahin vor beta).
- Priorität: Mittel
- Kategorie: Wartung / Terminologie / Frontend + Backend
- Plan: Nein (aber groß/mechanisch – sorgfältig, mit Tests + Build)
- Beschreibung: „Moderator" ist ein Altbegriff aus der Startzeit → **überall** durch
  **„Gruppenführer"** ersetzen (Nutzerwunsch „an jeder Stelle"). „Administrator/Admin"
  bleibt als höhere Stufe; „Gruppenführer" wird der Oberbegriff für den erhöhten Zugang.
- Umfang: **UI-Texte** (Labels, „Moderatorbereich"/„Moderator-Login" → „Gruppenführer-
  Bereich"/„…-Login"), **Code-Bezeichner** (`CurrentModerator`, `moderator_service`,
  `get_current_moderator`, Routen `/moderator/*`, `moderator_rolle`-Spalte via Migration),
  **Kommentare/Docstrings**, **Docs** (`docs/*.md`, README, permissions.md, Datenschutz).
  Die `moderatoren`-Tabelle entfällt ohnehin mit dem Umbau (Folge-`0061`).
- Notiz: durabel in Memory `feedback-begriff-gruppenfuehrer` hinterlegt; in neuen
  Features **kein** „Moderator" mehr einführen.

### Mehrsprachigkeit vorbereiten (i18n)

- Status: Erledigt (11.07.2026 – alle öffentlichen Seiten **und** der gesamte
  Gruppenführer-Bereich in `texte.ts` migriert; letzte Seite `Personal.tsx`)
- Priorität: Niedrig
- Kategorie: Frontend / Wartung
- Skills: planner, geraetehaus-patterns, review
- Plan: Nein
- Beschreibung: Deutsch bleibt, aber Strings in eine zentrale Datei ziehen (leichtes
  i18n) erleichtert Wording-Anpassungen je Feuerwehr und spätere Sprachen.
- Akzeptanzkriterien: Zentrale String-Quelle; erste Seiten umgestellt.
- Notizen: Nutzen ⭐⭐.
- Fortschritt (09.07.2026, direkt auf beta): **Zentrale String-Quelle etabliert** –
  `frontend/src/i18n/texte.ts`, bewusst **ohne i18n-Framework/Hook** (Deutsch bleibt):
  ein getyptes, nach Seite/Feature verschachteltes Objekt (`texte.<bereich>.<schlüssel>`).
  Konvention: nur statische Texte zentral, dynamische Werte bleiben im Component;
  Migration **seitenweise** (kein Big-Bang). **Erste Seite `LandingPage.tsx` umgestellt.**
  Build grün. **Muster bitte gegenprüfen** – bei anderer Präferenz (z. B. `t("key")`-
  Funktion, flache Keys) muss nur diese eine Seite + `texte.ts` angepasst werden.
- Fortschritt (09.07.2026, direkt auf beta): **`pages/PinSetzen.tsx` migriert** (Namespace
  `texte.pin_setzen`). Bewusst eine von PR #60 (Rename) **nicht** berührte öffentliche Seite
  gewählt → konfliktfrei. Build grün.
- Fortschritt (09.07.2026, direkt auf beta): **`pages/PersonFreigabe.tsx` migriert**
  (Namespace `texte.person_freigabe`; dynamischer Personenname via prefix/suffix inline).
  PR #60 ist inzwischen gemergt → keine Konfliktbeschränkung mehr. Build grün.
- Fortschritt (09.07.2026, direkt auf beta): **`pages/KioskHome.tsx` migriert** (Namespace
  `texte.kiosk`: Kachel-Labels + „Was möchtest du machen?"). Build grün.
- Fortschritt (09.07.2026, direkt auf beta): **`pages/mitglied/MitgliedLogin.tsx` migriert**
  (Namespace `texte.mitglied_login`: Titel, Barcode-/QR-Texte, Buttons, Fehler-Fallbacks;
  Personennamen + Uhrzeit bleiben dynamisch). Build grün.
- Fortschritt (09.07.2026, direkt auf beta): **`Start.tsx`, `NotFound.tsx`,
  `PersonBildHochladen.tsx` migriert** (Namespaces `texte.start`/`not_found`/`bild_hochladen`;
  dynamische Werte inline). Build + Vitest (29) grün.
- Weiter offen: weitere Seiten schrittweise migrieren (nach demselben Muster) – jetzt
  beliebige Seiten (auch Gruppenführer-Bereich), da #60 gemergt. Bisher migriert:
  LandingPage, PinSetzen, PersonFreigabe, KioskHome, MitgliedLogin, Start, NotFound,
  PersonBildHochladen, ManuelleEintragung, DienstbuchManuelleEintragung,
  DienststundenManuelleEintragung, FahrzeugbuchungManuelleEintragung. Die 4 Manuelle-
  Eintragung-Seiten teilen den `texte.manuelle_eintragung`-Namespace (DRY) + je ein kleines
  modul-spezifisches Namespace. **Alle öffentlichen Seiten sind damit migriert.**
  Gruppenführer-Bereich begonnen: **GruppenfuehrerLogin** (`texte.gruppenfuehrer_login`,
  Login + 2FA-Schritt; Login-Test 2/2 grün), **Dashboard** (`texte.dashboard`: Kacheln,
  Schwellenwert-Tabelle, Einsätze-pro-Monat), **FormularZusammenfassung** +
  **ModulUnterseite** (kleine Namespaces), **Buchungsmanagement** (`texte.buchungsmanagement`),
  **AuditLog** (`texte.audit_log` inkl. Aktions-Label-Map), **Systemstatus**
  (`texte.systemstatus`: Dienste-/Job-Status inkl. Ampel-Kurztexte), **Update**
  (`texte.update`; Intro-Absatz mit `<code>` bewusst inline gelassen), **Berechtigungen**
  (`texte.berechtigungen`), **PersonKanaele** (`texte.person_kanaele`),
  **DienstbuchDetailGruppenfuehrer** (`texte.dienstbuch_detail`), **GruppenfuehrerLayout**
  (`texte.gruppenfuehrer_nav`: Nav-Gruppen/-Einträge, Menü/Abmelden – funktionale `?tab=`-Keys
  bewusst literal). Rest: übriger Gruppenführer-Bereich (Personal, Einstellungen, Module,
  KioskGeräte, BarcodeGenerator, EinsatzDetail, SitzplatzEditor …).
- Fortschritt (10.07.2026, direkt auf beta): **`pages/gruppenfuehrer/KioskGeraete.tsx` migriert**
  (Namespace `texte.kiosk_geraete`: Auto-Sperre, Anlegen-Formular, Geräte-Aktionen,
  „Auf Kiosk anzeigen individuell"; Startseiten-Modul-Labels als `module_labels`-Map;
  Kiosk-Link/Token bleiben dynamisch). Build grün.
- Fortschritt (10.07.2026, direkt auf beta): **`pages/gruppenfuehrer/Module.tsx` migriert**
  (Namespace `texte.module_uebersicht`: Titel/Intro, Suche, Gruppen-Titel/-Hinweise,
  Sortier-Buttons, Doku-/Einstellungen-Titel, Badges „intern"/„immer aktiv",
  Aktiv/Kiosk/Außenzugriff-Labels; Modulnamen `m.name` bleiben dynamisch aus der API).
  Build grün.
- Fortschritt (10.07.2026, direkt auf beta): **`pages/gruppenfuehrer/BarcodeGenerator.tsx`
  migriert** (Namespace `texte.barcode_generator`: Titel/Intro, Gültigkeitsdauer,
  Buttons inkl. Lade-Beschriftungen, Massenversand-Ergebnis mit Singular/Plural-Tokens,
  Hinweistext, HTML-Export-Texte „Gültig bis"/alt/Titel, Generieren/Drucken; Personennamen
  + Datum bleiben dynamisch). Build grün.
- Fortschritt (10.07.2026, direkt auf beta): **`pages/gruppenfuehrer/SitzplatzEditor.tsx`
  migriert** (Namespace `texte.sitzplatz_editor`: Preset-Button-Labels, Titel/Hinweis,
  Prompts/Confirm, Umbenennen/Löschen, Funktion-Auswahl, Abbrechen/Speichern). Die
  Sitzplatz-**Bezeichnungen** der Presets bleiben bewusst literal, da sie als Daten in
  `fahrzeug.sitzplaetze` gespeichert werden (keine UI-Chrome). Build grün.
- Fortschritt (10.07.2026, direkt auf beta): **`pages/gruppenfuehrer/EinsatzDetailGruppenfuehrer.tsx`
  migriert** (Namespace `texte.einsatz_detail`: Zurück-Link, Grunddaten-Labels, Aktions-
  Buttons inkl. Lade-Beschriftungen, Einsatzdetails-Tabelle, Teilnehmer-Tabellenköpfe +
  „Ja"/„Keine Teilnehmer", Timeline-Überschrift/Leertext, Confirm-Dialoge mit dynamischem
  Titel via Prefix/Suffix; Status-Wert, Personen-/Fahrzeugnamen und Timeline-Text bleiben
  dynamisch). `.map`-Param `t`→`teilnahme` umbenannt (Alias-Kollision vermieden). Build grün.
- Fortschritt (10.07.2026, direkt auf beta): **`pages/gruppenfuehrer/Einstellungen.tsx`
  migriert** (Namespace `texte.einstellungen`: Organisation/Branding, Logo-Upload,
  Farben, Archivierung, Fehlerberichte, Wartung + `ZweiFaktorVerwaltung` inkl.
  Recovery-Codes/Aktivieren/Deaktivieren; Toasts/Confirms/Prompts, Archiviert-Toast mit
  dynamischen Zahlen). Farb-Defaults (#FFA633/#1A1A1A) bleiben literal. Build grün.
  **Korrektur:** noch offen sind Gruppenführer-seitig **Personal (1392 Z.), Listen (647 Z.),
  NotifierEinstellungen (517 Z.)** – zuvor unvollständig als „Personal, Einstellungen" notiert.
- Fortschritt (10.07.2026, direkt auf beta): **`pages/gruppenfuehrer/NotifierEinstellungen.tsx`
  migriert** (Namespace `texte.notifier_einstellungen`: Telegram/Email-SMTP/Netzwerkdrucker-
  IPP/Web-Push-VAPID/Ereignis-Schalter, Test-Buttons + Ergebnistexte, Speichern-/Fehler-/
  Banner-Texte; EREIGNISSE-Labels aus dem Namespace). Technische Format-Beispiele in
  `placeholder`/`<code>` (smtp.gmail.com, ipp://…, VAPID-Befehl) bleiben literal. Build grün.
- Fortschritt (10.07.2026, direkt auf beta): **`pages/gruppenfuehrer/Listen.tsx` migriert**
  (Namespace `texte.listen`: alle Tab-Inhalte – Einsätze/Dienstbücher/Dienststunden inkl.
  Schwellenwert-Übernahme/Buchungen/Formulare/Namensabweichungen: Filter-Buttons/-Optionen,
  Spaltenköpfe, Status-/Ja-Zellen, Auswertung/Einreichungen, Fehlermeldungen). **Tab-Namen
  bleiben literal** (funktionale `?tab=`-Keys + `TAB_MODUL`/`TAB_PERM`-Lookups + Vergleiche,
  inkl. `<h1>{tab}</h1>`). Build grün. **Rest Gruppenführer: nur noch Personal (1392 Z.).**
- Fortschritt/Abschluss (11.07.2026, direkt auf beta): **`pages/gruppenfuehrer/Personal.tsx`
  migriert** (Namespace `texte.personal`, ~95 Keys: Ampel-Titel, Ereignis-Labels,
  Fehler/Toasts/Prompts/Confirms mit dynamischem Namen via Prefix/Suffix, Kopf/Toolbar,
  CSV-Import, Person-anlegen- & Foto-QR-Dialoge, Filter-Panel, alle 5 Detail-Tabs
  Stammdaten/Zugang/Benachrichtigungen/Verlauf/Erhöhter Zugang). Alias **`txt`** wegen
  mehrfacher `.map((t)=>)`/`.filter((t)=>)`. Build grün. **→ i18n-Task damit vollständig
  abgeschlossen (gesamter Gruppenführer-Bereich + alle öffentlichen Seiten).**

### CI bei jedem PR (GitHub Actions)

- Status: Erledigt (05.07.2026)
- Priorität: Mittel
- Kategorie: DevOps / Tests
- Skills: tests, review
- Plan: Nein
- Beschreibung: GitHub Actions: `pytest` (gegen Postgres-Service-Container) + `npm
  run build` (+ Frontend-Tests, sobald vorhanden) bei jedem PR. Verhindert
  Regressionen, die heute nur manuell auffallen.
- Umsetzung (05.07.2026): `.github/workflows/ci.yml` mit zwei Jobs – **Backend
  (pytest)** gegen einen `postgres:16`-Service (Test-DB `geratehaus_test`, Schema via
  `Base.metadata.create_all` aus conftest; WeasyPrint-Systemlibs vorab installiert)
  und **Frontend (build)** (`npm ci` + `npm run build`). Trigger: jeder Pull Request
  sowie Pushes auf `beta`/`main`; laufende Runs werden bei neuem Push abgebrochen.
- Akzeptanzkriterien: ~~Workflow läuft bei jedem PR; pytest + build grün als Gate~~ ✓.
- Notizen: Nutzen ⭐⭐⭐. Unblockt die **Dependency-/Secret-Scanning**-Aufgabe aus
  Etappe P (6) (kann als weiterer CI-Job ergänzt werden).

### Scheduler-Jobs: „loop + einzelnes commit()"-Fragilität aushärten

- Status: Erledigt (10.07.2026, direkt auf beta)
- Priorität: Mittel (Stabilität/Observability)
- Kategorie: Wartung / Backend
- Plan: Nein
- Beschreibung: In Sentry tauchten zwei Scheduler-Job-Fehler auf (JAVASCRIPT-39
  formular-ablauf, JAVASCRIPT-3B formular-aufbewahrung) mit demselben Muster: ein
  Fehler bei EINEM Element invalidiert die async-Transaktion, das einzelne
  `db.commit()` am Schleifenende schlägt fehl → ganzer Job scheitert (bei -39 sogar
  Endlosschleife, weil der „gesendet"-Marker nie persistiert wurde).
- Umsetzung: Beide Jobs auf **commit-pro-Element + rollback bei Fehler** umgestellt
  (mit Regressionstests). Danach **alle übrigen Scheduler-Jobs auditiert**:
  Archivierung/Audit-Retention = atomare Bulk-Ops (unkritisch); Ampel/PIN-Erinnerung
  = defensive Inner-Ops (Mail-Fehler invalidieren die DB-Transaktion nicht);
  **`personen_inaktivitaet_pruefen`** vorbeugend gehärtet (pro Person try/except +
  rollback → ein Fehler bricht den nächtlichen Lauf nicht mehr ab), Regressionstest
  `test_inaktivitaet_ein_fehler_bricht_lauf_nicht_ab`. Backend-Suite 405 grün.

### Sentry-Cron-Monitor: Deploy-Neustarts tolerieren (Rausch-Reduktion)

- Status: Erledigt (09.07.2026, direkt auf beta)
- Priorität: Niedrig
- Kategorie: Wartung / Observability
- Plan: Nein
- Beschreibung: Jeder `docker compose up --build`-Deploy startet das Backend neu →
  der APScheduler pausiert kurz → verpasster Sentry-Cron-Check-in → sofort ein
  „Cron failure: <job>"-Issue (flappt, löst sich selbst wieder). Rein kosmetisches
  Monitoring-Rauschen, kein echter Job-Fehler.
- Umsetzung: In `app/jobs/scheduler.py` die Monitor-Config in `_monitor_config()`
  extrahiert und um Deploy-Toleranz ergänzt: `checkin_margin=5` (Minuten, verspätete
  Check-ins beim Neustart erlaubt) + `failure_issue_threshold=2` (erst nach 2
  aufeinanderfolgenden Ausfällen ein Issue → ein einzelner Deploy-Miss löst keins mehr
  aus, ein echter anhaltender Ausfall aber weiterhin). Test
  `test_scheduler_monitor_config.py`; volle Suite 401 grün.
- Follow-up (11.07.2026, direkt auf beta): **taktabhängige Schwelle** für sehr enge
  Intervall-Jobs. Der **1-Minuten-Job** `einsatz-geplanter-abschluss` reißt bei den
  häufigen Deploys als einziger die feste Schwelle 2 (ein Neustart verpasst mehrere
  aufeinanderfolgende Minuten-Ticks) → Sentry `JAVASCRIPT-2Z` („missed check-in").
  Fix: `_failure_threshold(schedule)` skaliert die Schwelle bei Minuten-Intervallen
  ≤5 so, dass ein ~6-min-Deploy überbrückt wird (1-Min-Job → 7, 5-Min → 3), langsame
  Jobs (crontab/≥mehrminütig) bleiben bei 2. Regressionstests ergänzt.

### Sentry-Release/-Environment: robuste Versionsermittlung (aus pyproject)

- Status: Erledigt (11.07.2026, direkt auf beta)
- Priorität: Mittel (Observability)
- Kategorie: Wartung / Observability
- Plan: Nein
- Beschreibung: `installierte_version()` las die Version aus `importlib.metadata`
  (dist-info). Bei gecachtem `pip install .`-Build-Layer friert diese auf einer alten
  Nummer ein → die **beta-Instanz meldete sich in Sentry fälschlich als
  `environment=production` / `release 0.4.0`**. Genau das verursachte im Sentry-Triage
  Fehlinterpretationen (JAVASCRIPT-39 wirkte wie ein Prod-Fehler, war aber ein
  verwaister Alt-Container). Siehe auch LESSON „docker compose run … startet die App".
- Umsetzung: `installierte_version()` liest jetzt **primär aus `pyproject.toml`**
  (`_version_aus_pyproject()`, per `tomllib`; im Image immer aktuell durch `COPY`),
  Metadaten nur noch als Fallback. Damit folgt `release`/`environment` immer dem
  tatsächlich deployten Code. Regressionstest `test_installierte_version.py` (3, zuerst
  fehlschlagend: mit veralteter Metadata liefert der alte Code „0.4.0"/„production").
  Volle Backend-Suite 415 grün.

### Frontend-Abhängigkeiten: npm-audit-Advisories beheben (vite 5 → 8)

- Status: Erledigt (Feature-Branch `feature/frontend-audit-vite` → PR nach beta, 06.07.2026)
- Priorität: Mittel
- Kategorie: Wartung / Sicherheit / Frontend
- Skills: geraetehaus-patterns, tests, review
- Plan: Ja
- Umsetzung (06.07.2026): Build-Toolchain auf aktuelle Majors gehoben – `vite`
  5→**8**, `vitest` 2→**4**, `vite-plugin-pwa` 0.20→**1.3**, `@vitejs/plugin-react`
  4→**6** (Node 20.20 erfüllt Vite-8-Engine ≥20.19). `@zxing/browser` bewusst exakt
  auf `0.2.0` gepinnt (0.2.1 verlangt `@zxing/library ^0.23`; Pin hält das Verhalten
  stabil und macht die frische Auflösung im Dockerfile-`npm install` deterministisch).
  `npm audit --audit-level=high` = **0** (vorher 4 moderate/1 high/1 critical),
  `npm ci` + `npm run build` (Vite 8/rolldown, PWA-SW) + `npm run test` (15 Tests) grün.
  Config (`vite.config.ts`) unverändert kompatibel.
- Beschreibung: Der neue `npm audit`-CI-Job meldet 3 Advisories (2 moderate, 1 high)
  in der Build-Toolchain: `esbuild <=0.24.2` (GHSA-67mh-4wv8-2f99 – Dev-Server nimmt
  beliebige Requests an) → `vite <=6.4.2` → `vite-plugin-pwa`. Betrifft die
  **Dev-Abhängigkeiten** (Dev-Server), nicht das ausgelieferte Build-Artefakt, daher
  produktiv geringes Risiko. Fix erfordert `npm audit fix --force` bzw. den Sprung auf
  **vite@8** (Major, breaking) inkl. passender `vite-plugin-pwa`-Version.
- Akzeptanzkriterien: `npm audit` ohne High/Moderate in der Toolchain; `npm run build`
  + PWA-Generierung weiterhin grün; App startet/rendert unverändert (Smoke-Test).
- Notizen: Major-Upgrade → eigener Feature-Branch + PR, Build/PWA gründlich testen
  (Vite-5→8-Migrationsschritte prüfen: Config, Rollup-Optionen, PWA-Plugin-Kompatibilität).
  Aufgekommen 05.07.2026 durch den neuen Security-Scan (Etappe P6 / [[CI bei jedem PR]]).

### Erste Frontend-Tests (Vitest + Testing Library)

- Status: Erledigt (06.07.2026 – alle drei kritischen Flows abgedeckt)
- Umsetzung (06.07.2026): Vitest + @testing-library/react eingerichtet (jsdom, Setup
  `src/test/setup.ts`, `test`-Block in `vite.config.ts`, Script `npm run test`). Erste
  Tests: `oeffentlicheUrl.test.ts` (pure util) und `ModeratorLogin.test.tsx` (deckt den
  neuen 2FA-Login-Flow ab: normaler Login navigiert, 2FA-erforderlich zeigt den
  Code-Schritt). CI-Frontend-Job um „Tests (vitest)"-Step erweitert. 4 Tests grün,
  `npm run build` weiterhin grün.
- Fortschritt (06.07.2026): **Formular-Ausfüllen-Flow getestet** (`FormularAusfuellen.test.tsx`):
  Pflichtfeld-Validierung blockiert das Absenden; ausgefülltes Formular wird gesendet und
  zeigt den Dank. `npm run test` (9 Tests) + `npm run build` grün.
- Fortschritt (06.07.2026): **Kiosk-Eintragung getestet** (`ManuelleEintragung.test.tsx`):
  „Ohne Barcode eintragen" – Name+PIN wählen → Eintragen → Bestätigung; Personen ohne
  gesetzten PIN werden blockiert. `npm run test` (11 Tests) + `npm run build` grün.
- **Alle drei Zielflows (Login/2FA, Formular-Ausfüllen, Kiosk-Eintragung) abgedeckt** →
  Akzeptanzkriterien erfüllt.
- Follow-up (11.07.2026, direkt auf beta): **Frontend-Test-Runner für die Docker-Umgebung.**
  Bisher ließ sich Vitest hier lokal gar nicht ausführen (Host-`node_modules` ist
  root-owned aus dem Container-Build → vite/vitest EACCES beim `.vite-temp`-Schreiben).
  Neues `scripts/test-frontend.sh` (analog `test-backend.sh`): baut den `build`-Stage des
  Frontend-Images (node:20 + Deps + Working Tree) und lässt vitest per `docker run --rm`
  darin laufen (kein `docker compose run`-Zombie, siehe LESSON). Bestehende Suite damit
  verifiziert (29 grün nach i18n-/Modul-Umbauten). **Coverage ergänzt:** `ElwUpload.test.tsx`
  (4) für die neue öffentliche ELW-Upload-Seite (gültig/410 geschlossen/403 ungültig/Upload).
  Gesamt **33 Vitest-Tests grün**.
- Fortschritt (11.07.2026, direkt auf beta): **`PresseberichtModul.test.tsx`** (3) für die
  Pressebericht-Admin-Einstellungen: lädt Config, bedingte Versand-UI (Modus „Stunden" blendet
  das Stunden-Feld ein), Speichern ruft `schreibeEinstellungen` mit dem gewählten Modus + zeigt
  „✓ gespeichert". Gesamt **36 Vitest-Tests grün** (`scripts/test-frontend.sh`).
- Fortschritt (11.07.2026, direkt auf beta): **`Module.test.tsx`** (2) für die Modul-Übersicht:
  „Aktiv"-Checkbox schaltet ein Modul um (ruft `setFeatureModulFlag(key, {aktiv})`); die Suche
  filtert die Modul-Liste. Gesamt **38 Vitest-Tests grün**.
- Fortschritt (11.07.2026, direkt auf beta): **`KioskGeraete.test.tsx`** (2) für die pro-Gerät-
  Kiosk-Anzeige: „individuell festlegen" übernimmt die globalen Startseiten-Defaults; eine
  Modul-Checkbox schaltet ein einzelnes Modul um (ruft `setzeKioskStartseiteModule`). Gesamt
  **40 Vitest-Tests grün**.
- Fortschritt (11.07.2026, direkt auf beta): **`ElwModul.test.tsx`** (2) für die ELW-Admin-
  Einstellungen (lädt `elw_email`, speichert getrimmt). Zusätzlich **kritischer Code-Review
  der neuen Module** (Pressebericht/ELW): ELW-Upload robust — nginx `client_max_body_size 10m`
  + nicht-veröffentlichter Backend-Port deckeln den Body (kein OOM), plus HMAC-Token/
  „Einsatz offen?"/Magic-Bytes+EXIF/Rate-Limit/pfad-sicherer Dateiname; kein Bug gefunden.
  Gesamt **42 Vitest-Tests grün**. Damit sind alle neuen Modul-Seiten frontendseitig getestet.
- Fortschritt (11.07.2026, direkt auf beta): **`EinsatzDetailGruppenfuehrer.test.tsx`** (3) für
  die kritischen Datenänderungs-Flows: Einsatz abschließen ruft `einsatzAbschliessen`; Löschen
  ruft `einsatzLoeschen` **nur nach Bestätigung** (Confirm=true), bei Ablehnung NICHT. Gesamt
  **45 Vitest-Tests grün**.
- Fortschritt (11.07.2026, direkt auf beta): **`Berechtigungen.test.tsx`** (2) für die
  security-relevante Rechte-Matrix: eine Checkbox erteilt ein Modul-Recht (ruft
  `setzeBerechtigung(id, key, true)`); Admin-Zeilen sind deaktiviert (Vollzugriff, nicht
  änderbar). Gesamt **47 Vitest-Tests grün**.
- Fortschritt (11.07.2026, direkt auf beta): **`Buchungsmanagement.test.tsx`** (2) für den
  Genehmigen/Ablehnen-Workflow ausstehender Fahrzeugbuchungen: „Genehmigen" ruft
  `buchungGenehmigen(id)`, „Ablehnen" ruft `buchungAblehnen(id, grund)` mit der eingegebenen
  Begründung. Gesamt **49 Vitest-Tests grün**.
- Priorität: Mittel
- Kategorie: Tests / Frontend
- Skills: tests, review
- Plan: Nein
- Beschreibung: Aktuell **0 Frontend-Tests**. Vitest + React Testing Library für die
  kritischen Flows: Kiosk-Eintragung, Formular ausfüllen, Login.
- Akzeptanzkriterien: Vitest eingerichtet; Tests für die drei Flows grün.
- Notizen: Nutzen ⭐⭐⭐. Voraussetzung/Ergänzung zur CI.

### Automatischer Backup-Restore-Test

- Status: Erledigt (Integritätsprüfung; Feature-Branch → PR, 07.07.2026)
- Priorität: Mittel
- Kategorie: Backend / DevOps / Backup
- Skills: geraetehaus-patterns, tests, review
- Plan: Ja
- Beschreibung: Backup regelmäßig in eine **Wegwerf-DB** zurückspielen + verifizieren
  (Checksummen); Reporting „letztes Backup ok/Größe". Ein Backup, das man nie
  zurückspielt, ist ein Risiko.
- Akzeptanzkriterien: Automatischer Probe-Restore + Integritätsprüfung; Status-
  Reporting.
- Notizen: Nutzen ⭐⭐⭐. Deckt zugleich Backup-Modul-Punkt „Restore-Test".
- Umsetzung (07.07.2026): **Automatische Integritätsprüfung** (rein lesend, kein
  Restore in eine echte DB – bewusst gewählt, da ein echter Probe-Restore riskant/
  komplex ist): `backup_service.pruefe_integritaet` liest das neueste Backup,
  entschlüsselt es, prüft die ZIP-CRCs (`testzip()`), Manifest und alle `db/*.json`.
  `integritaet_pruefen_und_speichern` legt das Ergebnis in app_config ab (Reporting).
  Täglicher Scheduler-Job `backup_integritaet`. Endpunkte
  `GET/POST /moderator/backup/integritaet[-pruefen]`. Frontend: Status-Karte
  „Integritätsprüfung" (Ampel + „Jetzt prüfen") im Backup-Modul. Erkennt beschädigte
  Backups und geänderte Passphrasen. Tests `test_backup_integritaet.py` (5). Suite
  357 grün, `npm run build` grün.
- **Follow-up (offen):** echter Probe-Restore in eine Wegwerf-DB (riskanter/komplexer)
  – bewusst separat gelassen; die lesende Integritätsprüfung deckt den Kern-Nutzen ab.

### System-Statuspanel im Admin (Observability)

- Status: Erledigt (direkt auf beta, 07.07.2026)
- Priorität: Niedrig
- Kategorie: Backend / Frontend / Betrieb
- Skills: geraetehaus-patterns, review
- Plan: Nein
- Beschreibung: DB/SMTP/MinIO/Divera + letzte Job-Läufe (mit letzter Laufzeit) auf
  einen Blick; strukturierte Health-/Readiness-Endpunkte. Hilft beim Self-Hosting-
  Support. Sentry ist optional/opt-in.
- Akzeptanzkriterien: Status-Panel im Admin; Health/Readiness-Endpunkte.
- Notizen: Nutzen ⭐. Backup-Status (Etappe Q „Restore-Test" / Backup-Modul) hier
  mit anzeigen.
- Umsetzung (07.07.2026): `systemstatus_service` (read-only Checks DB `SELECT 1`,
  SMTP-Konfig, MinIO aktiv+erreichbar via `liste_buckets`, Divera-Konfig,
  Scheduler-Jobs mit `next_run_time`). Endpunkte: `GET /moderator/meta/systemstatus`
  (Admin-only) + unauth. `GET /api/v1/ready` (Readiness inkl. DB → 200/503; `/health`
  bleibt der triviale Liveness-Check). Frontend: Admin-Seite `Systemstatus.tsx`
  (Ampel-Panel Dienste + Job-Tabelle, Aktualisieren-Button), Nav-Punkt „Systemstatus"
  (nurAdmin) unter Verwaltung, Route unter `AdminRoute`. Tests `test_systemstatus.py`
  (Readiness, Admin-Status, 403 für Nicht-Admin). Suite 336 grün, `npm run build` grün.
- **Follow-up (offen):** „letzte Laufzeit" je Job (statt nur nächster Lauf) +
  Backup-Status brauchen Persistenz der Job-Ergebnisse – bewusst separat gelassen.

> **Hinweis Mobile-Overflow:** bereits als Bugs in **Etappe D** („Layout-Overflow auf
> Mobile") und **Etappe E** („Kacheln seitlich abgeschnitten") erfasst – dort beheben.

---

## Ideen-Backlog aus Vorschlag.md (übertragen 05.07.2026)

> Modulweise Ideensammlung, 1:1 aus der gelöschten `Vorschlag.md` übernommen, damit
> keine Information verloren geht. Legende Nutzen `⭐`(1–3) · Aufwand `S/M/L`.
> Bereits als eigene Etappe/Aufgabe geführte Punkte sind mit „→ siehe …" verlinkt
> statt doppelt beschrieben. „gewählt 05.07.2026" = vom Nutzer ausdrücklich gewünscht.

### Personal

- **Mitglieder-Selfservice** `⭐⭐ · M` · Prio Mittel · Plan Ja · *gewählt 05.07.2026*:
  Mitglied kann im Login **eigene Kontaktdaten/Foto aktualisieren**; Änderungen gehen
  als **Vorschlag** an einen Moderator zur Bestätigung (analog Divera-Personal-
  Vorschläge / Namensabweichungen). Entlastet Moderatoren bei Stammdatenpflege.
- **Mitgliederdaten-Zusatzfelder** `⭐⭐ · M` · Prio Mittel · Plan Ja: frei
  konfigurierbare Personenfelder (analog `EinsatzFeldDefinition`) – Führerscheinklassen,
  Atemschutztauglichkeit + Ablaufdatum, Lehrgänge – mit **Ablauf-Erinnerung**. Sehr
  feuerwehrtypischer Bedarf.
- **Ampel weiter denken** `⭐⭐ · S` · Prio Mittel · Plan Nein: in der Personal-Liste
  nach Ampel **filtern/sortieren** („nur überfällige zeigen"); Ampel-Schwelle **pro
  Gruppe/Funktion** differenzieren (Aktive vs. Altersabteilung). Vgl. Aufgabe
  „Personal-Filter nach Benachrichtigungs-Freigaben" (Benachrichtigungen).
- **Foto-Handling** `⭐ · S` · Prio Niedrig · Plan Nein: Uploads serverseitig auf max.
  Kantenlänge verkleinern (spart Speicher/Bandbreite am Kiosk). Platzhalter-Avatare
  (Initialen) existieren.
- **CSV-Import** `⭐⭐⭐ · M` → **siehe Etappe J** (Personen-CSV-Import).
- **Personen-Auswertungsseite** `⭐⭐ · M` → **siehe Etappe H** (Timeline + Verlauf,
  neuer Tab „Statistik").

### Fahrzeuge

- **Funkstatus + Live-Position (quellen-agnostisch)** `⭐⭐⭐ · L` · Prio Mittel ·
  Plan Ja · *gewählt 05.07.2026*: je Fahrzeug **Funkstatus (FMS 1–6)** und **Position**
  (lat/lon **+ Timestamp**). **Generisches Ingest-/Provider-Interface** (kein
  Hardcoding), damit **Traccar** (Open-Source-GPS, Webhook/API), **Divera** o. a.
  einfach anbindbar sind.
  - Datenmodell: letzte Position/Status am Fahrzeug + optionale **Positions-Historie**
    (Aufbewahrungsfrist); Mapping „Quellen-ID → Fahrzeug".
  - Frontend: Karte (Leaflet + OSM-Tiles) mit Markern, Status-Badge, „zuletzt gesehen";
    am Dashboard.
  - Sicherheit/DSGVO: Ingest per **Token/HMAC**; Ansicht nur Admin/Moderator;
    Positions-Historie mit **Löschfrist**; Zweckbindung dokumentieren. Dient der
    **Lageübersicht/Fahrzeugsuche**, nicht der Alarmierung.
  - Vorgehen: Feature-Branch + PR; **zuerst ersten Connector** (Traccar) wählen,
    Interface daran ausrichten.
- **Fahrzeug-Zusatzdaten & Prüftermine** `⭐⭐ · M` · Prio Mittel · Plan Nein:
  Kennzeichen, Funkrufname (ISSI vorhanden), TÜV/UVV/Beladungsprüfung mit
  **Erinnerung** vor Ablauf (Notifier). Häufiger Wunsch.
- **Sitzplan-UX: Raster-Snap/Ausrichten** `⭐⭐ · S` · Prio Mittel · Plan Nein ·
  *gewählt 05.07.2026*. (Sitzplan-PDF/Druck und „Beladung je Sitzplatz" **nicht**
  gewählt.)

### Einsatztagebuch

- **Einsätze zusammenführen (Merge)** `⭐⭐⭐ · L` · Prio Mittel · Plan Ja ·
  *gewählt 05.07.2026*: **jeder Moderator** kann **offene** Einsätze zusammenführen
  (ein reales Ereignis, mehrere Divera-Alarme → ein Datensatz).
  1. **Feldweise wählen**, welcher Wert von welchem Einsatz übernommen wird (Titel,
     Adresse, Meldung, Zeit, Einsatznummer, Zusatzfelder) – bei Konflikt nachfragen.
  2. **Teilnahmen/Sitzplätze zusammenführen**: bei **Doppelbelegung eines Sitzes**
     nachfragen – Person aus Einsatz A, aus B oder **beide auf einen Platz** lassen.
  3. Quell-Einsätze **löschen/archivieren**, Merge im **Timeline** vermerken (welche
     Einsätze/Divera-IDs). Eigener Feature-Branch + PR.
- **Foto-/Lagebild-Anhänge je Einsatz** `⭐⭐ · M` · Prio Mittel · Plan Ja ·
  *gewählt 05.07.2026*: Bilder (Lagebilder/Schadensfotos) hochladen, im **MinIO**-Ordner
  des Einsatzes archiviert (10-Jahre-Ablage), im PDF/Bericht referenzierbar. Datei-
  Upload-Baustein aus Formular-Modul wiederverwenden; **kein öffentliches Serve**
  (→ geschützte Datei-Auslieferung, Etappe P).
- **Einsatzarten/Kategorien** `⭐⭐ · M` · Prio Mittel · Plan Nein: Brand/TH/Sonstiges,
  Stichwort-Katalog – Grundlage für Auswertungen und PDF-Statistiken.
- **Zusatzfeld-Typen erweitern** `⭐⭐ · S` · Prio Mittel · Plan Nein: Datum/Zahl/
  Auswahl analog Formular-Modul (heute nur text/mehrzeilig/checkbox); Validierungs-
  Baustein teilen.
- **Atemschutz-Auswertung** `⭐⭐ · M` · Prio Mittel · Plan Nein: aus „Atemschutz +
  Minuten" je Person eine Jahresübersicht (Kurzprüfung/Belastungsübung) ableiten.
- **Countdown-Feinschliff** `⭐ · S` · Prio Niedrig · Plan Nein: am Kiosk sichtbarer
  „noch offen bis"-Hinweis + „Countdown verlängern"-Button für lange Einsätze.
- **Einsatz-Statistik (Jahresvergleich)** `⭐⭐⭐ · M` → **siehe Abschnitt
  „Einsatztagebuch"** (Jahresanzahl mit Vorjahresvergleich zum Stichtag).

### Dienstbuch

- **Ausbilder/Thema je Dienst** `⭐ · S` · Prio Niedrig · Plan Nein · *gewählt
  05.07.2026*: pro Dienst dokumentieren, **wer welches Thema** ausgebildet hat (Feld
  „Ausbilder" + „Thema") – Grundlage für Ausbildungsnachweise/-abdeckung.
- **Anwesenheitsquote pro Person – Frontend** `⭐⭐ · M` · Prio Mittel · Plan Nein ·
  *Backend erledigt 05.07.2026*: `GET /dienstbuecher/anwesenheit?von=&bis=` liefert
  `{gesamt, personen:[{person_id, teilgenommen, quote}]}`. **Offen:** Frontend-Anzeige
  (Personal/Listen) + optional Export.
- **Wiederkehrende Dienste/Vorlagen** `⭐⭐ · S` · Prio Mittel · Plan Nein: Dienstplan-
  Vorlagen (z. B. „Übung jeden 1. Montag") halb-automatisch anlegen.
- **Themen/Kategorien je Dienst** `⭐ · S` · Prio Niedrig · Plan Nein: Ausbildung/
  Arbeitsdienst/Sonstiges für Auswertungen.
- **Mindest-Dienstbeteiligung** `⭐⭐⭐ · M` → **siehe Etappe L** (Auswertung relevanter
  Dienste + Schwellenwert + Benachrichtigung/Ampel).
- **Dienstbuch-Zusatzfelder + Typ „Auswahl"** `⭐⭐ · M` → **siehe Etappe C**.

### Dienststunden

- **Persönlicher Jahresreport** `⭐⭐ · M` · Prio Mittel · Plan Nein · *gewählt
  05.07.2026*: jede Person erhält ihre Stundenauswertung (Summe je Funktion/Kategorie,
  Schwellenwert-Status) als **Mail und/oder Download** (z. B. Jahreswechsel). Nutzt
  Notifier-/PDF-System.
- **Jahresauswertung/Export** `⭐⭐ · M` · Prio Mittel · Plan Nein: pro Person/Funktion
  (CSV/PDF) inkl. Schwellenwert-Erreichung – Basis für Aufwandsentschädigung/Ehrungen.
- **Genehmigungs-Workflow (optional)** `⭐⭐ · S` · Prio Niedrig · Plan Nein: erfasste
  Stunden müssen von einem Moderator bestätigt werden (Missbrauchsschutz), abschaltbar.
- **Automatische Stunden aus Einsatz/Dienstbuch** `⭐ · S` · Prio Niedrig · Plan Nein:
  Teilnahme → Stundenvorschlag, Person bestätigt nur.

### Fahrzeugbuchung

- **Selbst-Stornierung/Änderung per Token-Link** `⭐⭐ · S` · Prio Mittel · Plan Nein:
  Anfragender storniert/ändert selbst über Token-Link aus der Mail (heute nur
  Moderator).
- **Wiederkehrende Buchungen** `⭐⭐ · S` · Prio Mittel · Plan Nein: Serientermine +
  Ganztags-Option.
- **Kollisionsanzeige schon bei der Anfrage** `⭐ · S` · Prio Niedrig · Plan Nein: am
  Kiosk „belegt von…" anzeigen, bevor abgeschickt wird.
- **Externe/iCal-Kalender überlagern** `⭐⭐⭐ · M` → **siehe Etappe I**.

### Formular

- **Bedingte Felder / Logiksprünge** `⭐⭐ · M` · Prio Mittel · Plan Ja: „zeige Feld B
  nur, wenn A = Ja". Häufigster Mehrwert für echte Umfragen/Anmeldungen.
- **Anmelde-Workflow rund machen** `⭐⭐ · M` · Prio Mittel · Plan Ja: aus „Kapazität"
  eine echte **Teilnehmerliste + optionale Warteliste mit Nachrück-Benachrichtigung**.
- **PDF-Export je Einreichung + MinIO-Archiv** `⭐⭐ · S` · Prio Mittel · Plan Nein:
  PDF je Einreichung (CSV existiert); Datei-Uploads ins MinIO-Modul (10-Jahre-Logik
  wie Einsatz/Dienstbuch).
- **Diagramme in der Auswertung** `⭐⭐ · S` · Prio Mittel · Plan Nein: Balken sind
  rudimentär da; Anteile in %.
- **Vorlagen-Bibliothek** `⭐ · S` · Prio Niedrig · Plan Nein: typische Formulare
  (Dienstbewertung, Anmeldung Fest, Materialmeldung) zum Duplizieren.
- **Bestätigungsmail an Einreicher** `⭐ · S` · Prio Niedrig · Plan Nein: wenn
  E-Mail-Feld/Login vorhanden.

### Benachrichtigungen

- **Ampel-Sammelbenachrichtigung statt Einzelmails** `⭐⭐⭐ · S` · Prio **Hoch** ·
  Plan Nein · **Status: Erledigt (05.07.2026)** · *gemeldet 05.07.2026*: Der Ampel-Job
  verschickte je überfälliger Person eine eigene Benachrichtigung → 50+ Telegram/
  E-Mail-Nachrichten auf einmal. **Umgesetzt:** `ampel_service.ampel_benachrichtigungen_versenden`
  bündelt alle in einem Lauf neu überfälligen Personen je Stufe (gelb/rot) zu **einer**
  Sammel-Benachrichtigung (Personenliste im Text); neuer Parameter
  `notifier_service.benachrichtige(nachricht_override=…)`. Höchstens zwei Nachrichten
  je Lauf (gelb und/oder rot) statt einer pro Person. Regressionstests in
  `test_ampel.py` (`…_sammelt_alle_personen`, `…_gelb_und_rot_getrennt`).
- **Zustell-Log & Testversand je Kanal/Ereignis** `⭐⭐ · S` · Prio Mittel · Plan Nein
  · *gewählt 05.07.2026*: sichtbar machen, ob/wann/an wen etwas rausging (heute nur
  Sentry/Logs); jedes Ereignis testweise auslösbar. Reduziert Support.
- **Eskalation bei offenen Anfragen** `⭐⭐ · M` · Prio Mittel · Plan Nein · *gewählt
  05.07.2026*: bleibt eine Buchungsanfrage (o. Ä.) länger als X Stunden unbeantwortet
  → automatische Erinnerung an die Moderatoren. Scheduler-Job (Muster
  `_formular_ablauf_job`).
- **Bevorzugter Kanal + Fallback je Person** `⭐⭐ · M` · Prio Mittel · Plan Nein ·
  *gewählt 05.07.2026*: Person wählt Wunschkanal (Mail/Telegram/Push); bei Fehlschlag
  (z. B. Bounce) greift eine **Fallback-Reihenfolge**. Ersetzt „an alle aktiven
  Kanäle". Baut auf `Benachrichtigungskanal` + `benachrichtige()` (Zustell-Ergebnis
  auswerten).
- **„Digest"/Zusammenfassungen** `⭐⭐ · S` · Prio Niedrig · Plan Nein: tägliche/
  wöchentliche Sammelmail statt Einzelmails, pro Abonnent wählbar.
- **Telegram-Gruppen/Chat-Verwaltung** `⭐ · S` · Prio Niedrig · Plan Nein:
  komfortabler Bot-Setup-Assistent.
- **Grundsatz „Kein Alarmierungssystem" umsetzen** `⭐⭐ · S` · Prio Mittel · Plan Nein:
  App meldet keine Alarme/Einsätze **aktiv** raus (kein Divera/Melder-Ersatz). **Zu
  prüfen:** bestehende Sofort-Benachrichtigung „Neuer Einsatz (Divera-Alarm)" ggf.
  standardmäßig **aus**/entfernen, damit die Positionierung eindeutig bleibt.
- **Web-Push-Abo-Flow im Frontend** `⭐⭐ · M` → **siehe „Web Push nutzbar machen"**
  (Abschnitt Benachrichtigungen). Jetzt konkret nutzbar (öffentlich über HTTPS).
- **Pro-Empfänger statt global** `⭐⭐ · M` → **siehe Etappe G**.

### Kiosk

- **Kiosk-Gerät-Verwaltung erweitern** `⭐⭐ · M` · Prio Mittel · Plan Nein: „zuletzt
  gesehen", Umbenennen, Deaktivieren/Token-Rotation, QR-Code zum Einrichten des
  Tablets.
- **Kiosk-Branding pro Gerät** `⭐ · S` · Prio Niedrig · Plan Nein: z. B. Standort-Name
  im Header; PWA-„Add to Homescreen"-Anleitung im Kiosk-Setup.
- **Offline-Fallback** `⭐ · S` · Prio Niedrig · Plan Nein: freundliche Offline-Seite
  über den Service-Worker; Eintragungen ggf. lokal puffern (fortgeschritten).
- **Kiosk-Autolock/Inaktivitäts-Reset** `⭐⭐ · S` → **siehe Etappe Q**.

### Divera 24/7

> Grundsatz: **nur lesen, kein Rückkanal**; Personal-Abgleich bleibt bei Vorschlägen.

- **Sync-Status & Verbindungstest** `⭐⭐ · S` · Prio Mittel · Plan Nein · *gewählt
  05.07.2026*: „Verbindung testen"-Button, letzter erfolgreicher Sync + letzte Fehler
  im Modul sichtbar (heute nur Logs).
- **Feld-Mapping konfigurierbar** `⭐⭐ · M` · Prio Mittel · Plan Ja · *gewählt
  05.07.2026*: Zuordnung Divera-Felder → Einsatz(-Zusatz)felder einstellbar statt fest.
  Nutzt Zusatzfeld-Definitionen des Einsatztagebuchs.
- **Webhook-Sicherheit (HMAC/Header-Secret)** `⭐⭐ · M` · Prio Mittel · Plan Ja:
  Accesskey steckt als Query-Parameter (landet in Logs). Signatur/HMAC oder Header-
  Secret prüfen; Request validieren. Vgl. Etappe P (0) Phase 2.
- **Fahrzeug-/Alarmierungs-Daten übernehmen** `⭐ · S` · Prio Niedrig · Plan Nein:
  welche Fahrzeuge alarmiert wurden optional in den Einsatz übernehmen.

### Barcode

- **Sammel-Barcodes als PDF** `⭐⭐ · S` · Prio Mittel · Plan Nein: Kartenbogen zum
  Ausdrucken/Laminieren für alle Mitglieder; QR statt/zusätzlich zu Code128 optional.
- **NFC/Chip-Option** `⭐ · S` · Prio Niedrig · Plan Nein: langfristig Tags statt
  Papier-Barcode.
- **„Barcode vergessen" absichern** `⭐⭐ · S` → **siehe Etappe F**.

### Backup

- **Backup-Status im Dashboard/Statuspanel** `⭐⭐ · S` · Prio Mittel · Plan Nein:
  letzter Lauf, Ziel-Ergebnisse, nächster Lauf + Warnung, wenn X Tage kein
  erfolgreiches Backup. Vgl. System-Statuspanel (Etappe Q).
- **Schlüssel-/Passphrase-Handling** `⭐⭐ · S` · Prio Mittel · Plan Nein: Warnung/Doku,
  dass ohne Passphrase kein Restore möglich ist; optional Recovery-Hinweis-Workflow.
- **Selektives Zeitplan-Backup** `⭐ · S` · Prio Niedrig · Plan Nein: nur DB / nur
  Dateien / nur MinIO je Ziel.
- **Restore-Test & Integritätsprüfung** `⭐⭐⭐ · M` → **siehe Etappe Q** (Automatischer
  Backup-Restore-Test).

### MinIO / Objektspeicher

- **Lifecycle/Retention-Policies je Bucket** `⭐⭐ · M` · Prio Mittel · Plan Nein: z. B.
  10 Jahre aufbewahren, dann löschen; Object-Lock/WORM-Hinweis für revisionssichere
  Archivierung.
- **Weitere Module anbinden** `⭐⭐ · S` · Prio Mittel · Plan Nein: Formular-Uploads +
  Personenbilder archivieren; Dateibrowser um Vorschau (Bilder/PDF inline) erweitern.
- **Verbindungs-Diagnose ausbauen** `⭐ · S` · Prio Niedrig · Plan Nein: Bucket-Rechte
  prüfen, freier Speicher.

### Querschnitt (weitere, nicht bereits oben)

- **Zeitzone durchgängig Europe/Berlin** `⭐⭐⭐ · M` → **siehe Etappe M**.
- **Berechtigungssystem fertigstellen** `⭐⭐⭐ · M` → **siehe Etappe P (2)** /
  „Granulare Berechtigungsverwaltung".

---

## Etappe R – QR-PDFs (Nutzerwunsch 05.07.2026)

### Kiosk-Link als schönes QR-PDF (pro Gerät)

- Status: Erledigt (PR #35 in `beta` gemergt + deployt, 06.07.2026; Status 11.07.2026
  nachgezogen – Feature live: `pdf_service.kiosk_link_pdf` + Route in gruppenfuehrer_barcodes)
- Umsetzung (06.07.2026): Server-seitiges PDF über WeasyPrint (`pdf_service.kiosk_link_pdf`
  + Template `templates/pdf/kiosk_link.html`, erbt `base.html` → Logo/Org-Name im Kopf).
  QR serverseitig aus dem Kiosk-Link (`{oeffentliche_basis_url}/kiosk/<token>`) über neue
  Dependency **`segno`** (pur-Python) als PNG-Data-URI. Poster mit Gerätename, großem QR,
  Link-Text und 4-Schritt-Anleitung. Endpunkt `GET /moderator/barcodes/kiosk/{id}/pdf`
  (CurrentAdmin). Frontend: „PDF"-Button pro Gerät in `KioskGeraete.tsx` (Download via
  authentifiziertem Blob, `ladeKioskPdf`). Tests `test_kiosk_pdf.py` (3); Suite 283 grün,
  `npm run build` grün.
- Priorität: Mittel
- Kategorie: Feature / Frontend / Backend
- Skills: geraetehaus-patterns, tests, review
- Plan: Ja
- Beschreibung: Pro Kiosk-Gerät ein ansprechend gestaltetes PDF zum Ausdrucken/
  Aushängen: Logo + Organisationsname + Gerätename + **großer QR-Code** auf den
  Kiosk-Link (`/kiosk/<token>`) + kurze Einrichtungs-Anleitung („als Lesezeichen/
  Startbildschirm speichern"). Button „PDF" pro Gerät auf der Kiosk-Geräte-Seite
  (`KioskGeraete.tsx`, neben Link kopieren).
- Akzeptanzkriterien: PDF-Download je Gerät; QR führt korrekt auf `/kiosk/<token>`;
  Logo/Name/Gerätename enthalten; Test.
- Notizen: Server-seitig über WeasyPrint (wie Einsatz-/Dienstbuch-PDF, `pdf_service`
  + HTML-Template) + QR als Data-URI. QR-Erzeugung: entweder Python-QR-Lib ergänzen
  (`segno` pur-Python oder `qrcode`+Pillow – Pillow ist vorhanden) oder QR im Frontend
  (`qrcode`-Lib ist da) erzeugen und als Data-URI an den PDF-Endpunkt senden.

### Dienststunden-Funktions-QR-PDF (Stempel-Poster)

- Status: Erledigt (PR #36 in `beta` gemergt + deployt, 06.07.2026; Status 11.07.2026
  nachgezogen – Feature live: `dienststunden_stempel_pdf` + Route `/dienststunden-stempel/<id>`)
- Umsetzung (06.07.2026): Öffentlicher, dauerhafter Link `/dienststunden-stempel/<funktion_id>`.
  Backend: öffentliches Info-Endpoint `GET /dienststunden-stempel/{id}` (rate-limitiert,
  Funktionsname + `aktiv`=Funktion&Modul aktiv); QR-PDF `pdf_service.dienststunden_stempel_pdf`
  + Template `dienststunden_stempel.html` (segno-QR aufs Stempel-Link) + Admin-Endpunkt
  `GET /moderator/stammdaten/funktionen-dienststunden/{id}/pdf`. Die Erfassung selbst nutzt
  den bestehenden `POST /dienststunden` (Login per Mitglieds-Cookie/Barcode via
  `require_zugriff`/`CurrentPerson`) – kein neuer Schreib-Endpunkt nötig, Funktion fix.
  Frontend: neue öffentliche Seite `DienststundenStempel.tsx` (Route
  `/dienststunden-stempel/:funktionId`): Funktionsname + Datum heute fest, Stundenwahl
  (Chips/Stepper, wie Reservierungs-Eintrag), Login über `PersonIdentifikation`, Eintrag
  über `stundenErfassen`. „QR-PDF"-Button je Funktion in `FunktionenDienststundenVerwaltung.tsx`.
  Tests `test_dienststunden_stempel.py` (5); Suite 288 grün, `npm run build` grün.
- Priorität: Mittel
- Kategorie: Neues Feature / Frontend / Backend
- Skills: planner, geraetehaus-patterns, tests, review
- Plan: Ja
- Beschreibung: Pro Dienststunden-**Funktion** ein **dauerhafter** QR/Link zum
  Aushängen (Poster). Scan → **Login** (Name+PIN bzw. Barcode je nach Modul) →
  Funktion ist **fest vorgegeben**, Datum = **heute**, die Person wählt nur die
  **Stundenzahl** (vorhandene Touch-Eingabe mit Chips/Stepper). QR-PDF (Logo,
  Funktionsname, großer QR, kurze Anleitung) über einen „QR-PDF"-Button pro Funktion
  in der Dienststunden-Verwaltung.
- Design (geklärt 05.07.2026): **dauerhaft pro Funktion** (kein Einmal-Token);
  gescannte Seite verlangt **Login**, Funktion fixiert, nur Stundenwahl für heute.
- Akzeptanzkriterien: QR-PDF je Funktion; gescannte Seite mit Login-Pflicht, fester
  Funktion, nur Stunden (heute); Eintrag landet korrekt in Dienststunden der
  angemeldeten Person; Tests.
- Notizen: Dauerhafter funktionsgebundener Link (z. B. `/dienststunden-stempel/<funktion_id>`);
  neuer öffentlicher Eintrags-Endpunkt mit **fixer Funktion** (rate-limitiert, Funktion
  server-seitig als existent+aktiv prüfen), nutzt das signierte Mitglieder-Cookie
  (`get_current_person`) und den vorhandenen Dienststunden-Erfassungs-Service. Baut auf
  bestehender Touch-Eingabe (`DienststundenManuelleEintragung.tsx` / `Dienststunden`-
  Modul) auf.

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
