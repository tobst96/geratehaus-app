"""Modul ELW (Einsatzleitwagen).

Sobald ein Einsatz angelegt wird, geht – bei aktivem Modul – eine Mail an eine fest
konfigurierte Adresse (`elw_email`) mit einem **Login-losen Upload-Link**. Darüber
kann der ELW Dateien (Einsatzberichte etc.) in den MinIO-Einsatz-Ordner hochladen.

Der Link enthält statt eines Logins ein **HMAC-signiertes, URL-sicheres Token**
(`itsdangerous`, `cookie_secret_key`), das die `einsatz_id` kodiert. Es ist damit
nicht fälschbar. Die Gültigkeit „solange der Einsatz offen ist" wird bei JEDEM
Zugriff serverseitig geprüft (Status != "offen" → gesperrt) – ein echter S3-
Presigned-Link ließe sich nicht vorzeitig widerrufen, dieses App-Token schon.
"""

import re
from pathlib import Path

import structlog
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.core.config import settings
from app.services.config_service import config_service
from app.services.formular_service import _DATEI_ERLAUBT, _datei_bereinigen
from app.services.notifier.email import EmailNotifier

logger = structlog.get_logger(__name__)

# Sicherheits-Obergrenze für die Token-Lebensdauer (die eigentliche Sperre ist der
# „Einsatz offen?"-Check bei jedem Zugriff). Verhindert unbegrenzt gültige Links.
ELW_TOKEN_MAX_AGE_SEKUNDEN = 60 * 60 * 24 * 90  # 90 Tage
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB, wie beim Formular-Upload

_serializer = URLSafeTimedSerializer(settings.cookie_secret_key, salt="elw-upload")


class ElwTokenUngueltig(Exception):
    """Token fehlt/ist manipuliert/abgelaufen oder der Einsatz existiert nicht."""


class ElwEinsatzGeschlossen(Exception):
    """Der Einsatz ist nicht mehr offen – der Upload-Link ist damit gesperrt."""


class ElwFehler(Exception):
    """Sonstiger fachlicher Fehler (z. B. Objektspeicher nicht aktiv)."""


async def _modul_aktiv(db) -> bool:
    return bool(await config_service.get(db, "modul_elw_aktiv", False))


def token_erzeugen(einsatz_id: int) -> str:
    return _serializer.dumps(einsatz_id)


async def _einsatz_aus_token(db, token: str):
    """Verifiziert das Token und lädt den zugehörigen, noch OFFENEN Einsatz."""
    from app.services import einsatz_service

    try:
        einsatz_id = _serializer.loads(token, max_age=ELW_TOKEN_MAX_AGE_SEKUNDEN)
    except (BadSignature, SignatureExpired):
        raise ElwTokenUngueltig
    if not isinstance(einsatz_id, int):
        raise ElwTokenUngueltig
    einsatz = await einsatz_service.get_einsatz(db, einsatz_id)
    if einsatz is None:
        raise ElwTokenUngueltig
    if einsatz.status != "offen":
        raise ElwEinsatzGeschlossen
    return einsatz


async def einsatz_info(db, token: str) -> dict:
    """Für die Upload-Seite: Basisdaten des Einsatzes (nur wenn Token gültig + offen)."""
    einsatz = await _einsatz_aus_token(db, token)
    return {
        "einsatz_id": einsatz.id,
        "titel": einsatz.titel,
        "zeitpunkt": einsatz.zeitpunkt.isoformat() if einsatz.zeitpunkt else None,
    }


def _sicherer_dateiname(name: str | None, endung: str) -> str:
    """Entfernt Pfadanteile und riskante Zeichen; setzt die vom Inhalt bestimmte
    Endung durch (kein Traversal, kein Doppel-Suffix)."""
    basis = Path(name or "datei").name
    stamm = re.sub(r"[^A-Za-z0-9._ -]", "_", Path(basis).stem).strip() or "datei"
    return f"{stamm[:80]}{endung}"


async def upload_verarbeiten(
    db, token: str, dateiname: str | None, inhalt: bytes, content_type: str | None
) -> str:
    """Verifiziert das Token (Einsatz offen?), bereinigt die Datei und legt sie im
    MinIO-Einsatz-Ordner ab. Protokolliert den Upload in der Einsatz-Timeline.
    Gibt den gespeicherten Dateinamen zurück."""
    from app.services import einsatz_service, minio_service

    einsatz = await _einsatz_aus_token(db, token)

    if content_type not in _DATEI_ERLAUBT:
        raise ElwFehler("Nur Bilder (PNG/JPEG/WebP) oder PDF erlaubt.")
    if len(inhalt) > MAX_UPLOAD_BYTES:
        raise ElwFehler("Die Datei darf maximal 10 MB groß sein.")
    # Magic-Bytes-Prüfung + EXIF-Strip (wirft HTTPException 415 bei Ungültigkeit).
    bytes_bereinigt, endung = _datei_bereinigen(inhalt, content_type)
    sicherer_name = _sicherer_dateiname(dateiname, endung)

    if not await minio_service.aktiv(db):
        raise ElwFehler("Objektspeicher (MinIO) ist nicht aktiv – Upload nicht möglich.")
    await minio_service.einsatz_upload_ablegen(
        db, einsatz.id, sicherer_name, bytes_bereinigt, content_type
    )
    await einsatz_service.ereignis_protokollieren(
        db, einsatz.id, "elw_upload", f"Datei per ELW-Link hochgeladen: {sicherer_name}"
    )
    return sicherer_name


async def anlage_mail_senden(db, einsatz) -> None:
    """Bei Einsatz-Anlage (nur offene Einsätze): schickt den Upload-Link an die feste
    ELW-Adresse. Best-effort – Fehler brechen die Einsatz-Anlage nie ab."""
    try:
        if not await _modul_aktiv(db):
            return
        if getattr(einsatz, "status", "offen") != "offen":
            return
        ziel = str(await config_service.get(db, "elw_email", "")).strip()
        if not ziel:
            return
        basis = str(await config_service.get(db, "oeffentliche_basis_url", "")).rstrip("/")
        if not basis:
            logger.warning("elw_anlage_mail_ohne_basis_url", einsatz_id=einsatz.id)
            return
        link = f"{basis}/elw-upload/{token_erzeugen(einsatz.id)}"
        betreff = f"ELW-Upload für Einsatz: {einsatz.titel}"
        nachricht = (
            f"Für den Einsatz „{einsatz.titel}“ kann der Einsatzleitwagen über folgenden Link "
            f"Dateien (Einsatzberichte usw.) hochladen. Der Link ist gültig, solange der Einsatz "
            f"offen ist:\n\n{link}\n"
        )
        await EmailNotifier().send_an(db, ziel, betreff, nachricht)
    except Exception:  # noqa: BLE001
        logger.warning("elw_anlage_mail_fehlgeschlagen", einsatz_id=getattr(einsatz, "id", None), exc_info=True)
