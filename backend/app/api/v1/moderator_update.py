from fastapi import APIRouter, Depends

from app.api.deps import DbSession, require_modul_zugriff
from app.schemas.update import UpdateKanalSetzen, UpdateStatusOut
from app.services import update_service

# Phase 4b: granular geschützt – Admins immer (Bypass), sonst Freigabe „einstellungen".
router = APIRouter(
    prefix="/moderator/update",
    tags=["moderator:update"],
    dependencies=[Depends(require_modul_zugriff("einstellungen"))],
)


@router.get("", response_model=UpdateStatusOut)
async def status(db: DbSession) -> UpdateStatusOut:
    return UpdateStatusOut(**await update_service.update_status(db))


@router.put("/kanal", response_model=UpdateStatusOut)
async def kanal_setzen(db: DbSession, daten: UpdateKanalSetzen) -> UpdateStatusOut:
    await update_service.kanal_setzen(db, daten.kanal)
    return UpdateStatusOut(**await update_service.update_status(db))
