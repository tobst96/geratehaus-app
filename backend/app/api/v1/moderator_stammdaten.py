from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentModerator, DbSession
from app.schemas.stammdaten import (
    FahrzeugCreate,
    FahrzeugOut,
    FahrzeugUpdate,
    FunktionDienststundenCreate,
    FunktionDienststundenOut,
    FunktionDienststundenUpdate,
    FunktionEinsatzCreate,
    FunktionEinsatzOut,
    FunktionEinsatzUpdate,
)
from app.services import stammdaten_service

router = APIRouter(prefix="/moderator/stammdaten", tags=["moderator:stammdaten"])


# --- Fahrzeuge ---------------------------------------------------------------


@router.get("/fahrzeuge", response_model=list[FahrzeugOut])
async def fahrzeuge_liste(db: DbSession, _moderator: CurrentModerator) -> list[FahrzeugOut]:
    return await stammdaten_service.liste_fahrzeuge(db, nur_aktive=False)


@router.post("/fahrzeuge", response_model=FahrzeugOut, status_code=status.HTTP_201_CREATED)
async def fahrzeug_anlegen(
    db: DbSession, _moderator: CurrentModerator, daten: FahrzeugCreate
) -> FahrzeugOut:
    return await stammdaten_service.fahrzeug_anlegen(db, daten)


@router.put("/fahrzeuge/{fahrzeug_id}", response_model=FahrzeugOut)
async def fahrzeug_aktualisieren(
    db: DbSession, _moderator: CurrentModerator, fahrzeug_id: int, daten: FahrzeugUpdate
) -> FahrzeugOut:
    fahrzeug = await stammdaten_service.get_fahrzeug(db, fahrzeug_id)
    if fahrzeug is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fahrzeug nicht gefunden.")
    return await stammdaten_service.fahrzeug_aktualisieren(db, fahrzeug, daten)


@router.delete("/fahrzeuge/{fahrzeug_id}", status_code=status.HTTP_204_NO_CONTENT)
async def fahrzeug_loeschen(db: DbSession, _moderator: CurrentModerator, fahrzeug_id: int) -> None:
    fahrzeug = await stammdaten_service.get_fahrzeug(db, fahrzeug_id)
    if fahrzeug is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fahrzeug nicht gefunden.")
    await stammdaten_service.fahrzeug_loeschen(db, fahrzeug)


# --- Funktionen Einsatz -------------------------------------------------------


@router.get("/funktionen-einsatz", response_model=list[FunktionEinsatzOut])
async def funktionen_einsatz_liste(
    db: DbSession, _moderator: CurrentModerator
) -> list[FunktionEinsatzOut]:
    return await stammdaten_service.liste_funktionen_einsatz(db, nur_aktive=False)


@router.post(
    "/funktionen-einsatz", response_model=FunktionEinsatzOut, status_code=status.HTTP_201_CREATED
)
async def funktion_einsatz_anlegen(
    db: DbSession, _moderator: CurrentModerator, daten: FunktionEinsatzCreate
) -> FunktionEinsatzOut:
    return await stammdaten_service.funktion_einsatz_anlegen(db, daten)


@router.put("/funktionen-einsatz/{funktion_id}", response_model=FunktionEinsatzOut)
async def funktion_einsatz_aktualisieren(
    db: DbSession, _moderator: CurrentModerator, funktion_id: int, daten: FunktionEinsatzUpdate
) -> FunktionEinsatzOut:
    funktion = await stammdaten_service.get_funktion_einsatz(db, funktion_id)
    if funktion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funktion nicht gefunden.")
    return await stammdaten_service.funktion_einsatz_aktualisieren(db, funktion, daten)


@router.delete("/funktionen-einsatz/{funktion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def funktion_einsatz_loeschen(
    db: DbSession, _moderator: CurrentModerator, funktion_id: int
) -> None:
    funktion = await stammdaten_service.get_funktion_einsatz(db, funktion_id)
    if funktion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funktion nicht gefunden.")
    await stammdaten_service.funktion_einsatz_loeschen(db, funktion)


# --- Funktionen Dienststunden --------------------------------------------------


@router.get("/funktionen-dienststunden", response_model=list[FunktionDienststundenOut])
async def funktionen_dienststunden_liste(
    db: DbSession, _moderator: CurrentModerator
) -> list[FunktionDienststundenOut]:
    return await stammdaten_service.liste_funktionen_dienststunden(db, nur_aktive=False)


@router.post(
    "/funktionen-dienststunden",
    response_model=FunktionDienststundenOut,
    status_code=status.HTTP_201_CREATED,
)
async def funktion_dienststunden_anlegen(
    db: DbSession, _moderator: CurrentModerator, daten: FunktionDienststundenCreate
) -> FunktionDienststundenOut:
    return await stammdaten_service.funktion_dienststunden_anlegen(db, daten)


@router.put("/funktionen-dienststunden/{funktion_id}", response_model=FunktionDienststundenOut)
async def funktion_dienststunden_aktualisieren(
    db: DbSession,
    _moderator: CurrentModerator,
    funktion_id: int,
    daten: FunktionDienststundenUpdate,
) -> FunktionDienststundenOut:
    funktion = await stammdaten_service.get_funktion_dienststunden(db, funktion_id)
    if funktion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funktion nicht gefunden.")
    return await stammdaten_service.funktion_dienststunden_aktualisieren(db, funktion, daten)


@router.delete("/funktionen-dienststunden/{funktion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def funktion_dienststunden_loeschen(
    db: DbSession, _moderator: CurrentModerator, funktion_id: int
) -> None:
    funktion = await stammdaten_service.get_funktion_dienststunden(db, funktion_id)
    if funktion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funktion nicht gefunden.")
    await stammdaten_service.funktion_dienststunden_loeschen(db, funktion)
