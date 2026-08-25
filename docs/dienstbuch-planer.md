# Modul „Dienstbuch Planer"

Verwaltet **wiederkehrende Dienstbuch-Termine** für ein Jahr im Voraus – statt den
Jahresdienstplan jedes Jahr manuell vom Vorjahr zu kopieren und anzupassen. Internes,
**an-/abschaltbares** Modul (nicht mitgliederseitig, reine Gruppenführer-Funktion). Zu
finden unter **Module → Dienstbuch Planer** (Einstellungen) und im Hauptmenü unter
**Dienstbuch Planer** (Kalenderansicht).

## Wozu

Viele wiederkehrende Termine (Unterweisungen, regelmäßige Sitzungen) folgen einem
festen Muster – z. B. „Unterweisung UVV, immer Kalenderwoche 5, Mittwoch, ungerade
Woche". Statt das jedes Jahr neu von Hand einzutragen, legt man die Regel **einmal**
als Vorlage an; die App berechnet daraus automatisch das passende Datum je Jahr.

## Wiederholungsregeln (Vorlagen)

Unter **Module → Dienstbuch Planer** werden Vorlagen angelegt mit:

- **Wiederholungstyp**: jedes Jahr, jeden Monat, alle X Tage/Wochen/Monate/Jahre.
- **Wochentag** und bei „jedes Jahr" zusätzlich **Kalenderwoche** + **Parität**
  (gerade/ungerade Woche) – die Kombination muss in sich konsistent sein (z. B. ist
  Kalenderwoche 5 immer ungerade; eine widersprüchliche Angabe wird abgelehnt).
- **Gültig ab/bis** (Zeitraum, in dem die Regel überhaupt gilt).
- **Mindest-Intervall** (optional): z. B. „muss mindestens alle 6 Monate stattfinden"
  (Ortskommandositzung o. Ä.) – überschreitet die Zeit seit dem letzten **bestätigten**
  Termin dieser Vorlage das Intervall, erscheint sie im Kalender als **überfällig**.
- **Kategorien** (Mehrfachauswahl, siehe unten).

Aus jeder aktiven Vorlage werden die konkreten Termine eines Jahres automatisch
berechnet (einmal jährlich am 1. Dezember fürs Folgejahr, zusätzlich jederzeit manuell
über „Termine für &lt;Jahr&gt; aus Vorlagen aktualisieren" in der Kalenderansicht
anstoßbar). Erzeugt die Regel für ein bestimmtes Jahr rechnerisch ein Datum, das die
Wochentag-/Paritäts-Bedingung verletzt (seltener Randfall, z. B. durch ein
53-Wochen-Jahr), wählt die App automatisch das nächstpassende Datum und vermerkt die
Verschiebung im Verlauf des Termins.

Eine Vorlage lässt sich **deaktivieren** statt löschen – bereits erzeugte Termine
bleiben erhalten, es werden nur keine neuen mehr generiert.

## Kategorien

Frei anlegbare, farbige Kategorien (z. B. „Ausbildung", „Verwaltung"). Ein Termin kann
**mehrere** Kategorien gleichzeitig haben, um z. B. die Belastung bestimmter Funktionen
im Kalender auf einen Blick sichtbar zu machen. Die Kalenderansicht färbt Termine nach
ihrer (ersten) Kategorie.

## Termine: Entwurf → Bestätigt

Jeder generierte oder manuell angelegte Termin startet im Status **Entwurf** (im
Kalender blass/gestrichelt dargestellt). Erst wenn ein Gruppenführer ihn **bestätigt**,
gilt er als verbindlich geplant (kräftige Farbe im Kalender). Ein bestätigter Termin
lässt sich, solange er noch nicht mit einem Dienstbuch verknüpft ist, jederzeit wieder
auf Entwurf zurücksetzen.

**Platzhalter** sind Termine ohne festes Datum („muss dieses Jahr noch stattfinden,
Zeitpunkt aber noch offen") – sie erscheinen als eigene Liste unterhalb des Kalenders
und lassen sich terminieren, indem man sie **per Drag&Drop auf den Kalender zieht**
oder im Termin-Dialog ein Zieldatum (+ optionale Uhrzeit) setzt.

**Einzeltermine** ohne Wiederholungsregel lassen sich direkt über „Neuer Termin"
(Titel + Datum + optionale Uhrzeit) anlegen; bereits geplante Termine lassen sich im
Kalender per Ziehen auf ein anderes Datum verschieben (solange sie noch nicht mit
einem Dienstbuch verknüpft sind).

## Automatische Dienstbuch-Verknüpfung

Erreicht das Zieldatum eines **bestätigten** Termins den heutigen Tag, erzeugt ein
täglicher Hintergrund-Job automatisch einen echten Eintrag im Modul **Dienstbuch**
(Titel übernommen) und verknüpft ihn mit dem Planer-Termin. Teilnehmer und
Atemschutzminuten trägt der Gruppenführer wie gewohnt manuell im Dienstbuch ein –
daran ändert der Planer nichts.

## Berechtigungen

Der Planer steht **allen Gruppenführern** offen (ansehen und bearbeiten) – keine
granularen Einzelrechte nötig. Admins haben wie überall Vollzugriff. Voraussetzung
ist nur, dass das Modul aktiviert ist.

## Verlauf

Jede Änderung an einem Termin (Anlegen, Bearbeiten, Bestätigen, Zurücksetzen,
automatische Dienstbuch-Verknüpfung) wird mit **Zeitpunkt, lesbarem Diff und
handelndem Gruppenführer** protokolliert (sichtbar im Termin-Dialog). Automatisch vom
System ausgelöste Einträge (Jahres-Generierung, Dienstbuch-Verknüpfung durch den
Hintergrund-Job) zeigen keinen Akteur.

## Geplante Erweiterungen (spätere Phasen)

- Feiertage pro Bundesland im Kalenderhintergrund.
- Excel-Export/Import für ein komplettes Jahr (mit QR-Code zum passenden Monat).
- Termine per Divera-API übertragen.
