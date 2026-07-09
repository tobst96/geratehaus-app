# Modul „Barcode"

Steuert, **wie** sich Personen am Kiosk identifizieren. Internes, **an-/abschaltbares**
Modul (Standard: **aus**). Zu finden unter **Module → Barcode**.

## Zwei Betriebsarten

- **Barcode-Modul AUS (Standard)**: Identifikation per **Namenssuche + persönlichem
  PIN**. Personen ohne PIN können sich einen Link zum Setzen schicken lassen bzw.
  lösen (ohne E-Mail) eine Gruppenführer-Freigabe aus.
- **Barcode-Modul AN**: Identifikation per **Barcode-Scan** am Kiosk. Der Barcode ist
  dann der „Login" für genau eine Aktion.

## Wenn aktiv

- **Barcodes** je Person erzeugen (im Personal-Modul) und optional per E-Mail senden.
- **Kiosk-Barcodes** und „alle erneuern & senden" auf der Modul-Unterseite.
- **Automatische Erneuerung**: abgelaufene Barcodes werden per Job erneuert und (bei
  aktivierten Benachrichtigungen) neu zugestellt.

## Wenn inaktiv (Namen + PIN)

- Das **Profilbild** erscheint erst nach korrektem PIN.
- **PIN-Erinnerung**: Personen ohne PIN (mit E-Mail) werden im eingestellten Intervall
  an das Setzen erinnert (Intervall im Personal-Modul).

## Bestehende Instanzen

Beim erstmaligen Einführen wird das Barcode-Modul automatisch aktiviert, wenn bereits
Barcodes existieren (Bestandsschutz).
