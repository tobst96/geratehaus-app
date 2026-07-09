from fastapi import APIRouter

from app.api.deps import CurrentGruppenfuehrer, DbSession
from app.schemas.dashboard import DashboardOut
from app.services import dashboard_service

router = APIRouter(prefix="/gruppenfuehrer/dashboard", tags=["gruppenfuehrer:dashboard"])


@router.get("", response_model=DashboardOut)
async def dashboard(db: DbSession, _gruppenfuehrer: CurrentGruppenfuehrer) -> DashboardOut:
    return await dashboard_service.dashboard_daten(db)
