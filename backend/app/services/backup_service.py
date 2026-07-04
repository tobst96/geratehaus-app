"""Backup-Modul: strukturierter, verschlüsselter Voll-Export (DB + Dateien) und
selektiver Import. Format: ZIP (manifest.json + db/<tabelle>.json + files/uploads/…),
AES-256-GCM-verschlüsselt (Endung .ghb).

Die Serialisierung läuft generisch über `Base.metadata` – neue Tabellen werden
automatisch mitgesichert. Die Kategorien (KATEGORIEN) bündeln Tabellen für den
selektiven Import; jede Tabelle (außer `backups`) gehört genau zu einer Kategorie.
"""

import base64
import io
import json
import secrets
import zipfile
from datetime import date, datetime, timezone
from decimal import Decimal
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path
from uuid import UUID

import httpx
import structlog
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
from sqlalchemy import Date, DateTime, LargeBinary, delete, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.base import Base
from app.models.backup import Backup
from app.services.config_service import config_service
from app.services.notifier.email import EmailNotifier

logger = structlog.get_logger(__name__)

MAGIC = b"GHBACKUP1"
DATEI_ENDUNG = ".ghb"
# Diese Tabelle beschreibt die Backups selbst – nicht mitsichern/-importieren.
EXCL_TABELLEN = {"backups"}

# (key, label, [tabellen]). "dateien" ist eine Sonder-Kategorie für den upload_dir.
KATEGORIEN: list[tuple[str, str, list[str]]] = [
    ("konfiguration", "Konfiguration & Branding", ["app_config"]),
    ("dateien", "Dateien (Logo, Bilder)", []),
    (
        "personal",
        "Personal & Stammdaten",
        ["personen", "gruppen", "funktionen_dienststunden", "funktionen_einsatz",
         "namens_abweichungen", "person_bild_reservierungen"],
    ),
    ("fahrzeuge", "Fahrzeuge & Sitzplätze", ["fahrzeuge"]),
    ("zugaenge", "Zugänge & Berechtigungen", ["moderatoren", "berechtigungen", "module"]),
    (
        "einsaetze",
        "Einsätze",
        ["einsaetze", "einsatz_personen", "einsatz_ereignisse", "einsatz_feld_definitionen"],
    ),
    (
        "dienstbuecher",
        "Dienstbücher",
        ["dienstbuecher", "dienstbuch_personen", "dienstbuch_reservierungen"],
    ),
    (
        "dienststunden",
        "Dienststunden",
        ["dienststunden", "dienststunden_uebernahmen", "dienststunden_reservierungen"],
    ),
    (
        "fahrzeugbuchungen",
        "Fahrzeugbuchungen",
        ["fahrzeug_buchungen", "fahrzeugbuchung_reservierungen", "buchung_aktion_tokens"],
    ),
    (
        "benachrichtigungen",
        "Benachrichtigungen & Timeline",
        ["benachrichtigungskanaele", "person_ereignis_abos", "push_subscriptions", "person_ereignisse"],
    ),
    (
        "tokens",
        "Tokens & Kurzlebiges",
        ["barcode_tokens", "fahrzeug_tokens", "kiosk_tokens", "pin_setzen_tokens",
         "person_freigabe_tokens", "mitglied_login_reservierungen", "sitzplatz_reservierungen",
         "divera_vorschlaege"],
    ),
]

_KATEGORIE_LABEL = {k: label for k, label, _ in KATEGORIEN}
_TABELLE_ZU_KATEGORIE = {t: k for k, _, ts in KATEGORIEN for t in ts}

# Temporärer Cache entschlüsselter Uploads für den Analyse→Import-Ablauf (im RAM,
# damit keine Klartext-Backups auf der Platte liegen).
_import_cache: dict[str, bytes] = {}


class BackupFehler(Exception):
    pass


def _app_version() -> str:
    try:
        return version("geratehaus-app")
    except PackageNotFoundError:
        return "unbekannt"


# --- Serialisierung ----------------------------------------------------------


def _json_default(o):
    if isinstance(o, (datetime, date)):
        return o.isoformat()
    if isinstance(o, (bytes, bytearray)):
        return base64.b64encode(bytes(o)).decode()
    if isinstance(o, Decimal):
        return float(o)
    if isinstance(o, UUID):
        return str(o)
    raise TypeError(f"nicht serialisierbar: {type(o)}")


def _wert_fuer_db(table, spalte: str, wert):
    if wert is None:
        return None
    col = table.columns.get(spalte)
    if col is None:
        return wert
    t = col.type
    if isinstance(t, DateTime) and isinstance(wert, str):
        return datetime.fromisoformat(wert)
    if isinstance(t, Date) and isinstance(wert, str):
        return date.fromisoformat(wert)
    if isinstance(t, LargeBinary) and isinstance(wert, str):
        return base64.b64decode(wert)
    return wert


def _sicherbare_tabellen():
    return [t for t in Base.metadata.sorted_tables if t.name not in EXCL_TABELLEN]


# --- Verschlüsselung ---------------------------------------------------------


def _key(passphrase: str, salt: bytes) -> bytes:
    return Scrypt(salt=salt, length=32, n=2**14, r=8, p=1).derive(passphrase.encode())


def _verschluesseln(daten: bytes, passphrase: str) -> bytes:
    salt = secrets.token_bytes(16)
    nonce = secrets.token_bytes(12)
    ct = AESGCM(_key(passphrase, salt)).encrypt(nonce, daten, None)
    return MAGIC + salt + nonce + ct


def _entschluesseln(blob: bytes, passphrase: str) -> bytes:
    if blob[:2] == b"PK":  # unverschlüsseltes ZIP
        return blob
    if not blob.startswith(MAGIC):
        raise BackupFehler("Unbekanntes Dateiformat.")
    off = len(MAGIC)
    salt, nonce, ct = blob[off:off + 16], blob[off + 16:off + 28], blob[off + 28:]
    try:
        return AESGCM(_key(passphrase, salt)).decrypt(nonce, ct, None)
    except Exception as exc:  # noqa: BLE001
        raise BackupFehler("Falsche Passphrase oder beschädigte Datei.") from exc


# --- ZIP bauen ---------------------------------------------------------------


async def _baue_zip(db: AsyncSession) -> tuple[bytes, dict]:
    puffer = io.BytesIO()
    tabellen_info: list[dict] = []
    with zipfile.ZipFile(puffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for table in _sicherbare_tabellen():
            rows = (await db.execute(select(table))).mappings().all()
            daten = [dict(r) for r in rows]
            zf.writestr(f"db/{table.name}.json", json.dumps(daten, default=_json_default, ensure_ascii=False))
            tabellen_info.append({"name": table.name, "anzahl": len(daten)})

        upload = Path(settings.upload_dir)
        datei_anzahl = 0
        if upload.exists():
            for p in sorted(upload.rglob("*")):
                if p.is_file():
                    zf.writestr(f"files/uploads/{p.relative_to(upload).as_posix()}", p.read_bytes())
                    datei_anzahl += 1

        manifest = {
            "schema_version": 1,
            "app_version": _app_version(),
            "erstellt_am": datetime.now(timezone.utc).isoformat(),
            "tabellen": tabellen_info,
            "datei_anzahl": datei_anzahl,
        }
        zf.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False))

    zusammenfassung = {
        "app_version": manifest["app_version"],
        "datei_anzahl": datei_anzahl,
        "tabellen": tabellen_info,
        "datensaetze_gesamt": sum(t["anzahl"] for t in tabellen_info),
    }
    return puffer.getvalue(), zusammenfassung


# --- Ziele -------------------------------------------------------------------


class LokalesZiel:
    name = "lokal"

    def __init__(self, pfad: str):
        self.pfad = Path(pfad)

    async def speichern(self, dateiname: str, daten: bytes) -> None:
        self.pfad.mkdir(parents=True, exist_ok=True)
        (self.pfad / dateiname).write_bytes(daten)

    async def liste(self) -> list[str]:
        if not self.pfad.exists():
            return []
        return sorted(p.name for p in self.pfad.glob(f"*{DATEI_ENDUNG}"))

    async def lese(self, dateiname: str) -> bytes:
        return (self.pfad / dateiname).read_bytes()

    async def loeschen(self, dateiname: str) -> None:
        ziel = self.pfad / dateiname
        if ziel.exists():
            ziel.unlink()

    def existiert(self, dateiname: str) -> bool:
        return (self.pfad / dateiname).exists()


class WebDavZiel:
    name = "webdav"

    def __init__(self, basis_url: str, user: str, passwort: str, unterordner: str):
        self.basis = basis_url.rstrip("/") + "/" + unterordner.strip("/")
        self.auth = (user, passwort)

    def _url(self, dateiname: str) -> str:
        return f"{self.basis}/{dateiname}"

    async def speichern(self, dateiname: str, daten: bytes) -> None:
        async with httpx.AsyncClient(auth=self.auth, timeout=120) as client:
            await client.request("MKCOL", self.basis)  # Ordner sicherstellen (409 wenn vorhanden – ok)
            r = await client.put(self._url(dateiname), content=daten)
            if r.status_code >= 400:
                raise BackupFehler(f"WebDAV-Upload fehlgeschlagen ({r.status_code}).")

    async def liste(self) -> list[str]:
        async with httpx.AsyncClient(auth=self.auth, timeout=60) as client:
            r = await client.request("PROPFIND", self.basis, headers={"Depth": "1"})
            if r.status_code >= 400:
                return []
            import re

            namen = re.findall(r"<[^>]*href>([^<]+)</", r.text)
            return sorted(
                n.rstrip("/").rsplit("/", 1)[-1] for n in namen if n.rstrip("/").endswith(DATEI_ENDUNG)
            )

    async def lese(self, dateiname: str) -> bytes:
        async with httpx.AsyncClient(auth=self.auth, timeout=120) as client:
            r = await client.get(self._url(dateiname))
            r.raise_for_status()
            return r.content

    async def loeschen(self, dateiname: str) -> None:
        async with httpx.AsyncClient(auth=self.auth, timeout=60) as client:
            await client.delete(self._url(dateiname))


async def _aktive_ziele(db: AsyncSession) -> list:
    ziele: list = []
    if await config_service.get(db, "backup_lokal_aktiv", True):
        ziele.append(LokalesZiel(str(await config_service.get(db, "backup_lokal_pfad", "/app/backups"))))
    if await config_service.get(db, "backup_webdav_aktiv", False):
        url = str(await config_service.get(db, "backup_webdav_url", ""))
        if url:
            ziele.append(
                WebDavZiel(
                    url,
                    str(await config_service.get(db, "backup_webdav_user", "")),
                    str(await config_service.get(db, "backup_webdav_passwort", "")),
                    str(await config_service.get(db, "backup_webdav_pfad", "geratehaus-backups")),
                )
            )
    return ziele


async def _retention(db: AsyncSession, ziel) -> None:
    maximal = int(await config_service.get(db, "backup_max_anzahl", 7))
    if maximal <= 0:
        return
    vorhanden = await ziel.liste()
    for alt in vorhanden[:-maximal]:  # Liste ist sortiert (Dateiname = Zeitstempel)
        try:
            await ziel.loeschen(alt)
        except Exception:  # noqa: BLE001
            logger.warning("backup_retention_loeschen_fehlgeschlagen", datei=alt, ziel=ziel.name)


# --- Export ------------------------------------------------------------------


async def erstelle_backup(db: AsyncSession, ausloeser: str = "manuell") -> Backup:
    dateiname = f"geratehaus-backup-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}{DATEI_ENDUNG}"
    try:
        zip_bytes, zusammenfassung = await _baue_zip(db)
        passphrase = str(await config_service.get(db, "backup_passphrase", ""))
        verschluesselt = bool(passphrase)
        daten = _verschluesseln(zip_bytes, passphrase) if verschluesselt else zip_bytes

        ziele = await _aktive_ziele(db)
        if not ziele:
            raise BackupFehler("Kein Backup-Ziel aktiv.")
        geschrieben: list[str] = []
        for ziel in ziele:
            await ziel.speichern(dateiname, daten)
            await _retention(db, ziel)
            geschrieben.append(ziel.name)

        backup = Backup(
            dateiname=dateiname,
            groesse_bytes=len(daten),
            ziele=",".join(geschrieben),
            ausloeser=ausloeser,
            status="ok",
            verschluesselt=verschluesselt,
            zusammenfassung=zusammenfassung,
        )
        db.add(backup)
        await db.commit()
        await db.refresh(backup)
        logger.info("backup_erstellt", dateiname=dateiname, ziele=geschrieben, ausloeser=ausloeser)
        return backup
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        backup = Backup(
            dateiname=dateiname, ausloeser=ausloeser, status="fehler", fehlermeldung=str(exc),
        )
        db.add(backup)
        await db.commit()
        if await config_service.get(db, "backup_fehler_mail_aktiv", False):
            await _fehler_mail(db, str(exc))
        logger.warning("backup_fehlgeschlagen", dateiname=dateiname, fehler=str(exc))
        raise BackupFehler(str(exc)) from exc


async def _fehler_mail(db: AsyncSession, fehler: str) -> None:
    empfaenger_roh = str(await config_service.get(db, "notifier_email_recipients", ""))
    empfaenger = [e.strip() for e in empfaenger_roh.split(",") if e.strip()]
    if not empfaenger:
        return
    notifier = EmailNotifier()
    for addr in empfaenger:
        try:
            await notifier.send_an(db, addr, "Backup fehlgeschlagen", f"Das automatische Backup ist fehlgeschlagen:\n\n{fehler}")
        except Exception:  # noqa: BLE001
            logger.warning("backup_fehler_mail_fehlgeschlagen", empfaenger=addr)


# --- Liste / Download / Löschen (Browser) ------------------------------------


async def datei_lesen(db: AsyncSession, backup: Backup) -> bytes:
    """Liest die Backup-Datei aus dem ersten Ziel, das sie hat (lokal bevorzugt)."""
    for ziel in await _aktive_ziele(db):
        try:
            if isinstance(ziel, LokalesZiel) and not ziel.existiert(backup.dateiname):
                continue
            return await ziel.lese(backup.dateiname)
        except Exception:  # noqa: BLE001
            continue
    raise BackupFehler("Backup-Datei in keinem Ziel gefunden.")


async def backup_loeschen(db: AsyncSession, backup: Backup) -> None:
    for ziel in await _aktive_ziele(db):
        try:
            await ziel.loeschen(backup.dateiname)
        except Exception:  # noqa: BLE001
            pass
    await db.delete(backup)
    await db.commit()


async def datei_vorhanden(db: AsyncSession, dateiname: str) -> bool:
    for ziel in await _aktive_ziele(db):
        if isinstance(ziel, LokalesZiel) and ziel.existiert(dateiname):
            return True
    return False


# --- Analyse & Import --------------------------------------------------------


def _kategorien_aus_manifest(manifest: dict) -> list[dict]:
    anzahl_je_tabelle = {t["name"]: t["anzahl"] for t in manifest.get("tabellen", [])}
    ergebnis: list[dict] = []
    for key, label, tabellen in KATEGORIEN:
        if key == "dateien":
            anzahl = int(manifest.get("datei_anzahl", 0))
        else:
            anzahl = sum(anzahl_je_tabelle.get(t, 0) for t in tabellen)
        ergebnis.append({"key": key, "label": label, "anzahl": anzahl})
    return ergebnis


def analysiere(blob: bytes, passphrase: str) -> tuple[str, dict, list[dict]]:
    """Entschlüsselt, liest NUR das Manifest, legt die Klartext-ZIP-Bytes unter
    einem Token im RAM ab und liefert (token, manifest, kategorien)."""
    zip_bytes = _entschluesseln(blob, passphrase)
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        if "manifest.json" not in zf.namelist():
            raise BackupFehler("Keine gültige Backup-Datei (Manifest fehlt).")
        manifest = json.loads(zf.read("manifest.json"))
    token = secrets.token_urlsafe(16)
    _import_cache[token] = zip_bytes
    return token, manifest, _kategorien_aus_manifest(manifest)


async def importiere(db: AsyncSession, token: str, kategorien: list[str], modus: str) -> dict:
    zip_bytes = _import_cache.get(token)
    if zip_bytes is None:
        raise BackupFehler("Analyse abgelaufen – bitte Datei erneut hochladen.")

    alle = "alles" in kategorien
    gewaehlte_tabellen: set[str] = set()
    dateien_gewaehlt = alle or "dateien" in kategorien
    for key, _label, tabellen in KATEGORIEN:
        if alle or key in kategorien:
            gewaehlte_tabellen.update(tabellen)

    tabellen_reihenfolge = [t for t in _sicherbare_tabellen() if t.name in gewaehlte_tabellen]
    datensaetze = 0

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        # Ersetzen: betroffene Tabellen zuerst leeren (umgekehrte FK-Reihenfolge).
        if modus == "ersetzen":
            for table in reversed(tabellen_reihenfolge):
                await db.execute(delete(table))

        for table in tabellen_reihenfolge:
            pfad = f"db/{table.name}.json"
            if pfad not in zf.namelist():
                continue
            rows = json.loads(zf.read(pfad))
            for row in rows:
                werte = {k: _wert_fuer_db(table, k, v) for k, v in row.items() if k in table.columns}
                if modus == "zusammenfuehren":
                    # Vorhandene Datensätze (gleicher PK) behalten, nur fehlende ergänzen.
                    stmt = pg_insert(table).values(**werte).on_conflict_do_nothing()
                else:
                    stmt = table.insert().values(**werte)
                await db.execute(stmt)
                datensaetze += 1

        # Sequenzen nachziehen, damit künftige Inserts nicht mit importierten IDs kollidieren.
        for table in tabellen_reihenfolge:
            if "id" in table.columns:
                await db.execute(
                    text(
                        f"SELECT setval(pg_get_serial_sequence('{table.name}', 'id'), "
                        f"GREATEST((SELECT COALESCE(MAX(id), 1) FROM {table.name}), 1))"
                    )
                )

        dateien = 0
        if dateien_gewaehlt:
            upload = Path(settings.upload_dir)
            upload.mkdir(parents=True, exist_ok=True)
            for name in zf.namelist():
                if name.startswith("files/uploads/") and not name.endswith("/"):
                    rel = name[len("files/uploads/"):]
                    ziel = upload / rel
                    ziel.parent.mkdir(parents=True, exist_ok=True)
                    ziel.write_bytes(zf.read(name))
                    dateien += 1

    await db.commit()
    _import_cache.pop(token, None)
    logger.info("backup_importiert", kategorien=kategorien, modus=modus, datensaetze=datensaetze, dateien=dateien)
    return {
        "importierte_kategorien": kategorien,
        "importierte_datensaetze": datensaetze,
        "importierte_dateien": dateien,
    }
