# Gerätehaus.app

Eine selbst hostbare, mobile-first Webanwendung (PWA) für Feuerwehren und ähnliche
Organisationen zur Verwaltung von Einsätzen, Diensten, Dienststunden und
Fahrzeugbuchungen. Die App läuft als **Kiosk** auf einem Tablet/Bildschirm im
Gerätehaus: Mitglieder scannen ihren persönlichen Barcode, identifizieren sich
damit eindeutig und tragen sich für Einsätze, Dienste oder Dienststunden ein –
ganz ohne Tippen oder Login. Ein Moderator-Bereich erlaubt die Verwaltung aller
Stammdaten, Personen und Einstellungen.

**Open-Source-Prinzip:** Kein einziger feuerwehr-spezifischer Wert steht hart im
Code. Alles, was von Organisation zu Organisation unterschiedlich ist –
Name, Logo, Farben, Module, Fahrzeuge, Sitzplätze, Funktionen, Zusatzfelder –
wird beim ersten Start über einen Einrichtungsassistenten festgelegt und ist
danach jederzeit über den Moderator-Bereich änderbar.

## Funktionen

- **Kiosk-Startseite** – große, dynamisch skalierende Kacheln (nie Scrollen
  nötig), pro Modul einzeln ein- und ausblendbar
- **Personen & Barcodes** – Vorname/Zwischenname/Nachname, Profilbild (Fallback:
  Initialen-Avatar), echter Code128-Strichcode pro Person mit konfigurierbarer
  Gültigkeitsdauer; beim Scannen wird das Profilbild groß zur Bestätigung
  angezeigt, der Rohtext ist zum Testen zusätzlich als kopierbares Feld sichtbar
- **"Barcode vergessen"** – im Scan-Dialog erzeugt ein Button einen QR-Code für
  genau diesen Sitzplatz/diese Aktion in diesem Einsatz; die Person scannt ihn
  mit dem eigenen Handy, wählt sich aus den Personen-Stammdaten aus und trägt
  sich ohne Barcode ein (kurzlebiger, einmal verwendbarer Reservierungs-Token).
  Der Scan-Dialog schließt sich automatisch, sobald die Eintragung erfolgt ist;
  solche Eintragungen sind in Listen und PDF als "ohne Barcode" markiert,
  IP/Browser werden zur Nachverfolgung in den Listen (nicht im PDF) vermerkt
- **Einsatztagebuch ("Garage")** – Einsätze manuell oder per Divera-24/7-Import,
  öffnen sich automatisch zum Eintragen; Fahrzeuge als eigene Kästen mit
  konfigurierbaren Sitzplätzen (Trupp/Staffel/Gruppe-Vorlagen nach DIN 14502
  oder frei editierbar), Eintragung per Barcode-Scan inkl. VAB und
  Atemschutzminuten (Schieberegler), zusätzlich "Einsatzbereit im
  Feuerwehrhaus" und "Auf Anfahrt gewesen" als eigene Buchungsarten; der Kiosk
  zeigt ausschließlich offene Einsätze an
- **Frei konfigurierbare Einsatz-Zusatzfelder** – z. B. Einsatzleiter,
  Einheitsführer, Erste Lage, Tätigkeit (Standardbelegung), beliebig erweiterbar
  um Text-, Mehrzeilen- oder Checkbox-Felder
- **Einsatz-Countdown** – konfigurierbarer Timer in der Garage-Ansicht, springt
  bei jeder neuen Eintragung zurück auf den Startwert und schließt die Ansicht
  automatisch bei Ablauf; "Zurück" sichert dabei automatisch die Einsatzdetails
- **Abschluss eines Einsatzes** – manuell im Moderator-Bereich (auch wieder
  rückgängig zu machen) oder über zwei automatische Wege: ein "Alle
  eingetragen"-Button im Gerätehaus plant den Abschluss für in einigen Minuten
  ein (Verzögerung konfigurierbar), und ein nächtlicher Job schließt offene,
  länger inaktive Einsätze automatisch (Uhrzeit und Inaktivitätsschwelle
  konfigurierbar)
- **Timeline** – jeder Einsatz hat im Moderator-Bereich eine grafische
  Zeitleiste aller Ereignisse (Anlage, Eintragungen inkl. Fehlversuche,
  Detail-Änderungen mit altem und neuem Wert, Abschluss, Wiedereröffnung,
  E-Mail-Versand)
- **Dienstbuch** – schnelles Eintragen in zuletzt eröffnete Dienste
- **Dienststunden** – Erfassung pro Person/Funktion, kumulierte Übersicht mit
  konfigurierbaren Schwellenwerten
- **Fahrzeugbuchung** – Kalenderansicht (genehmigt/ausstehend/abgelehnt/vergangen),
  automatische Konflikterkennung, Moderator-Freigabe
- **Moderator-Bereich** – per Admin-Passwort zusätzlich abgesichert; Dashboard,
  gefilterte Listen, Stammdatenverwaltung (Fahrzeuge, Sitzplätze, Funktionen,
  Einsatz-Zusatzfelder, Personen), Moderator-Zugänge selbst verwalten
- **Benachrichtigungen** – eigener Bereich (getrennt von den Einstellungen) für
  Telegram, E-Mail (SMTP, inkl. Testmail-Button) und Web Push, vollständig über
  den Moderator-Bereich konfigurierbar (keine `.env`-Bearbeitung nötig). Die
  Einsatz-Benachrichtigung wird erst beim Abschluss ausgelöst (nicht bei
  Anlage); optional verschickt sie dabei den PDF-Bericht und den
  Timeline-Verlauf direkt als Anhang/Text in einer einzigen Mail
- **Divera 24/7** – Anbindung (Polling oder Webhook) ebenfalls komplett über den
  Moderator-Bereich konfigurierbar
- **PWA** – installierbar, Service Worker, Icon und Name aus der Konfiguration

Jedes Modul ist einzeln aktivierbar/deaktivierbar und unabhängig davon einzeln
auf der Kiosk-Startseite ein-/ausblendbar.

## Tech-Stack

- **Backend:** Python 3.12, FastAPI (async), SQLAlchemy 2.0, Alembic, PostgreSQL
- **Frontend:** React 18 + TypeScript, Vite, React Router, `react-big-calendar`
  (Fahrzeugbuchungskalender)
- **PDF-Export:** WeasyPrint (HTML/CSS-Templates) für den einzelnen Einsatzbericht
- **Barcodes:** `python-barcode` (Code128, serverseitig als PNG gerendert)
- **Hintergrundjobs:** APScheduler (Divera-Polling, tägliche Archivierung)
- **Deployment:** Docker Compose (Postgres + Backend + Nginx/Frontend)

## Schnellstart (Docker)

### Voraussetzungen

- [Docker](https://docs.docker.com/get-docker/) installiert
- [Docker Compose](https://docs.docker.com/compose/install/) installiert

### Installation

Kopiere diese Befehle und führe sie direkt aus:

```bash
# Repository klonen
git clone https://github.com/tobst96/geratehaus-app.git
cd geratehaus-app

# .env-Datei erstellen und mit zufälligen Secrets füllen
cp .env.example .env

# Secrets generieren und in .env einsetzen
JWT_SECRET=$(openssl rand -hex 32)
COOKIE_SECRET=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -hex 32)

# Secrets in .env eintragen (macOS/Linux)
sed -i.bak "s/JWT_SECRET_KEY=.*/JWT_SECRET_KEY=$JWT_SECRET/" .env
sed -i.bak "s/COOKIE_SECRET_KEY=.*/COOKIE_SECRET_KEY=$COOKIE_SECRET/" .env
sed -i.bak "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$DB_PASSWORD/" .env

# Docker-Container starten
docker compose up -d
```

**Hinweis für Windows (PowerShell):** Verwende statt `sed` folgende Befehle:
```powershell
$env:JWT_SECRET = (openssl rand -hex 32)
$env:COOKIE_SECRET = (openssl rand -hex 32)
$env:DB_PASSWORD = (openssl rand -hex 32)

(Get-Content .env) -replace 'JWT_SECRET_KEY=.*', "JWT_SECRET_KEY=$env:JWT_SECRET" | Set-Content .env
(Get-Content .env) -replace 'COOKIE_SECRET_KEY=.*', "COOKIE_SECRET_KEY=$env:COOKIE_SECRET" | Set-Content .env
(Get-Content .env) -replace 'POSTGRES_PASSWORD=.*', "POSTGRES_PASSWORD=$env:DB_PASSWORD" | Set-Content .env
```

### Zugriff auf die App

Die App ist danach unter `http://localhost:9112` erreichbar.

- **Standardport:** 9112 (über `HTTP_PORT` in `.env` änderbar)
- **Status prüfen:** `docker compose ps`
- **Logs anschauen:** `docker compose logs -f`
- **App stoppen:** `docker compose down`

Beim allerersten Aufruf – solange die Datenbank leer ist und kein Moderator existiert – startet automatisch der **Einrichtungsassistent**.

### Einrichtungsassistent

Der Wizard fragt in vier Schritten die wichtigsten Grunddaten ab:

1. Name der Organisation
2. Logo (optional, PNG oder SVG – PWA-Icons werden automatisch daraus generiert)
3. Primär- und Akzentfarbe
4. Admin-Passwort für den Moderator-Login (mindestens 8 Zeichen)

Danach ist die App sofort einsatzbereit. Der Wizard kann später jederzeit über
den Moderator-Bereich (**Einstellungen → Setup-Wizard erneut ausführen**)
wiederholt werden, etwa bei einer Migration auf eine neue Instanz.

### Erste Schritte nach der Einrichtung

1. **Moderator-Bereich → Stammdaten → Fahrzeuge**: Fahrzeuge anlegen und je
   Fahrzeug die Sitzplätze einrichten (Trupp/Staffel/Gruppe-Vorlage oder frei
   per Drag&Drop positionieren)
2. **Moderator-Bereich → Stammdaten → Personen**: Mitglieder mit Vorname/
   Nachname anlegen, optional Profilbild hochladen
3. **Moderator-Bereich → Barcodes** (oder direkt bei der Person): Barcode pro
   Person erzeugen und ausdrucken – 2 Jahre gültig
4. **Moderator-Bereich → Einstellungen**: Module aktivieren/auf der
   Startseite anzeigen, Divera/Benachrichtigungen konfigurieren

## Konfiguration

Es gibt bewusst zwei getrennte Konfigurationswege:

| Wo | Was | Beispiel |
|---|---|---|
| `.env` | Rein technische/infrastrukturelle Werte, vor dem Start gesetzt | DB-Zugang, JWT-/Cookie-Secret, HTTP-Port |
| Moderator-Bereich (UI) | Fachliche/betriebliche Werte, jederzeit live änderbar | Organisationsname, Farben, Logo, Module, Personen, Fahrzeuge/Sitzplätze, Einsatz-Zusatzfelder, Benachrichtigungskanäle, Divera, Moderator-Zugänge |

Alle Variablen in `.env.example` sind kommentiert. Fachliche Werte gehören
**nicht** in die `.env` – sie werden ausschließlich über den Setup-Wizard bzw.
den Moderator-Bereich gepflegt und landen in der `app_config`-Tabelle.

Der Moderator-Bereich unter **Einstellungen** ist zusätzlich durch eine erneute
Passwortabfrage geschützt, da dort sensible Zugangsdaten (Divera-API-Key)
hinterlegt werden.

### Benachrichtigungen aktivieren

Telegram, E-Mail (SMTP) und Web Push lassen sich vollständig im Moderator-Bereich
unter **Benachrichtigungen** konfigurieren – Bot-Token, SMTP-Zugangsdaten und
VAPID-Schlüssel werden in der Datenbank gespeichert, keine `.env`-Bearbeitung
nötig. Ein "Testmail senden"-Button prüft die SMTP-Konfiguration direkt vor Ort.
Welche Ereignisse (Einsatz abgeschlossen, neues Dienstbuch, neue
Buchungsanfrage, Schwellenwert-Überschreitung) Benachrichtigungen auslösen und
mit welchem Text, lässt sich unter **Einstellungen** steuern. Für Einsätze kann
zusätzlich aktiviert werden, dass die Mail beim Abschluss den PDF-Bericht und
den Timeline-Verlauf direkt enthält.

### Divera-24/7-Integration

Ebenfalls vollständig im Moderator-Bereich unter **Einstellungen → Divera 24/7**
konfigurierbar: Anbindung aktivieren, API-Key/Accesskey hinterlegen und Modus
wählen (Polling, alle 5 Minuten, oder Webhook). Für den Webhook-Modus die URL
`https://<deine-instanz>/api/v1/divera/webhook?accesskey=<dein-Accesskey>` bei
Divera hinterlegen. Welcher Modus zur Verfügung steht, hängt vom gebuchten
Divera-Tarif ab. Änderungen wirken ohne Neustart.

## Lokale Entwicklung (ohne Docker)

### Voraussetzungen

- Python 3.12+
- Node.js 18+ und npm
- PostgreSQL 14+

### Backend Setup

```bash
cd backend

# Virtual Environment erstellen und aktivieren
python3.12 -m venv .venv
source .venv/bin/activate  # macOS/Linux
# oder für Windows: .venv\Scripts\activate

# Abhängigkeiten installieren
pip install -e ".[dev]"

# .env vorbereiten (für lokale PostgreSQL)
cp ../.env.example ../.env

# Datenbankmigration durchführen
alembic upgrade head

# Backend starten (mit Hot-Reload)
uvicorn app.main:app --reload
```

**Backend ist danach unter `http://localhost:8000` erreichbar**
- API-Dokumentation: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Frontend Setup

```bash
cd frontend

# Abhängigkeiten installieren
npm install

# Dev-Server starten
npm run dev
```

**Frontend ist danach unter `http://localhost:5173` erreichbar**

Der Vite-Dev-Server proxyt `/api` und `/uploads` automatisch auf `http://localhost:8000` (konfiguriert in `vite.config.ts`).

## Projektstruktur

```
backend/    FastAPI-App, SQLAlchemy-Modelle, Alembic-Migrationen, Services
frontend/   React + Vite PWA
```

Detaillierter Aufbau innerhalb von `backend/app/` und `frontend/src/`
orientiert sich an fachlichen Domänen (Einsätze, Dienstbuch, Dienststunden,
Buchungen, Personen, Moderator-Bereich) statt an technischen Schichten.

## Lizenz

MIT – siehe [LICENSE](LICENSE). Du darfst Gerätehaus.app frei einsetzen,
verändern und weiterverbreiten, auch kommerziell. Wir freuen uns über einen
Hinweis auf das Projekt, wenn du es einsetzt oder weiterentwickelst.

## Mitwirken

Issues und Pull Requests sind willkommen. Da Gerätehaus.app von beliebigen
Feuerwehren selbst gehostet wird, achte bei Beiträgen besonders darauf, keine
organisationsspezifischen Werte hart im Code zu verankern – siehe die
Designregel oben.
