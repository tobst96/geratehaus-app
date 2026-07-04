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
- Feldtypen: **Textfeld (einzeilig)**, **Textfeld (mehrzeilig)**, **Checkbox**,
  **Sternebewertung** (max. Sternzahl je Feld einstellbar), **Dropdown** und
  **Dropdown mit Mehrfachauswahl**.
- **Pflichtfelder** müssen vor dem Absenden ausgefüllt werden; fehlende Pflichtfelder
  werden verständlich am Feld angezeigt.

## Anmeldung & Zugriff

Pro Formular ist einstellbar, ob es **öffentlich ohne Login** oder **nur nach
Anmeldung** (Mitglieder-Login per Name + PIN, am Kiosk per Barcode/PIN) abgesendet
werden darf. Bei angemeldeten Personen wird die Einreichung der Person zugeordnet;
öffentliche Formulare können anonym ausgefüllt werden.

## Teilbarer Link & Ablauf

- Zu jedem Formular gibt es einen **teilbaren Link** (`…/formular/<id>`), den man in
  der Modul-Unterseite direkt kopieren kann – z. B. um eine Umfrage in einer
  WhatsApp-Gruppe zu teilen. Der Link funktioniert, sobald das Formular **aktiv** ist.
- Optional lässt sich ein **Ablaufdatum** setzen (leer = dauerhaft gültig). Nach
  Ablauf ist das Formular nicht mehr absendbar und verschwindet aus der Liste.
- Ist bei Ablauf ein **E-Mail-Empfänger** hinterlegt, wird automatisch eine
  **Auswertung** (Zusammenfassung aller Antworten) an diese Adresse gesendet.

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
  Moderatoren** sichtbar sind. Wenn aktiviert, erscheinen sie unter
  **Listen → Formulare**; sonst bleiben sie admin-intern.
- **Zwischenstand/Auswertung**: Neben den Einzel-Einreichungen gibt es eine
  aggregierte Auswertung (Ø bei Sternebewertung, Anzahl je Dropdown-Option/Ja-Nein,
  Freitext-Antworten) – jederzeit im Admin- und (bei Freigabe) Moderator-Bereich
  einsehbar.

## Admin (Modul-Unterseite)

Unter **Module → Formular**: Formulare anlegen/bearbeiten/löschen, aktiv/inaktiv
schalten, Login-Pflicht, E-Mail-Empfänger und Moderator-Sichtbarkeit setzen, Felder
verwalten (Typ, Pflicht, Dropdown-Optionen, max. Sternzahl, Reihenfolge) und
Einreichungen einsehen. An/Aus, Kiosk-Anzeige und Außenzugriff werden auf der
Übersichtsseite „Module" geschaltet.

## Datenschutz-Hinweis

Formular-Einreichungen können personenbezogene Daten enthalten (je nach
Formularinhalt und ggf. der zugeordneten Person). Zugriff nur für Admins bzw.
freigegebene Moderatoren. Details: Datenschutz-Seite der App.
