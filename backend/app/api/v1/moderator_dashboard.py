from fastapi import APIRouter

from app.api.deps import CurrentModerator, DbSession
from app.schemas.dashboard import DashboardOut
from app.services import dashboard_service

router = APIRouter(prefix="/moderator/dashboard", tags=["moderator:dashboard"])


@router.get("", response_model=DashboardOut)
async def dashboard(db: DbSession, _moderator: CurrentModerator) -> DashboardOut:
    return await dashboard_service.dashboard_daten(db)
