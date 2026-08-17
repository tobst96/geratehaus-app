from fastapi import APIRouter, Depends

from app.api.deps import DbSession, require_modul_zugriff
from app.schemas.update import UpdateAusloesenOut, UpdateKanalSetzen, UpdateStatusOut
from app.services import update_service

# Phase 4b: granular geschützt – Admins immer (Bypass), sonst Freigabe „einstellungen".
router = APIRouter(
    prefix="/gruppenfuehrer/update",
    tags=["gruppenfuehrer:update"],
    dependencies=[Depends(require_modul_zugriff("einstellungen"))],
)


@router.get("", response_model=UpdateStatusOut)
async def status(db: DbSession) -> UpdateStatusOut:
    return UpdateStatusOut(**await update_service.update_status(db))


@router.put("/kanal", response_model=UpdateStatusOut)
async def kanal_setzen(db: DbSession, daten: UpdateKanalSetzen) -> UpdateStatusOut:
    await update_service.kanal_setzen(db, daten.kanal)
    return UpdateStatusOut(**await update_service.update_status(db))


@router.post("/ausloesen", response_model=UpdateAusloesenOut)
async def ausloesen(db: DbSession) -> UpdateAusloesenOut:
    """Stößt ein Update an (schreibt das Update-Signal für das Host-Skript).
    Nur wirksam, wenn tatsächlich eine neue Version verfügbar ist."""
    return UpdateAusloesenOut(**await update_service.update_ausloesen(db))
