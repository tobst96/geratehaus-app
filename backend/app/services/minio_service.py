"""MinIO-/Objektspeicher-Modul: eine zentrale Verbindung (Endpoint + Keys) und
darauf aufbauend die automatische Ablage erzeugter Dokumente.

Ist das Modul „minio" aktiv und konfiguriert, werden Dokumente automatisch in die
konfigurierten Buckets gelegt:
- Einsätze: Bucket `minio_bucket_einsaetze`, ein **Ordner je Einsatz**
  (`einsatz-<id>/`) mit `einsatz.json` (aktueller Stand) und `bericht.pdf`.
- Dienstbücher: Bucket `minio_bucket_dienstbuecher`, **flach** (`dienstbuch-<id>.pdf`).

Weitere Module hängen sich am selben Muster ein (eigener Bucket, optional Ordner
je Objekt). boto3 wird lazy importiert.
"""

import asyncio
import json
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.services import feature_modul_service
from app.services.config_service import config_service

logger = structlog.get_logger(__name__)


async def aktiv(db: AsyncSession) -> bool:
    """MinIO-Modul aktiv UND mit Zugangsdaten konfiguriert."""
    if not await feature_modul_service.ist_aktiv(db, "minio"):
        return False
    return bool(str(await config_service.get(db, "minio_access_key", "")))


async def config(db: AsyncSession) -> dict[str, str]:
    g = config_service.get
    return {
        "endpoint": str(await g(db, "minio_endpoint", "http://minio:9000")),
        "region": str(await g(db, "minio_region", "us-east-1")),
        "access": str(await g(db, "minio_access_key", "")),
        "secret": str(await g(db, "minio_secret_key", "")),
        "bucket_backups": str(await g(db, "minio_bucket_backups", "geratehaus-backups")),
        "bucket_einsaetze": str(await g(db, "minio_bucket_einsaetze", "einsaetze")),
        "bucket_dienstbuecher": str(await g(db, "minio_bucket_dienstbuecher", "dienstbuecher")),
    }


def _client(cfg: dict[str, str]):
    import boto3  # lazy

    return boto3.client(
        "s3",
        endpoint_url=cfg["endpoint"] or None,
        region_name=cfg["region"] or "us-east-1",
        aws_access_key_id=cfg["access"],
        aws_secret_access_key=cfg["secret"],
    )


def _ensure_bucket_sync(client, bucket: str) -> None:
    from botocore.exceptions import ClientError

    try:
        client.head_bucket(Bucket=bucket)
    except ClientError:
        client.create_bucket(Bucket=bucket)


async def put_bytes(
    db: AsyncSession, bucket: str, key: str, daten: bytes, content_type: str = "application/octet-stream"
) -> None:
    """Legt ein Objekt ab (Bucket wird bei Bedarf angelegt). Wirft bei Fehler –
    für die best-effort-Dokumentablage die *_ablegen-Helfer nutzen."""
    cfg = await config(db)

    def _put():
        client = _client(cfg)
        _ensure_bucket_sync(client, bucket)
        client.put_object(Bucket=bucket, Key=key, Body=daten, ContentType=content_type)

    await asyncio.to_thread(_put)


async def verbindung_testen(db: AsyncSession) -> tuple[bool, str]:
    """Prüft die Verbindung (list_buckets). Für den 'Verbindung testen'-Button."""
    cfg = await config(db)
    if not cfg["access"]:
        return False, "Keine Zugangsdaten hinterlegt."

    def _test():
        _client(cfg).list_buckets()

    try:
        await asyncio.to_thread(_test)
        return True, "Verbindung erfolgreich."
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)


# --- Dokument-Ablage (best-effort, nur bei aktivem Modul) --------------------


def _einsatz_zu_dict(einsatz: Any) -> dict:
    teilnehmer = []
    for t in getattr(einsatz, "teilnahmen", []) or []:
        teilnehmer.append(
            {
                "person": getattr(getattr(t, "person", None), "name", None),
                "fahrzeug": getattr(getattr(t, "fahrzeug", None), "name", None),
                "sitzplatz": getattr(t, "sitzplatz_id", None),
                "vab": getattr(t, "vab", None),
                "atemschutzminuten": getattr(t, "atemschutzminuten", None),
            }
        )
    return {
        "id": einsatz.id,
        "titel": einsatz.titel,
        "zeitpunkt": einsatz.zeitpunkt.isoformat() if getattr(einsatz, "zeitpunkt", None) else None,
        "adresse": getattr(einsatz, "adresse", None),
        "meldung": getattr(einsatz, "meldung", None),
        "einsatznummer": getattr(einsatz, "einsatznummer", None),
        "status": getattr(einsatz, "status", None),
        "quelle": getattr(einsatz, "quelle", None),
        "zusatzfelder": getattr(einsatz, "zusatzfelder", None),
        "teilnehmer": teilnehmer,
    }


async def einsatz_dokumente(db: AsyncSession, einsatz: Any, pdf: bytes | None = None) -> None:
    """Legt Ordner + aktuelle einsatz.json (+ optional bericht.pdf) für einen
    Einsatz ab. Best-effort – Fehler brechen den Aufrufer nie ab."""
    try:
        if not await aktiv(db):
            return
        cfg = await config(db)
        bucket = cfg["bucket_einsaetze"]
        ordner = f"einsatz-{einsatz.id}"
        # Ordner-Platzhalter (0-Byte-Objekt mit Slash) – erscheint als Ordner.
        await put_bytes(db, bucket, f"{ordner}/", b"", "application/x-directory")
        await put_bytes(
            db, bucket, f"{ordner}/einsatz.json",
            json.dumps(_einsatz_zu_dict(einsatz), ensure_ascii=False, indent=2).encode(),
            "application/json",
        )
        if pdf is not None:
            await put_bytes(db, bucket, f"{ordner}/bericht.pdf", pdf, "application/pdf")
    except Exception:  # noqa: BLE001
        logger.warning("minio_einsatz_ablage_fehlgeschlagen", einsatz_id=getattr(einsatz, "id", None), exc_info=True)


async def dienstbuch_dokument(db: AsyncSession, dienstbuch_id: int, pdf: bytes) -> None:
    """Legt das Dienstbuch-PDF flach im Dienstbuch-Bucket ab (kein Unterordner)."""
    try:
        if not await aktiv(db):
            return
        cfg = await config(db)
        await put_bytes(db, cfg["bucket_dienstbuecher"], f"dienstbuch-{dienstbuch_id}.pdf", pdf, "application/pdf")
    except Exception:  # noqa: BLE001
        logger.warning("minio_dienstbuch_ablage_fehlgeschlagen", dienstbuch_id=dienstbuch_id, exc_info=True)
