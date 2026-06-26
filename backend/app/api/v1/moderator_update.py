from fastapi import APIRouter

from app.api.deps import CurrentAdmin, DbSession
from app.schemas.update import UpdateKanalSetzen, UpdateStatusOut
from app.services import update_service

router = APIRouter(prefix="/moderator/update", tags=["moderator:update"])


@router.get("", response_model=UpdateStatusOut)
async def status(db: DbSession, _admin: CurrentAdmin) -> UpdateStatusOut:
    return UpdateStatusOut(**await update_service.update_status(db))


@router.put("/kanal", response_model=UpdateStatusOut)
async def kanal_setzen(db: DbSession, _admin: CurrentAdmin, daten: UpdateKanalSetzen) -> UpdateStatusOut:
    await update_service.kanal_setzen(db, daten.kanal)
    return UpdateStatusOut(**await update_service.update_status(db))
