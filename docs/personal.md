# Modul „Personal"

Zentrale Verwaltung aller Personen (Mitglieder) und ihrer Stammdaten. Internes,
**immer aktives** Modul (nicht abschaltbar). Zu finden unter **Module → Personal**
bzw. über die Navigation (Admin/Gruppenführer mit Freigabe).

## Was das Modul kann

- **Personen anlegen/bearbeiten/löschen** (mit Sicherheitsabfrage beim Löschen).
- **CSV-Import**: mehrere Personen auf einmal aus einer CSV anlegen (Gruppe/Funktion
  per Name zugeordnet, Fehlerreport pro Zeile); Beispieldatei zum Download.
- **Stammdaten** je Person: Vor-/Zwischen-/Nachname, E-Mail, **Profilbild**
  (Upload oder per QR-Code vom Handy), **Gruppe** und **Default-Funktion**.
- **PIN**: persönlicher PIN (nur als Hash gespeichert) zur Identifikation am Kiosk
  (wenn das Barcode-Modul aus ist). „PIN setzen"-Button je Person.
- **Barcode** (nur wenn das Barcode-Modul aktiv ist): Barcode erzeugen / per E-Mail
  senden.
- **Benachrichtigungen**: „Benachrichtigungen aktiv" (Haupt-Schalter je Person) plus
  Benachrichtigungskanäle und Ereignis-Abos (siehe
  [benachrichtigungen.md](benachrichtigungen.md)).
- **Timeline** (Tab „Verlauf"): relevante Änderungen je Person werden protokolliert –
  **nach Ereignistyp filterbar**.
- **Aktivitäts-Ampel**: Personen-Kacheln werden **gelb** bzw. **rot** umrandet, wenn
  sie seit den eingestellten Tagen keinen Einsatz, Dienst oder keine Dienststunden
  mehr hatten (nur aktive Module zählen; ohne Eintrag zählt das Anlagedatum).
  Personen lassen sich als **inaktiv** markieren (Checkbox in der Detailansicht) –
  dann keine Ampel und keine Ampel-Benachrichtigung. Die separate automatische
  Inaktivitäts-Löschung bleibt davon unberührt.

## Liste, Suche, Filter

- **Sticky-Kopfleiste** mit Suche und „+ Person hinzufügen" (bleibt beim Scrollen
  erreichbar).
- Filter: keine E-Mail, kein Profilbild, **ohne PIN**, Benachrichtigungen erlaubt/nicht
  erlaubt, **Abonniert Ereignis** (zeigt, wer welche Mails bekommt; 📧 = aktiver Mail-Kanal).
- Auf dem Handy: Master-Detail – Personenauswahl blendet die Liste aus und zeigt nur
  die Detailansicht („← Zurück").

## Personal-Einstellungen (Button/Modul-Unterseite)

- **Gruppen** verwalten (Züge/Gruppen, denen Personen zugeordnet werden).
- **Sortierung** der Personenliste (Nachname / Vorname / Gruppe+Nachname).
- **Inaktivitäts-Löschung**: Personen ohne neue Timeline-Aktivität werden nach X
  Tagen automatisch gelöscht (7 Tage vorher Warn-Mail; 0 = nie). Unabhängig von der
  Ampel-Markierung „inaktiv".
- **PIN-Erinnerung**: Intervall, in dem Personen ohne PIN (mit E-Mail) an das Setzen
  erinnert werden (nur wenn Barcode-Modul aus).
- **Aktivitäts-Ampel**: Schwellen für gelb/rot (in Tagen) und die zwei
  Ampel-Benachrichtigungen (gelb/rot) an-/abschaltbar. Die Benachrichtigung geht
  **einmalig beim Überschreiten** an die Abonnenten des jeweiligen Ereignisses.

## Datenschutz-Hinweis

Personen enthalten personenbezogene Daten (Name, E-Mail, Bild, PIN-Hash). Zugriff
nur für berechtigte Gruppenführer/Admins. Details zur Verarbeitung: Datenschutz-Seite
der App.
