# Modul „MinIO" (Objektspeicher)

Das MinIO‑Modul bündelt **eine** Objektspeicher‑Verbindung (MinIO oder jeder
S3‑kompatible Dienst) und legt bei aktivem Modul **erzeugte Dokumente automatisch**
ab. Außerdem kann das [Backup‑Modul](backup.md) diese Verbindung als Ziel
„MinIO Backup" mitnutzen.

Zu finden unter **Module → MinIO** (nur für Admins). Das Modul ist **an‑/abschaltbar**
(auf der Übersichtsseite „Module").

---

## Inhaltsverzeichnis
- [Wozu MinIO?](#wozu-minio)
- [Mitgeliefertes MinIO starten](#mitgeliefertes-minio-starten)
- [Verbindung einrichten](#verbindung-einrichten)
- [Buckets](#buckets)
- [Automatische Dokumentablage](#automatische-dokumentablage)
- [MinIO als Backup-Ziel](#minio-als-backup-ziel)
- [Off-Site-Hinweis](#off-site-hinweis)
- [Sicherheit](#sicherheit)
- [Fehlerbehebung](#fehlerbehebung)

---

## Wozu MinIO?

- **Objektspeicher** (S3) für Dokumente und Backups – selbst gehostet oder extern.
- Bei **aktivem** Modul werden **automatisch** abgelegt:
  - **Einsätze**: pro Einsatz ein **Ordner** mit aktuellen Daten (JSON) und dem
    Bericht‑PDF.
  - **Dienstbücher**: das PDF **flach** in einem Bucket.
- Künftige Module hängen sich am selben Muster ein (eigener Bucket, optional Ordner
  je Objekt).

Das Modul kann eine **externe** S3‑Instanz ansprechen **oder** das mit der App
mitgelieferte **MinIO** (optionales Docker‑Profil).

---

## Mitgeliefertes MinIO starten

MinIO ist als **optionales** Docker‑Compose‑Profil enthalten (läuft nicht
automatisch mit):

```bash
docker compose --profile minio up -d
```

Zugangsdaten in der `.env` setzen (vor dem ersten Start):

```dotenv
MINIO_ROOT_USER=geratehaus
MINIO_ROOT_PASSWORD=<langes-zufälliges-Passwort>
# optionale Ports (Standard 9000/9001)
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001
```

- **S3‑API**: Port **9000** (nutzt die App intern über `http://minio:9000`).
- **Web‑Konsole**: Port **9001** → `http://<server>:9001` (Login mit den
  `MINIO_ROOT_*`‑Werten). Dort lassen sich Buckets/Objekte ansehen.
- Nach einem Rebuild MinIO mit Profil weiterlaufen lassen:
  `docker compose --profile minio up -d --build`.

> Die Konsole (9001) und die API (9000) sind Host‑Ports. Wenn der Server aus dem
> Internet erreichbar ist, diese Ports per **Firewall** auf LAN/VPN beschränken.

---

## Verbindung einrichten

Unter **Module → MinIO → Verbindung**:

| Feld | Mitgeliefertes MinIO | Externes S3 |
|---|---|---|
| **Endpoint** | `http://minio:9000` (interner Docker‑Name!) | z. B. `https://s3.eu-central-1.amazonaws.com` oder leer für AWS‑SDK‑Default |
| **Region** | `us-east-1` | passende Region |
| **Access Key** | `MINIO_ROOT_USER` | Access Key des Anbieters |
| **Secret Key** | `MINIO_ROOT_PASSWORD` | Secret Key des Anbieters |

> Wichtig: Für das mitgelieferte MinIO ist der Endpoint **`http://minio:9000`** –
> **nicht** die Konsolen‑Adresse (`…:9001`) und **nicht** die Host‑IP. Die App
> spricht MinIO im Docker‑Netz unter dem Servicenamen `minio` an.

Mit **„Verbindung testen"** die Zugangsdaten prüfen (listet die Buckets auf).

Das Modul muss unter **Module** **aktiviert** sein, damit die Verbindung und die
automatische Ablage greifen.

---

## Buckets

Drei Bucket‑Namen sind konfigurierbar (Standardwerte vorbelegt); **Buckets werden
bei Bedarf automatisch angelegt**:

- **Backups** (`geratehaus-backups`) – für das Ziel „MinIO Backup".
- **Einsätze** (`einsaetze`) – ein Ordner je Einsatz.
- **Dienstbücher** (`dienstbuecher`) – flach.

---

## Automatische Dokumentablage

Nur bei **aktivem** Modul, best‑effort (ein Ablage‑Fehler bricht den normalen
Ablauf nie ab):

**Einsätze** → Bucket `einsaetze`:
```
einsatz-12/
├─ einsatz.json     (aktueller Stand: Titel, Zeit, Adresse, Meldung,
│                     Einsatznummer, Status, Zusatzfelder, Teilnehmer)
└─ bericht.pdf      (bei Erzeugung/Abschluss – überschreibt = aktuellster Stand)
```
- Der **Ordner wird schon beim Anlegen** des Einsatzes erstellt (auch bei
  Divera‑Import), damit die Struktur von Anfang an existiert.
- `einsatz.json` wird bei Anlage und bei jeder PDF‑Erzeugung aktualisiert.

**Dienstbücher** → Bucket `dienstbuecher`, flach:
```
dienstbuch-7.pdf
```

> Für **künftige Module** ist dieses Muster gedacht: eigener Bucket, bei
> „Objekten mit vielen Dateien" ein Ordner je Objekt, sonst flache Dateien.

---

## Dateibrowser (in der App)

Im MinIO‑Modul gibt es einen eingebauten **Dateibrowser** – Buckets, Ordner und
Dateien lassen sich **direkt in der App** ansehen und **herunterladen**, ohne den
MinIO‑Port nach außen zu öffnen (die App erreicht MinIO intern). Bucket wählen, per
Breadcrumb navigieren, Dateien herunterladen oder löschen. Für den normalen Betrieb
ersetzt das die MinIO‑Konsole.

## MinIO-Dokumente im Backup (Langzeit-Archiv)

Die im Objektspeicher liegenden **Dokumente (Einsätze/Dienstbücher) werden mit ins
Voll‑Backup aufgenommen** (`.ghb`, Kategorie „MinIO‑Dokumente"). So sind sie auch
außer Haus gesichert und langfristig (z. B. 10 Jahre) archiviert. Beim **Import**
lässt sich die Kategorie „MinIO‑Dokumente" gezielt zurück in den Objektspeicher
spielen. Der **Backup‑Bucket selbst** wird dabei **nicht** mitgesichert (keine
Rekursion).

## MinIO als Backup-Ziel

Im **Backup‑Modul** erscheint die Checkbox **„MinIO Backup"** – **nur**, wenn das
MinIO‑Modul aktiv ist. Ist sie gesetzt, schreibt das Backup zusätzlich in den
Backups‑Bucket (über die hier hinterlegte Verbindung). Details zur Sicherung siehe
[backup.md](backup.md).

---

## Off-Site-Hinweis

> Das **mitgelieferte** MinIO läuft auf **demselben Host** wie die App und ist damit
> **kein** Off‑Site‑Backup. Fällt der Server aus, sind App **und** MinIO betroffen.

- Für echte Ausfallsicherheit zusätzlich ein **externes** Ziel wählen (externes S3,
  WebDAV/Nextcloud, SFTP) – oder das MinIO‑`minio_data`‑Volume auf externen/
  replizierten Speicher legen.

---

## Sicherheit

- Access/Secret werden serverseitig gespeichert, in der Oberfläche nur als „gesetzt"
  angezeigt.
- MinIO‑Konsole (9001) und ‑API (9000) nicht ungeschützt ins Internet stellen
  (Firewall/VPN).
- Zugriff auf das Modul ist **Admins** vorbehalten.

---

## Fehlerbehebung

- **„Verbindung testen" schlägt fehl** – Endpoint (intern `http://minio:9000`),
  Access/Secret prüfen; MinIO gestartet? (`docker compose --profile minio up -d`).
- **Konsole nicht erreichbar** – `http://<server>:9001` verwenden (nicht die
  App‑Domain). Ports 9000/9001 müssen erreichbar/freigegeben sein.
- **Keine Dokumente im Bucket** – ist das **Modul aktiv** und sind **Access/Secret**
  gesetzt? Ablage passiert nur bei erzeugten PDFs bzw. Einsatz‑Anlage.
- **Endpoint falsch gesetzt** – häufiger Fehler: die **Konsolen‑URL** (Port 9001)
  statt der **API** eingetragen. Richtig ist die S3‑API (`http://minio:9000`).
