# Modul „ELW"

Bindet den **Einsatzleitwagen** an: Sobald ein Einsatz angelegt wird, geht automatisch
eine E-Mail an eine feste Adresse mit einem **Login-losen Upload-Link**. Darüber kann
der ELW Dateien (Einsatzberichte, Fotos usw.) in den Einsatz-Ordner im Objektspeicher
hochladen. Internes, **an-/abschaltbares** Modul (nicht mitgliederseitig). Zu finden
unter **Module → ELW**.

## Wozu

Der ELW soll direkt am Einsatzort erzeugte Dokumente ablegen können, ohne einen
App-Login zu haben. Der Zugang ist auf **genau diesen einen Einsatz** und die Dauer,
in der er **offen** ist, begrenzt.

## Einrichtung

- Unter **Module → ELW** die **E-Mail-Adresse des ELW** hinterlegen (genau eine Adresse).
- Modul auf der Modul-Übersicht **aktivieren**.
- Voraussetzungen: aktives **Objektspeicher-Modul (MinIO)** (dort landen die Uploads) und
  konfigurierter **E-Mail-Versand** (Benachrichtigungen), damit die Mail rausgeht.

## Ablauf

- Bei **jeder Einsatz-Anlage** (manuell **und** über Divera, nur bei offenen Einsätzen)
  wird eine Mail an die ELW-Adresse gesendet – mit einem Link der Form
  `…/elw-upload/<token>`.
- Der Link öffnet eine **einfache Upload-Seite ohne Login**: Einsatz-Titel + Dateiauswahl.
  Erlaubt sind **Bilder (PNG/JPEG/WebP) und PDF**, bis **10 MB**.
- Hochgeladene Dateien landen im Einsatz-Ordner unter `einsatz-<id>/uploads/…`; jeder
  Upload wird in der **Einsatz-Timeline** vermerkt.

## Gültigkeit & Sicherheit

- Der Link enthält statt eines Logins ein **signiertes Token** (nicht fälschbar). Er ist
  **nur gültig, solange der Einsatz offen ist** – nach Abschluss zeigt die Seite „Einsatz
  abgeschlossen" (der Upload ist gesperrt).
- Der Upload ist **ratenbegrenzt**; Dateien werden serverseitig geprüft (Magic-Bytes) und
  bei Bildern von Metadaten (EXIF) bereinigt.
- Die MinIO-Zugangsdaten bleiben serverseitig – der Client lädt nur zur App hoch, die die
  Datei dann ablegt.
