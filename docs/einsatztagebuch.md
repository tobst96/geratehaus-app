# Modul „Einsatztagebuch"

Erfassung, wer an einem Einsatz teilgenommen hat (Sitzplatz-genau), plus
Einsatzbericht als PDF. Mitgliederseitiges Modul (Kiosk-Kachel + Mitglieder-Login).

## Kiosk / Mitglieder (Erfassung)

- **Garage-Ansicht**: Fahrzeuge als Kacheln, dahinter der **Sitzplan** (aus dem
  Modul Fahrzeuge). Freie Sitzplätze antippen, um sich einzutragen.
- **Identifikation**: Barcode-Scan (wenn Barcode-Modul aktiv) **oder** Name + PIN.
  Das **Profilbild** erscheint erst nach korrektem PIN.
- Optionen je Eintrag: **Verdienstausfallbescheinigung**, **Atemschutz angelegt**
  (+ Minuten), Funktion, Bemerkung. Zusätzlich „Einsatzbereit im Feuerwehrhaus" und
  „Auf Anfahrt gewesen".
- **Countdown**: Die Garage-Ansicht schließt nach einer eingestellten Zeit
  automatisch; „Alle eingetragen" plant den Abschluss.
- Die Ansicht ist so gebaut, dass sie **ohne Scrollen** auf das Tablet passt;
  Einsatzdetails ggf. über einen Button als Popup.

## Gruppenführer (Liste/Detail)

- Liste der Einsätze, Detailansicht mit Teilnehmern und Timeline.
- **PDF-Export**, Einsatz **abschließen / wieder öffnen**, **Einsatz löschen**.
- **Zusatzfelder** (konfigurierbar) für den Einsatzbericht.

## Automatik

- **Divera-Import**: neue Alarme werden automatisch als Einsatz angelegt (siehe
  [divera.md](divera.md)); die Divera-Alarmzeit wird als Zeitstempel übernommen.
- **Auto-Abschluss**: offene, inaktive Einsätze werden zur eingestellten Stunde
  automatisch abgeschlossen.

## Jahresstatistik

Im Einsatztagebuch wird die Zahl der Einsätze des laufenden Jahres angezeigt und
mit dem Vorjahr **zum selben Stichtag** (gleicher Kalendertag) verglichen –
z. B. „2026: 50 Einsätze +4". Wurde die App mitten im Jahr eingeführt, kann in der
Modul-Unterseite ein **Startwert** (bereits abgearbeitete Einsätze) für ein Jahr
hinterlegt werden; er fließt in die Zählung ein.

## Admin (Modul-Unterseite)

An/Aus, „Auf Kiosk anzeigen", Außenzugriff sowie die Zusatzfeld-,
Countdown-/Abschluss- und Jahresstatistik-Einstellungen (Startwert) des Moduls.

## Objektspeicher

Ist das [MinIO-Modul](minio.md) aktiv, wird je Einsatz automatisch ein Ordner mit
`einsatz.json` und `bericht.pdf` angelegt (und ist damit auch im Backup).
