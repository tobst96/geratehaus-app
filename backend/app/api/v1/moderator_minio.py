from fastapi import APIRouter

from app.api.deps import CurrentAdmin, DbSession
from app.schemas.minio import MinioEinstellungen, MinioEinstellungenUpdate, MinioTestErgebnis
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
