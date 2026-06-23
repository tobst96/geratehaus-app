from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentPerson, DbSession, require_modul_aktiv
from app.schemas.dienststunden import (
    DienststundenEintragOut,
    DienststundenErfassen,
    DienststundenSummeOut,
)
from app.services import dienststunden_service

router = APIRouter(
    prefix="/dienststunden",
    tags=["dienststunden"],
    dependencies=[Depends(require_modul_aktiv("modul_dienststunden_aktiv"))],
)


@router.post("", response_model=DienststundenEintragOut, dependencies=[])
async def erfassen(
    db: DbSession, person: CurrentPerson, daten: DienststundenErfassen
) -> DienststundenEintragOut:
    """Stundenerfassung ist nur im Gerätehaus möglich."""
    if not await dienststunden_service.funktion_existiert_und_aktiv(db, daten.funktion_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Funktion nicht gefunden oder inaktiv."
        )
    return await dienststunden_service.erfassen(db, person.id, daten)


@router.get(
    "/meine", response_model=list[DienststundenSummeOut], dependencies=[]
)
async def meine_summen(db: DbSession, person: CurrentPerson) -> list[DienststundenSummeOut]:
    """Eigene kumulierte Dienststunden – im Gerätehaus. Für den Außenzugriff
    per PIN siehe /api/v1/aussen/dienststunden."""
    return await dienststunden_service.eigene_summen(db, person.id)
