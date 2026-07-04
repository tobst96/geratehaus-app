# Modul „Kiosk"

Verwaltung der **Kiosk-Tablets** im Gerätehaus. Internes, **immer aktives** Modul.
Zu finden unter **Module → Kiosk**.

## Was ist der Kiosk?

Auf einem Tablet im Gerätehaus läuft die App im **Kiosk-Modus**: eine Startseite mit
Kacheln für die freigegebenen Module (Einsatz, Dienstbuch, Dienststunden,
Fahrzeugbuchung). Statt Login identifizieren sich Personen je Aktion per **Barcode**
(wenn das Barcode-Modul aktiv ist) **oder** per **Namenssuche + PIN**.

## Kiosk-Geräte (Links)

- Jedes Tablet braucht einen **eigenen Kiosk-Link** (`/kiosk/<token>`). Hier anlegen,
  Bezeichnung vergeben, Link kopieren und auf dem Tablet als Lesezeichen/
  Startbildschirm-Symbol hinterlegen.
- Der Token ist das Geheimnis – der Link nicht öffentlich teilen.
- Klick auf das Logo führt auf dem Tablet zurück zur **Kiosk-Startseite** (nicht zur
  Login-Seite).

## „Auf Kiosk anzeigen" – pro Kiosk-Link

Je Kiosk-Link lässt sich einstellen, **welche Module** auf dessen Startseite als
Kachel erscheinen:
- **Ohne Häkchen** „individuell festlegen": es gilt die globale Modul-Einstellung
  „Auf Kiosk anzeigen".
- **Mit Häkchen**: nur die dort angehakten Module erscheinen auf genau diesem Tablet.

So kann z. B. das Tablet in der Fahrzeughalle andere Kacheln zeigen als das im
Schulungsraum.

## Sicherheit

Barcode-vergessen/Name+PIN-Abläufe verlangen zur Identifikation den persönlichen PIN.
Das Tablet ist ansonsten „anonym" (kein dauerhafter Login).
