# Modul „Pressebericht"

Erzeugt zu einem Einsatz einen **Pressebericht als PDF**, versendet ihn per E-Mail an
die Abonnenten und legt ihn im MinIO-Einsatzordner ab. Internes, **an-/abschaltbares**
Modul (nicht mitgliederseitig). Zu finden unter **Module → Pressebericht**.

## Wozu

Nach einem Einsatz soll die für die Presse-/Öffentlichkeitsarbeit zuständige Person
automatisch eine aufbereitete Zusammenfassung erhalten – mit genau den Angaben, die
veröffentlicht werden dürfen, ohne dass jemand die Daten manuell zusammenträgt.

## Empfänger

Der Bericht geht an alle Personen, die das Ereignis **„Pressebericht (PDF)"** in ihren
**Benachrichtigungskanälen** abonniert haben (Personal-Bereich → Person →
Benachrichtigungskanäle, E-Mail-Kanal). Der globale Master-Schalter für das Ereignis
liegt wie üblich unter **Benachrichtigungen**.

## Inhalt konfigurieren

Unter **Module → Pressebericht** lässt sich einzeln festlegen, was der Bericht enthält:

- **Einsatz-Grunddaten** – Titel, Zeitpunkt, Adresse, Meldung, Einsatznummer.
- **Divera-Informationen** – nur bei Einsätzen aus Divera.
- **Zusatzfelder** – jedes Einsatz-Zusatzfeld **einzeln** wählbar; leere Werte werden
  automatisch weggelassen.
- **Teilnehmer** – **Gesamtzahl** und/oder **Namensliste**, getrennt schaltbar.
- **Fahrzeuge** – Auflistung der eingesetzten Fahrzeuge mit ihrer Besatzung.
- **MinIO-Link** – optionaler, **App-interner** Link zum Einsatzordner im
  MinIO-Dateibrowser (Login erforderlich, kein öffentlicher Zugriff). Voraussetzung:
  Modul **MinIO** aktiv und eine **öffentliche Basis-URL** hinterlegt.

## Versandzeitpunkt

Wählbar, wann der Bericht versendet wird:

- **Sofort beim Abschließen** des Einsatzes.
- **Eine bestimmte Zeit nach Abschluss** (z. B. 24 Stunden danach).
- **Täglich zu fester Uhrzeit** – berücksichtigt dann alle bereits **abgeschlossenen**
  Einsätze, die noch keinen Pressebericht haben.

Jeder Einsatz erhält höchstens **einen** Pressebericht (erneuter Versand wird über einen
internen Marker verhindert).

## Ablage & Timeline

- Das PDF wird zusätzlich im **MinIO-Einsatzordner** (`einsatz-<id>/`) mit Datum/Uhrzeit
  im Dateinamen abgelegt (nur bei aktivem MinIO-Modul).
- Der Versand wird in der **Einsatz-Timeline** vermerkt.

## Voraussetzungen

- E-Mail-Versand konfiguriert (**Benachrichtigungen**), damit die PDF-Mail zugestellt
  werden kann.
- Für den optionalen Ordner-Link: **MinIO**-Modul aktiv + öffentliche Basis-URL gesetzt.
