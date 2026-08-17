# Modul „Formular"

Individuelle Formulare erstellen, ausfüllen lassen und Einreichungen zentral
auswerten – z. B. für Rückmeldungen, Anmeldungen, Bewertungen oder interne
Meldungen. Mitgliederseitiges Modul (Kiosk-Kachel + Mitglieder-Login), das der
Admin an-/abschalten kann.

## Kiosk / Mitglieder

- Ist das Modul aktiv und auf der **Startseite** (Kiosk) bzw. für den
  **Außenzugriff** (Mitglieder-Login) freigegeben, erscheint die Kachel
  **„Formulare"**. Sie listet alle **aktiven** Formulare auf.
- Ein Formular wird über `/formular/<id>` ausgefüllt und abgesendet. Jedes Formular
  ist zusätzlich direkt über diesen Link teilbar.
- Feldtypen: **Text (einzeilig/mehrzeilig)**, **Checkbox**, **Ja/Nein**,
  **Sternebewertung** und **Skala** (Maximum je Feld einstellbar), **Zahl**,
  **Datum**, **E-Mail**, **Telefon**, **Dropdown** und **Dropdown mit
  Mehrfachauswahl** sowie **Datei-Upload** (Bild/PDF, max. 10 MB).
- Je Feld optional ein **Hilfetext/Platzhalter**.
- **Pflichtfelder** müssen vor dem Absenden ausgefüllt werden; fehlende Pflichtfelder
  werden verständlich am Feld angezeigt.

## Anmeldung & Zugriff

Pro Formular ist einstellbar, ob es **öffentlich ohne Login** oder **nur nach
Anmeldung** (Mitglieder-Login per Name + PIN, am Kiosk per Barcode/PIN) abgesendet
werden darf. Bei angemeldeten Personen wird die Einreichung der Person zugeordnet;
öffentliche Formulare können anonym ausgefüllt werden.

## Teilbarer Link, QR-Code & Zeitfenster

- Zu jedem Formular gibt es einen **teilbaren Link** (`…/formular/<id>`) plus
  **QR-Code**, beides in der Modul-Unterseite direkt kopier-/nutzbar – z. B. um eine
  Umfrage in einer WhatsApp-Gruppe zu teilen oder als Plakat aufzuhängen. Der Link
  funktioniert, sobald das Formular **aktiv** ist.
- Optional **Startdatum** („aktiv ab") und **Ablaufdatum** (leer = dauerhaft gültig).
  Außerhalb des Fensters ist das Formular nicht absendbar und nicht gelistet.
- Ist bei Ablauf ein **E-Mail-Empfänger** hinterlegt, wird automatisch eine
  **Auswertung** (Zusammenfassung aller Antworten) an diese Adresse gesendet.

## Umfrage-/Anmelde-Optionen

- **Maximale Anzahl Einreichungen** (Kapazität): danach „ausgebucht".
- **Mehrfach-Absenden verhindern**: bei Anmeldepflicht serverseitig pro Person
  erzwungen; bei anonymen Formularen weicher Schutz über den Browser (plus
  Bot-/Spam-Schutz per Honeypot und Rate-Limit).
- **Einwilligungstext** (DSGVO): erzwingt ein Pflicht-Häkchen vor dem Absenden.
- **Danke-Text** nach dem Absenden; optional **Ergebnis öffentlich anzeigen**
  (aggregiert, ohne Freitexte).
- **Automatische Löschung** der Einreichungen nach X Tagen (Aufbewahrungsfrist).

## E-Mail-Benachrichtigung

Je Formular kann ein **eigener E-Mail-Empfänger** hinterlegt werden. Nach jeder
Einreichung geht automatisch eine E-Mail an diese Adresse – mit Formularname,
Zeitpunkt, den übermittelten Antworten und einem Link ins System. (Voraussetzung:
E-Mail-Versand ist in den Benachrichtigungen konfiguriert.)

## Einreichungen & Auswertung

- Alle Einreichungen werden gespeichert (als Snapshot: bleiben auch nach
  Formularänderungen lesbar).
- **Admins** sehen alle Einreichungen auf der Modul-Unterseite „Formulare".
- Pro Formular ist einstellbar, ob die Einreichungen auch für **Gruppenführer/
  Gruppenführer** sichtbar sind. Wenn aktiviert, erscheinen sie unter
  **Listen → Formulare**; sonst bleiben sie admin-intern.
- **Zwischenstand/Auswertung**: Neben den Einzel-Einreichungen gibt es eine
  aggregierte Auswertung (Ø bei Sterne/Skala/Zahl, Anzahl je Dropdown-Option/Ja-Nein,
  Freitext-Antworten) – jederzeit im Admin- und (bei Freigabe) Gruppenführer-Bereich
  einsehbar.
- **CSV-Export** der Einreichungen (Excel-freundlich) und **Formular duplizieren**
  (als Vorlage) auf der Modul-Unterseite.

## Admin (Modul-Unterseite)

Unter **Module → Formular**: Formulare anlegen/bearbeiten/löschen, aktiv/inaktiv
schalten, Login-Pflicht, E-Mail-Empfänger und Gruppenführer-Sichtbarkeit setzen, Felder
verwalten (Typ, Pflicht, Dropdown-Optionen, max. Sternzahl, Reihenfolge) und
Einreichungen einsehen. An/Aus, Kiosk-Anzeige und Außenzugriff werden auf der
Übersichtsseite „Module" geschaltet.

## Datenschutz-Hinweis

Formular-Einreichungen können personenbezogene Daten enthalten (je nach
Formularinhalt und ggf. der zugeordneten Person). Zugriff nur für Admins bzw.
freigegebene Gruppenführer. Details: Datenschutz-Seite der App.
