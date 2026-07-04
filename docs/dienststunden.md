# Modul „Dienststunden"

Erfassung geleisteter Dienststunden je Person und Funktion. Mitgliederseitiges Modul
(Kiosk-Kachel + Mitglieder-Login).

## Kiosk / Mitglieder

- Nach **Barcode** oder **Name + PIN**: Funktion wählen, Stunden über
  Schnellauswahl-Chips oder Stepper (viertelstundengenau) und Datum eintragen.
- „Barcode vergessen": Erfassung per Handy-QR-Code (Name + PIN erforderlich).

## Moderator (Liste/Detail)

- Übersicht der erfassten Dienststunden, manuelle Nacherfassung, Korrekturen.
- **Funktionen** für Dienststunden pflegen (je Funktion eigene Auswertung möglich).

## Schwellenwerte

- Pro Funktion/Person kann ein **Schwellenwert** hinterlegt werden; beim Überschreiten
  wird (falls in [benachrichtigungen.md](benachrichtigungen.md) aktiviert) eine
  Benachrichtigung ausgelöst.

## Admin (Modul-Unterseite)

An/Aus, „Auf Kiosk anzeigen", Außenzugriff und die Dienststunden-Einstellungen
(Funktionen, Schwellenwerte).

## Hinweis

Zeit-/Stichtagsberechnungen laufen in der konfigurierten Zeitzone (Standard
Europe/Berlin), die Datenbank speichert intern UTC.
