# Modul „Dienstbuch"

Erfassung von Diensten (z. B. Übungen, Arbeitsdienste) und der Teilnehmer.
Mitgliederseitiges Modul (Kiosk-Kachel + Mitglieder-Login).

## Kiosk / Mitglieder

- Offenes Dienstbuch auswählen und sich per **Barcode** oder **Name + PIN**
  eintragen. Gruppe wird bei der Personenauswahl automatisch vorgewählt.
- „Barcode vergessen": Eintragung per Handy-QR-Code (Name + PIN). Ohne gesetzten
  PIN bleibt die Eintragung möglich, wird aber als „ohne PIN" markiert.

## Gruppenführer (Liste/Detail)

- Dienstbücher anlegen, Teilnehmer verwalten, Zeitfenster & Abschluss.
- **PDF-Export** je Dienstbuch; Dienstbuch schließen / wieder öffnen.
- **Als relevant markieren** – kennzeichnet einen Dienst als relevant
  (Badge „★ relevant"); Grundlage für eine spätere Auswertung der
  Mindest-Dienstbeteiligung (Anzahl relevanter Dienste pro Person).

## Automatik

- **Auto-Abschluss**: alle noch offenen Dienstbücher werden zur eingestellten Stunde
  (Standard 4 Uhr) automatisch geschlossen. Ein Dienstbuch bleibt bis dahin intern
  „offen", auch wenn sein Zeitfenster in der Kiosk-Liste schon vorbei ist.
- Optional **PDF per Mail** an die Abonnenten bei Abschluss (siehe
  [benachrichtigungen.md](benachrichtigungen.md)).

## Zusatzfelder

Frei konfigurierbare Felder je Dienstbuch (z. B. Ausbildungsthema, Art des
Dienstes) – analog zu den Einsatz-Zusatzfeldern. Typen: Text, Mehrzeilig,
Checkbox und **Auswahl** (Dropdown mit konfigurierbaren Optionen). Die Felder
werden beim Anlegen eines Dienstbuchs abgefragt, in der Liste angezeigt und im
**PDF-Export** ausgegeben. Pflege in der Modul-Unterseite (Abschnitt
„Zusatzfelder").

## Admin (Modul-Unterseite)

An/Aus, „Auf Kiosk anzeigen", Außenzugriff, die Abschluss-Uhrzeit und die
**Zusatzfelder**.

## Objektspeicher

Ist das [MinIO-Modul](minio.md) aktiv, wird das Dienstbuch-PDF automatisch flach im
Bucket `dienstbuecher` abgelegt (und ist damit auch im Backup).
