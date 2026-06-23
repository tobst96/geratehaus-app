from fastapi import APIRouter

from app.api.deps import DbSession
from app.schemas.stammdaten import FahrzeugOut, FunktionDienststundenOut, FunktionEinsatzOut
from app.services import stammdaten_service

router = APIRouter(prefix="/stammdaten", tags=["stammdaten"])


@router.get("/fahrzeuge", response_model=list[FahrzeugOut])
async def fahrzeuge(db: DbSession, nur_aktive: bool = True) -> list[FahrzeugOut]:
    return await stammdaten_service.liste_fahrzeuge(db, nur_aktive)


@router.get("/funktionen-einsatz", response_model=list[FunktionEinsatzOut])
async def funktionen_einsatz(db: DbSession, nur_aktive: bool = True) -> list[FunktionEinsatzOut]:
    return await stammdaten_service.liste_funktionen_einsatz(db, nur_aktive)


@router.get("/funktionen-dienststunden", response_model=list[FunktionDienststundenOut])
async def funktionen_dienststunden(
    db: DbSession, nur_aktive: bool = True
) -> list[FunktionDienststundenOut]:
    return await stammdaten_service.liste_funktionen_dienststunden(db, nur_aktive)
