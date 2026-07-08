# Modul „Fahrzeugbuchung"

Reservierung von Fahrzeugen (z. B. für Übungen, Fahrten) mit Kalender und
Moderator-Freigabe. Mitgliederseitiges Modul (Kiosk-Kachel + Mitglieder-Login).

## Kiosk / Mitglieder

- Nach **Barcode** oder **Name + PIN**: buchbares Fahrzeug wählen, Von/Bis und Zweck
  angeben und eine **Buchungsanfrage** stellen.
- „Barcode vergessen": Anfrage per Handy-QR-Code (Name + PIN erforderlich).
- Buchbar sind nur die im Modul [Fahrzeuge](fahrzeuge.md) als **„buchbar"**
  markierten Fahrzeuge.

## Moderator (Buchungsmanagement)

- **Kalender/Liste** aller Buchungen und Anfragen.
- Anfragen **freigeben oder ablehnen** (auch per Ja/Nein-Link aus der
  Benachrichtigungs-Mail).
- Neue Buchungsanfragen lösen (falls aktiviert) eine Benachrichtigung an die
  Moderatoren aus.

## Externe Kalender (iCal)

In der Modul-Unterseite lassen sich öffentliche **iCal-/webcal-URLs** hinterlegen
(eine pro Zeile), z. B. ein geteilter Kalender oder ein Divera-Kalender. Deren
Termine erscheinen im Buchungskalender als **nicht buchbare Fremdtermine**
(grau/gestrichelt) und werden in die **Konfliktprüfung** einbezogen: Eine Buchung,
die einen Fremdtermin überlappt, bleibt möglich, wird aber als Konflikt markiert.
Nicht erreichbare Feeds werden übersprungen und blockieren die Buchung nie.

## Admin (Modul-Unterseite)

An/Aus, „Auf Kiosk anzeigen", Außenzugriff, die Fahrzeugbuchungs-Einstellungen und
die externen iCal-Kalender.

## Hinweis

Überschneidende Buchungen (eigene wie externe) werden erkannt; die Freigabe
entscheidet ein Moderator.
