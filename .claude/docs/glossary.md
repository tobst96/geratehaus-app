# Glossar

Fachbegriffe rund um Gerätehaus.app (Feuerwehr-Domäne und projektinterne Begriffe).

## Domäne / Feuerwehr

- **Kiosk** – Tablet/Bildschirm im Gerätehaus, auf dem die App läuft; Mitglieder
  identifizieren sich per Barcode-Scan statt Login. Autorisierung des Geräts über
  ein Kiosk-Token.
- **Einsatztagebuch / „Garage"** – Modul zur Erfassung von Einsätzen; offene
  Einsätze öffnen sich zum Eintragen, Fahrzeuge mit Sitzplätzen.
- **Divera 24/7** – externer Alarmierungsdienst; Einsätze können per Polling oder
  Webhook importiert werden.
- **VAB** – „Verfügbar am Beginn" / Verfügbarkeitskennzeichen, das beim Eintragen
  pro Person erfasst wird.
- **Atemschutzminuten** – beim Eintragen per Schieberegler erfassbare Minuten unter
  Atemschutz.
- **Auf Anfahrt gewesen** / **Einsatzbereit im Feuerwehrhaus** – eigene
  Buchungsarten neben der Sitzplatz-Eintragung.
- **Trupp / Staffel / Gruppe** – Besatzungsstärken (Sitzplatz-Vorlagen nach
  DIN 14502), frei editierbar.
- **ISSI** – Funkgeräte-/Fahrzeugkennung (Feld am Fahrzeug, Migration
  `0034_fahrzeug_issi`).
- **Dienstbuch** – schnelles Eintragen in zuletzt eröffnete Dienste.
- **Dienststunden** – geleistete Stunden pro Person/Funktion, kumuliert mit
  konfigurierbaren Schwellenwerten.
- **Funktion** – Rolle/Tätigkeit einer Person (getrennt für Einsatz und
  Dienststunden: `FunktionEinsatz`, `FunktionDienststunden`).

## Projektintern

- **Modul** – fachlicher Baustein (Einsatztagebuch, Dienstbuch, Dienststunden,
  Fahrzeugbuchung), einzeln aktivierbar/sichtbar/außenfreigebbar.
- **Moderator-Bereich** – Verwaltungsoberfläche; Rollen **Admin** und
  **Gruppenführer** (siehe `.claude/docs/permissions.md`).
- **Mitglied-Login (Außenzugriff)** – öffentlicher Login außerhalb des Kiosks,
  per signiertem `pin_session`-Cookie.
- **Reservierung** – kurzlebiger, meist einmal verwendbarer Token-Flow (z. B.
  „Barcode vergessen", Profilbild-Upload, Mitglied-Login). Ablauf:
  erstellen → QR/Token → identifizieren → Vorschau → einlösen.
- **Timeline** – grafisches Ereignisprotokoll (`PersonEreignis`, `EinsatzEreignis`).
- **Punkte** – Aktivitätspunkte mit Gültigkeit und Abbau-Modus (`PersonPunkt`).
- **app_config** – Tabelle für alle fachlichen Einstellungen, Zugriff nur über
  `config_service`.
- **Setup-Wizard** – Ersteinrichtung (Organisation, Logo, Farben, Admin-Passwort);
  jederzeit wiederholbar.
