from fastapi import APIRouter, HTTPException, Response, status

from app.api.deps import CurrentAdmin, DbSession
from app.schemas.minio import (
    MinioBrowse,
    MinioEinstellungen,
    MinioEinstellungenUpdate,
    MinioObjekt,
    MinioTestErgebnis,
)
from app.services import minio_service
from app.services.config_service import config_service

router = APIRouter(prefix="/moderator/minio", tags=["moderator:minio"])


@router.get("/einstellungen", response_model=MinioEinstellungen)
async def einstellungen_lesen(db: DbSession, _admin: CurrentAdmin) -> MinioEinstellungen:
    g = config_service.get
    return MinioEinstellungen(
        endpoint=str(await g(db, "minio_endpoint", "http://minio:9000")),
        console_url=str(await g(db, "minio_console_url", "")),
        region=str(await g(db, "minio_region", "us-east-1")),
        access_key=str(await g(db, "minio_access_key", "")),
        secret_gesetzt=bool(str(await g(db, "minio_secret_key", ""))),
        bucket_backups=str(await g(db, "minio_bucket_backups", "geratehaus-backups")),
        bucket_einsaetze=str(await g(db, "minio_bucket_einsaetze", "einsaetze")),
        bucket_dienstbuecher=str(await g(db, "minio_bucket_dienstbuecher", "dienstbuecher")),
    )


@router.patch("/einstellungen", response_model=MinioEinstellungen)
async def einstellungen_setzen(
    db: DbSession, _admin: CurrentAdmin, daten: MinioEinstellungenUpdate
) -> MinioEinstellungen:
    s = config_service.set
    for wert, key in [
        (daten.endpoint, "minio_endpoint"), (daten.console_url, "minio_console_url"),
        (daten.region, "minio_region"),
        (daten.access_key, "minio_access_key"), (daten.secret_key, "minio_secret_key"),
        (daten.bucket_backups, "minio_bucket_backups"),
        (daten.bucket_einsaetze, "minio_bucket_einsaetze"),
        (daten.bucket_dienstbuecher, "minio_bucket_dienstbuecher"),
    ]:
        if wert is not None:
            await s(db, key, wert)
    return await einstellungen_lesen(db, _admin)


@router.post("/test", response_model=MinioTestErgebnis)
async def verbindung_testen(db: DbSession, _admin: CurrentAdmin) -> MinioTestErgebnis:
    ok, meldung = await minio_service.verbindung_testen(db)
    return MinioTestErgebnis(ok=ok, meldung=meldung)


async def _pruefe_aktiv(db: DbSession) -> None:
    if not await minio_service.aktiv(db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MinIO-Modul nicht aktiv oder nicht konfiguriert.",
        )


@router.get("/buckets", response_model=list[str])
async def buckets(db: DbSession, _admin: CurrentAdmin) -> list[str]:
    await _pruefe_aktiv(db)
    try:
        return await minio_service.liste_buckets(db)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))


@router.get("/browse", response_model=MinioBrowse)
async def browse(db: DbSession, _admin: CurrentAdmin, bucket: str, prefix: str = "") -> MinioBrowse:
    await _pruefe_aktiv(db)
    try:
        r = await minio_service.browse(db, bucket, prefix)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    return MinioBrowse(ordner=r["ordner"], dateien=[MinioObjekt(**d) for d in r["dateien"]])


@router.get("/download")
async def download(db: DbSession, _admin: CurrentAdmin, bucket: str, key: str) -> Response:
    await _pruefe_aktiv(db)
    try:
        daten = await minio_service.objekt_lesen(db, bucket, key)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    name = key.rstrip("/").rsplit("/", 1)[-1] or "download"
    return Response(
        content=daten,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{name}"'},
    )


@router.delete("/object", status_code=status.HTTP_204_NO_CONTENT)
async def objekt_loeschen(db: DbSession, _admin: CurrentAdmin, bucket: str, key: str) -> None:
    await _pruefe_aktiv(db)
    try:
        await minio_service.objekt_loeschen(db, bucket, key)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
