from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import DbSession
from app.core.rate_limit import rate_limit
from app.schemas.dienststunden import DienststundenEintragOut
from app.schemas.dienststunden_reservierung import (
    DienststundenReservierungEinloesen,
    DienststundenReservierungInfo,
    DienststundenReservierungVorschauSetzen,
)
from app.schemas.person import PersonOut
from app.services import dienststunden_reservierung_service, stammdaten_service

router = APIRouter(prefix="/dienststunden-reservierungen", tags=["dienststunden-reservierungen"])


@router.get("/{token}", response_model=DienststundenReservierungInfo)
async def reservierung_info(db: DbSession, token: str) -> DienststundenReservierungInfo:
    """Kontext für die mobile Eintragungs-Seite – bewusst ohne Auth, der
    Token selbst ist das Geheimnis (kurzlebig, einmal verwendbar)."""
    reservierung = await dienststunden_reservierung_service.get_reservierung_by_token(db, token)
    if reservierung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservierung nicht gefunden.")

    vorschau_person_name = None
    vorschau_bild_url = None
    if reservierung.vorschau_person_id is not None:
        vorschau_person = await stammdaten_service.get_person(db, reservierung.vorschau_person_id)
        if vorschau_person is not None:
            vorschau_person_name = vorschau_person.name
            vorschau_bild_url = vorschau_person.bild_url

    return DienststundenReservierungInfo(
        abgelaufen=dienststunden_reservierung_service.ist_abgelaufen(reservierung),
        bereits_eingeloest=reservierung.eingeloest,
        vorschau_person_name=vorschau_person_name,
        vorschau_bild_url=vorschau_bild_url,
    )


@router.put(
    "/{token}/vorschau",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(rate_limit(15, 60))],
)
async def reservierung_vorschau_setzen(
    db: DbSession, token: str, daten: DienststundenReservierungVorschauSetzen
) -> None:
    reservierung = await dienststunden_reservierung_service.get_reservierung_by_token(db, token)
    if reservierung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservierung nicht gefunden.")
    try:
        await dienststunden_reservierung_service.reservierung_vorschau_setzen(
            db, reservierung, daten.person_id, daten.pin
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/{token}/personen", response_model=list[PersonOut])
async def reservierung_personen(db: DbSession, token: str) -> list[PersonOut]:
    reservierung = await dienststunden_reservierung_service.get_reservierung_by_token(db, token)
    if reservierung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservierung nicht gefunden.")
    personen = await stammdaten_service.liste_personen(db)
    return await stammdaten_service.personen_zu_out(db, personen)


@router.post("/{token}/einloesen", response_model=DienststundenEintragOut)
async def reservierung_einloesen(
    db: DbSession, token: str, daten: DienststundenReservierungEinloesen
) -> DienststundenEintragOut:
    reservierung = await dienststunden_reservierung_service.get_reservierung_by_token(db, token)
    if reservierung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservierung nicht gefunden.")
    if reservierung.eingeloest:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Diese Reservierung wurde bereits genutzt."
        )
    if dienststunden_reservierung_service.ist_abgelaufen(reservierung):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Diese Reservierung ist abgelaufen.")

    try:
        return await dienststunden_reservierung_service.reservierung_einloesen(db, reservierung, daten)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
