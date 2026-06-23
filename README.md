# Gerätehaus.app

Eine selbst hostbare, mobile-first Webanwendung (PWA) für Feuerwehren und ähnliche
Organisationen zur Verwaltung von Einsätzen, Diensten, Dienststunden und
Fahrzeugbuchungen. Mitglieder scannen einen QR-Code im Gerätehaus, ihr Standort
wird geprüft, und sie tragen sich für Einsätze/Dienste/Dienststunden ein – ganz
ohne Login. Ein Moderator-Bereich erlaubt die Verwaltung aller Stammdaten und
Einstellungen.

**Open-Source-Prinzip:** Kein einziger feuerwehr-spezifischer Wert steht hart im
Code. Alles, was von Organisation zu Organisation unterschiedlich ist –
Name, Logo, Farben, Geofence, Module, Schwellenwerte, Fahrzeuge, Funktionen –
wird beim ersten Start über einen Einrichtungsassistenten festgelegt und ist
danach jederzeit über den Moderator-Bereich änderbar.

## Funktionen

- **Einsatztagebuch** – Einsätze manuell oder per Divera-24/7-Import, mit
  Fahrzeug/Funktion/VAB/Atemschutzminuten pro Teilnehmer, PDF-Export
- **Dienstbuch** – schnelles Eintragen in zuletzt eröffnete Dienste
- **Dienststunden** – Erfassung pro Person/Funktion, kumulierte Übersicht mit
  konfigurierbaren Schwellenwerten
- **Fahrzeugbuchung** – Kalenderansicht (genehmigt/ausstehend/abgelehnt/vergangen),
  automatische Konflikterkennung, Moderator-Freigabe
- **Außenzugriff per PIN** – Fahrzeugkalender und eigene Dienststunden auch
  außerhalb des Gerätehauses einsehbar/nutzbar, ohne Standort-Pflicht
- **Moderator-Bereich** – Dashboard, gefilterte Listen mit PDF-Export,
  Stammdatenverwaltung, alle Einstellungen live änderbar
- **Benachrichtigungen** – Telegram, E-Mail und Web Push, pluggable und einzeln
  konfigurierbar
- **PWA** – installierbar, Service Worker, Icon und Name aus der Konfiguration

Jedes der vier Module ist einzeln aktivierbar/deaktivierbar.

## Tech-Stack

- **Backend:** Python 3.12, FastAPI (async), SQLAlchemy 2.0, Alembic, PostgreSQL
- **Frontend:** React 18 + TypeScript, Vite, React Router, `react-big-calendar`,
  Leaflet (Geofence-Karten-Picker)
- **PDF-Export:** WeasyPrint (HTML/CSS-Templates)
- **Hintergrundjobs:** APScheduler (Divera-Polling, tägliche Archivierung)
- **Deployment:** Docker Compose (Postgres + Backend + Nginx/Frontend)

## Schnellstart (Docker)

Voraussetzung: Docker und Docker Compose.

```bash
git clone <repository-url> geratehaus-app
cd geratehaus-app
cp .env.example .env
# .env öffnen und mindestens JWT_SECRET_KEY, COOKIE_SECRET_KEY und
# POSTGRES_PASSWORD auf eigene, zufällige Werte setzen (z. B. `openssl rand -hex 32`)

docker compose up -d
```

Die App ist danach unter `http://localhost` erreichbar (Port über `HTTP_PORT`
in der `.env` änderbar). Beim allerersten Aufruf – solange die Datenbank leer
ist und kein Moderator existiert – startet automatisch der
**Einrichtungsassistent**.

### Einrichtungsassistent

Der Wizard fragt in fünf Schritten die wichtigsten Grunddaten ab:

1. Name der Organisation
2. Logo (optional, PNG oder SVG – PWA-Icons werden automatisch daraus generiert)
3. Primär- und Akzentfarbe
4. Standort des Gerätehauses (Karten-Picker oder "Aktuellen Standort verwenden")
   und Geofence-Radius
5. Admin-Passwort für den Moderator-Login

Danach ist die App sofort einsatzbereit. Der Wizard kann später jederzeit über
den Moderator-Bereich (**Einstellungen → Setup-Wizard erneut ausführen**)
wiederholt werden, etwa bei einer Migration auf eine neue Instanz.

## Konfiguration

Es gibt bewusst zwei getrennte Konfigurationswege:

| Wo | Was | Beispiel |
|---|---|---|
| `.env` | Technische/infrastrukturelle Werte, vor dem Start gesetzt | DB-Zugang, JWT-Secret, Notifier-Zugangsdaten, Divera-API-Key |
| Moderator-Bereich (UI) | Fachliche/betriebliche Werte, jederzeit live änderbar | Organisationsname, Farben, Logo, Geofence, Module, Schwellenwerte, Stammdaten |

Alle Variablen in `.env.example` sind kommentiert. Fachliche Werte gehören
**nicht** in die `.env` – sie werden ausschließlich über den Setup-Wizard bzw.
den Moderator-Bereich gepflegt und landen in der `app_config`-Tabelle.

### Benachrichtigungen aktivieren

Telegram, E-Mail (SMTP) und Web Push lassen sich unabhängig voneinander in der
`.env` aktivieren (`NOTIFIER_*_ENABLED=true` plus die jeweiligen
Zugangsdaten). Welche Ereignisse (neuer Einsatz, neues Dienstbuch, neue
Buchungsanfrage, Schwellenwert-Überschreitung) Benachrichtigungen auslösen und
mit welchem Text, lässt sich im Moderator-Bereich unter **Einstellungen**
steuern.

### Divera-24/7-Integration

Mit `DIVERA_ENABLED=true` und `DIVERA_API_KEY` importiert die App Alarme
entweder per Polling (`DIVERA_MODE=polling`, Intervall über
`DIVERA_POLL_INTERVAL_SECONDS`) oder per Webhook (`DIVERA_MODE=webhook`, URL
`https://<deine-instanz>/api/v1/divera/webhook?accesskey=<DIVERA_API_KEY>` bei
Divera hinterlegen). Welcher Modus zur Verfügung steht, hängt vom gebuchten
Divera-Tarif ab.

## Lokale Entwicklung (ohne Docker)

### Backend

```bash
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp ../.env.example ../.env   # POSTGRES_HOST=localhost setzen, falls Postgres lokal läuft
alembic upgrade head
uvicorn app.main:app --reload
```

API-Dokumentation danach unter `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Der Vite-Dev-Server proxyt `/api` und `/uploads` standardmäßig auf
`http://localhost:8000` (siehe `vite.config.ts`).

## Projektstruktur

```
backend/    FastAPI-App, SQLAlchemy-Modelle, Alembic-Migrationen, Services
frontend/   React + Vite PWA
```

Detaillierter Aufbau innerhalb von `backend/app/` und `frontend/src/`
orientiert sich an fachlichen Domänen (Einsätze, Dienstbuch, Dienststunden,
Buchungen, Moderator-Bereich) statt an technischen Schichten.

## Lizenz

MIT – siehe [LICENSE](LICENSE). Du darfst Gerätehaus.app frei einsetzen,
verändern und weiterverbreiten, auch kommerziell. Wir freuen uns über einen
Hinweis auf das Projekt, wenn du es einsetzt oder weiterentwickelst.

## Mitwirken

Issues und Pull Requests sind willkommen. Da Gerätehaus.app von beliebigen
Feuerwehren selbst gehostet wird, achte bei Beiträgen besonders darauf, keine
organisationsspezifischen Werte hart im Code zu verankern – siehe die
Designregel oben.
