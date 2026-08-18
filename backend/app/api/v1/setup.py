from fastapi import APIRouter, HTTPException, UploadFile, status

from app.api.deps import CurrentGruppenfuehrer, DbSession
from app.schemas.setup import SetupBasis, SetupRequest, SetupStatus
from app.services import feature_modul_service, logo_service, setup_service
from app.services.config_service import config_service

router = APIRouter(prefix="/setup", tags=["setup"])


@router.get("/status", response_model=SetupStatus)
async def setup_status(db: DbSession) -> SetupStatus:
    return SetupStatus(ist_eingerichtet=await setup_service.ist_eingerichtet(db))


@router.get("/module")
async def setup_module(db: DbSession) -> list[dict]:
    """Modul-Metadaten für den Wizard-Auswahlschritt, vor dem ein Gruppenführer
    existiert – daher ohne Auth. Liefert nur Key/Name/Aktiv-Status, keine
    schützenswerten Daten; abschaltbare (nicht immer-aktive) Module."""
    return [m for m in await feature_modul_service.liste(db) if not m["immer_aktiv"]]


@router.post("", status_code=status.HTTP_204_NO_CONTENT)
async def setup_ausfuehren(db: DbSession, daten: SetupRequest) -> None:
    """Führt den Setup-Wizard aus. Nur erlaubt, solange noch kein Gruppenführer
    existiert (First-Run). Für ein erneutes Setup siehe
    /setup/erneut-ausfuehren im Gruppenführer-Bereich."""
    if await setup_service.ist_eingerichtet(db):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Setup wurde bereits durchgeführt.",
        )
    await setup_service.setup_durchfuehren(db, daten)


@router.post("/logo")
async def setup_logo_hochladen(db: DbSession, datei: UploadFile) -> dict[str, str]:
    """Logo-Upload während des First-Run-Wizards, vor dem ein Gruppenführer
    existiert. Nach Abschluss des Setups läuft der Upload über
    /gruppenfuehrer/einstellungen/logo."""
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
    db: DbSession, daten: SetupBasis, _gruppenfuehrer: CurrentGruppenfuehrer
) -> None:
    """Erlaubt Gruppenführer, Branding/Module/Benachrichtigungen nachträglich
    erneut über den Wizard-Ablauf zu setzen. Admin-Zugänge werden hier bewusst
    NICHT verwaltet – dafür „Erhöhter Zugang" in Personal nutzen."""
    await setup_service.setup_erneut_durchfuehren(db, daten)
