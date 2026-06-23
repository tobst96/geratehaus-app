from fastapi import APIRouter, HTTPException, UploadFile, status

from app.api.deps import CurrentModerator, DbSession
from app.schemas.setup import SetupRequest, SetupStatus
from app.services import logo_service, setup_service
from app.services.config_service import config_service

router = APIRouter(prefix="/setup", tags=["setup"])


@router.get("/status", response_model=SetupStatus)
async def setup_status(db: DbSession) -> SetupStatus:
    return SetupStatus(ist_eingerichtet=await setup_service.ist_eingerichtet(db))


@router.post("", status_code=status.HTTP_204_NO_CONTENT)
async def setup_ausfuehren(db: DbSession, daten: SetupRequest) -> None:
    """Führt den Setup-Wizard aus. Nur erlaubt, solange noch kein Moderator
    existiert (First-Run). Für ein erneutes Setup siehe
    /setup/erneut-ausfuehren im Moderator-Bereich."""
    if await setup_service.ist_eingerichtet(db):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Setup wurde bereits durchgeführt.",
        )
    await setup_service.setup_durchfuehren(db, daten)


@router.post("/logo")
async def setup_logo_hochladen(db: DbSession, datei: UploadFile) -> dict[str, str]:
    """Logo-Upload während des First-Run-Wizards, vor dem ein Moderator
    existiert. Nach Abschluss des Setups läuft der Upload über
    /moderator/einstellungen/logo."""
    if await setup_service.ist_eingerichtet(db):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Setup wurde bereits durchgeführt.",
        )
    logo_url = await logo_service.logo_speichern(datei)
    await config_service.ensure_defaults(db)
    await config_service.set(db, "logo_url", logo_url)
    return {"logo_url": logo_url}


@router.post("/erneut-ausfuehren", status_code=status.HTTP_204_NO_CONTENT)
async def setup_erneut_ausfuehren(
    db: DbSession, daten: SetupRequest, _moderator: CurrentModerator
) -> None:
    """Erlaubt Moderatoren, den Setup-Wizard nachträglich erneut zu
    durchlaufen, z. B. bei einer Migration auf eine neue Instanz."""
    await setup_service.setup_durchfuehren(db, daten)
