from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentPerson, DbSession, require_modul_aktiv
from app.schemas.dienststunden import (
    DienststundenEintragOut,
    DienststundenErfassen,
    DienststundenSummeOut,
)
from app.schemas.dienststunden_reservierung import DienststundenReservierungOut
from app.services import dienststunden_reservierung_service, dienststunden_service

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
    """Eigene kumulierte Dienststunden – im Gerätehaus."""
    return await dienststunden_service.eigene_summen(db, person.id)


@router.post("/reservierung", response_model=DienststundenReservierungOut, dependencies=[])
async def reservierung_anlegen(db: DbSession) -> DienststundenReservierungOut:
    """Erstellt einen Reservierungs-Token für 'Barcode vergessen': QR-Code
    führt auf eine Seite, auf der sich die Person ohne Barcode komplett
    selbst eintragen kann (Person, Funktion, Stunden, Datum)."""
    reservierung = await dienststunden_reservierung_service.reservierung_anlegen(db)
    return DienststundenReservierungOut(token=reservierung.token, ablauf_am=reservierung.ablauf_am)
