# Modul „Backup"

Vollständige Sicherung und Wiederherstellung einer Gerätehaus.app-Instanz –
**alle Daten** (Datenbank) **und alle Dateien** (Logo, Personenbilder, Uploads) in
**einer verschlüsselten Datei** (`.ghb`). Damit lässt sich eine Instanz jederzeit
per Import wieder auf denselben Stand bringen.

Zu finden im Moderator-Bereich unter **Module → Backup** (nur für Admins).

---

## Inhaltsverzeichnis
- [Kurzüberblick](#kurzüberblick)
- [Wichtig zuerst: Passphrase](#wichtig-zuerst-passphrase)
- [Zeitplan & Aufbewahrung](#zeitplan--aufbewahrung)
- [Ablageziele](#ablageziele)
- [Off-Site: ein Backup gehört außer Haus](#off-site-ein-backup-gehört-außer-haus)
- [Backup jetzt erstellen & Browser](#backup-jetzt-erstellen--browser)
- [Wiederherstellen (Import)](#wiederherstellen-import)
- [Fehler-Benachrichtigung & Monitoring](#fehler-benachrichtigung--monitoring)
- [Sicherheit](#sicherheit)
- [Sicherung außerhalb des Containers (Host-Mount)](#sicherung-außerhalb-des-containers-host-mount)
- [Fehlerbehebung](#fehlerbehebung)

---

## Kurzüberblick

Ein Backup ist eine **ZIP-Datei** (Endung `.ghb`), die enthält:
- `manifest.json` – Metadaten (Version, Zeitpunkt, Tabellen + Anzahl)
- `db/<tabelle>.json` – **jede** Datenbanktabelle als JSON
- `files/uploads/…` – **alle** hochgeladenen Dateien (Logo, Bilder …)

Die Datei wird mit **AES‑256‑GCM** verschlüsselt (Passphrase). So kann sie
gefahrlos auch außer Haus (Cloud, NAS) liegen.

Ein Backup kann **automatisch** (Zeitplan) oder **manuell** (Button
„Jetzt Backup erstellen") entstehen und wird an **alle aktiven Ziele** geschrieben.

---

## Wichtig zuerst: Passphrase

> **Ohne Passphrase ist kein Restore möglich.** Backups enthalten sensible Daten
> (Passwort‑ und PIN‑Hashes, E‑Mail‑Adressen). Setze deshalb **immer** eine
> Passphrase und **bewahre sie sicher auf** (Passwortmanager).

- Feld **Verschlüsselungs‑Passphrase** in den Backup‑Einstellungen.
- Ist keine Passphrase gesetzt, werden Backups **unverschlüsselt** abgelegt (nicht
  empfohlen).
- Die Passphrase kann geändert werden – **ältere Backups brauchen dann weiterhin
  die alte Passphrase** zum Import.

---

## Zeitplan & Aufbewahrung

- **Uhrzeit** (Stunde/Minute) und **Wochentage** wählen, an denen automatisch
  gesichert wird. Der Job prüft alle 15 Minuten und erstellt **höchstens ein
  Backup pro Tag** (mit Nachhol‑Logik, falls der Server zur geplanten Zeit aus war).
- **Maximale Anzahl aufbewahrter Backups je Ziel**: Beim Überschreiten wird das
  **älteste** automatisch gelöscht (verhindert unendlich viele Dateien).

---

## Ablageziele

Mehrere Ziele können gleichzeitig aktiv sein; das Backup wird an **jedes**
geschrieben. **Fällt ein Ziel aus** (z. B. WebDAV nicht erreichbar), werden die
anderen trotzdem gesichert – das Backup gilt nur dann als fehlgeschlagen, wenn
**alle** Ziele scheitern.

| Ziel | Beschreibung | Off‑Site? |
|---|---|---|
| **Lokaler Ordner / Mount** | Pfad im Container (Standard `/app/backups`). Per Host‑Bind‑Mount auch außerhalb sicherbar. | nur mit Bind‑Mount auf externes Medium |
| **WebDAV** | Nextcloud / ownCloud (URL, Benutzer, App‑Token, Unterordner). Verschachtelte Ordner werden angelegt. | ja |
| **S3‑kompatibel** | AWS S3, Backblaze B2, Wasabi oder **externes** MinIO (Endpoint, Bucket, Keys). | ja |
| **SFTP / SSH** | Eigener VPS/NAS (Host, Port, Benutzer, Passwort, Verzeichnis). | ja |
| **E‑Mail‑Anhang** | Backup als Anhang an die Benachrichtigungs‑Empfänger. Nur für **kleine** Instanzen (Anhang‑Größe). | ja |
| **MinIO Backup** | Nutzt die Verbindung des **Moduls „MinIO"** (siehe [minio.md](minio.md)). Nur sichtbar, wenn das MinIO‑Modul aktiv ist. | nur wenn MinIO extern/repliziert |

---

## Off-Site: ein Backup gehört außer Haus

> Ein Backup schützt nur dann vor Server‑/Plattenausfall, wenn eine **Kopie
> außerhalb des Hosts** liegt.

- Rein **lokale** Ziele (oder ein **auf demselben Host** mitgeliefertes MinIO)
  schützen **nicht** vor Ausfall/Diebstahl/Plattendefekt des Servers.
- Aktiviere mindestens **ein externes Ziel**: WebDAV (Nextcloud), SFTP/externes S3
  – oder den lokalen Ordner als Host‑Bind‑Mount auf ein NAS/Cloud‑Sync legen.

---

## Backup jetzt erstellen & Browser

- **„Jetzt Backup erstellen"** (oben) löst sofort ein Backup an alle aktiven Ziele
  aus.
- Der **Backup‑Browser** listet alle Backups mit **Datum, Größe, Zielen, Inhalt
  (Datensätze/Dateien) und Status**. Fehlt die physische Datei, wird das angezeigt.
- Pro Eintrag: **Download** (lädt die verschlüsselte `.ghb`) und **Löschen**.

---

## Wiederherstellen (Import)

1. **Datei hochladen**: die `.ghb`‑Datei wählen. Bei abweichender Passphrase diese
   im Feld angeben (sonst wird die gespeicherte genutzt).
2. **Analysieren**: die Datei wird entschlüsselt und der Inhalt gelesen (noch **kein**
   Schreiben). Es erscheinen die **Kategorien** mit Anzahl:
   - Konfiguration & Branding, Dateien (Logo/Bilder), Personal & Stammdaten,
     Fahrzeuge, Zugänge & Berechtigungen, Einsätze, Dienstbücher, Dienststunden,
     Fahrzeugbuchungen, Benachrichtigungen, Tokens.
3. **Auswahl treffen**: nur bestimmte Bereiche **oder alles** importieren.
4. **Modus wählen**:
   - **Ersetzen** – die gewählten Bereiche werden **komplett überschrieben**
     (vorhandene Daten des Bereichs gelöscht, dann der Backup‑Stand eingespielt).
     Ergibt einen echten 1:1‑Stand.
   - **Zusammenführen** – nur **fehlende** Datensätze werden ergänzt, Vorhandenes
     bleibt.
5. **Import starten**.

> ⚠️ **Achtung:** „Ersetzen" ist destruktiv. Werden **Zugänge/Berechtigungen** oder
> **Konfiguration/Branding** importiert, ändern sich ggf. Login und Erscheinungsbild
> auf den Stand des Backups. Für eine **vollständige** Wiederherstellung „alles" +
> „Ersetzen" wählen.

---

## Fehler-Benachrichtigung & Monitoring

- **Bei fehlgeschlagenem Backup Admins per E‑Mail benachrichtigen** (Checkbox):
  Die Mail enthält **erfolgreiche vs. fehlgeschlagene Ziele** (mit Fehlermeldung),
  Backup‑Datei, Zeitpunkt, App‑Version und Server. Auch **Teilfehler** (ein Ziel
  fehlgeschlagen, andere ok) werden gemeldet.
- **Sentry / Fehlerberichte:** Ist unter **Einstellungen → Fehlerberichte** aktiviert
  (Standard aus, keine Personendaten), gehen **echte Code‑/Serverfehler** zusätzlich
  automatisch ans Monitoring. Normales Verhalten wie falsche Login‑Daten (401) wird
  **nicht** gemeldet.

---

## Sicherheit

- Backups enthalten **Passwort‑/PIN‑Hashes** und E‑Mail‑Adressen → **immer eine
  Passphrase** setzen, besonders bei externen Zielen (Cloud/WebDAV).
- Zugangsdaten der Ziele (WebDAV‑/SFTP‑/S3‑Secrets) werden serverseitig gespeichert
  und in der Oberfläche nur als „gesetzt" angezeigt.
- Der Zugriff auf das Modul ist **Admins** vorbehalten.

---

## Sicherung außerhalb des Containers (Host-Mount)

Damit die lokalen Backups auch außerhalb des Containers liegen, den Zielordner als
**Host‑Bind‑Mount** einhängen. In `docker-compose.yml` beim `backend`‑Service statt
des benannten Volumes z. B.:

```yaml
    volumes:
      - uploads:/app/uploads
      - /pfad/auf/host/backups:/app/backups   # <— Backups landen auf dem Host
      - ./update-signal:/app/update-signal
```

Diesen Host‑Pfad kann dann ein NAS/rsync/Cloud‑Sync abholen → Off‑Site.

---

## Fehlerbehebung

- **„Kein Backup‑Ziel aktiv."** – Mindestens ein Ziel aktivieren.
- **WebDAV‑Upload fehlgeschlagen (404/401)** – URL/Benutzer/Token prüfen; die URL
  ist die WebDAV‑Basis (Nextcloud: `…/remote.php/dav/files/<user>`), nicht die
  Weboberfläche. Verschachtelte Zielordner werden automatisch angelegt.
- **S3/MinIO‑Fehler** – Endpoint, Bucket, Access/Secret prüfen. Für das
  mitgelieferte MinIO ist der Endpoint intern **`http://minio:9000`** (nicht die
  Konsolen‑Adresse). Siehe [minio.md](minio.md).
- **Import: „Falsche Passphrase oder beschädigte Datei."** – Passphrase des
  **jeweiligen** Backups verwenden (nicht die aktuelle, falls zwischenzeitlich
  geändert).
- **Kein Restore möglich, Passphrase verloren** – Backups sind dann nicht mehr
  entschlüsselbar. Passphrase deshalb immer sichern.
