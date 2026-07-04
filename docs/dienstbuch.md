# Modul „Dienstbuch"

Erfassung von Diensten (z. B. Übungen, Arbeitsdienste) und der Teilnehmer.
Mitgliederseitiges Modul (Kiosk-Kachel + Mitglieder-Login).

## Kiosk / Mitglieder

- Offenes Dienstbuch auswählen und sich per **Barcode** oder **Name + PIN**
  eintragen. Gruppe wird bei der Personenauswahl automatisch vorgewählt.
- „Barcode vergessen": Eintragung per Handy-QR-Code (Name + PIN erforderlich).

## Moderator (Liste/Detail)

- Dienstbücher anlegen, Teilnehmer verwalten, Zeitfenster & Abschluss.
- **PDF-Export** je Dienstbuch; Dienstbuch schließen / wieder öffnen.

## Automatik

- **Auto-Abschluss**: alle noch offenen Dienstbücher werden zur eingestellten Stunde
  (Standard 4 Uhr) automatisch geschlossen. Ein Dienstbuch bleibt bis dahin intern
  „offen", auch wenn sein Zeitfenster in der Kiosk-Liste schon vorbei ist.
- Optional **PDF per Mail** an die Abonnenten bei Abschluss (siehe
  [benachrichtigungen.md](benachrichtigungen.md)).

## Admin (Modul-Unterseite)

An/Aus, „Auf Kiosk anzeigen", Außenzugriff und die Abschluss-Uhrzeit.

## Objektspeicher

Ist das [MinIO-Modul](minio.md) aktiv, wird das Dienstbuch-PDF automatisch flach im
Bucket `dienstbuecher` abgelegt (und ist damit auch im Backup).
