from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import DbSession
from app.core.rate_limit import rate_limit
from app.schemas.dienststunden import DienststundenStempelInfo
from app.services import dienststunden_service
from app.services.config_service import config_service

router = APIRouter(prefix="/dienststunden-stempel", tags=["dienststunden-stempel"])


@router.get(
    "/{funktion_id}",
    response_model=DienststundenStempelInfo,
    dependencies=[Depends(rate_limit(30, 60))],
)
async def stempel_info(db: DbSession, funktion_id: int) -> DienststundenStempelInfo:
    """Öffentlicher Kontext für das Dienststunden-Stempel-Poster (QR-Ziel): nur
    Funktionsname + ob die Eintragung aktuell möglich ist. Die eigentliche
    Erfassung läuft über `POST /dienststunden` und erfordert einen Login
    (signiertes Mitglieder-Cookie / Barcode). Funktion ist dabei fest vorgegeben."""
    funktion = await dienststunden_service.get_funktion(db, funktion_id)
    if funktion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funktion nicht gefunden.")
    modul_aktiv = bool(await config_service.get(db, "modul_dienststunden_aktiv", False))
    return DienststundenStempelInfo(
        funktion_id=funktion.id,
        funktion_name=funktion.name,
        aktiv=bool(funktion.aktiv) and modul_aktiv,
    )
