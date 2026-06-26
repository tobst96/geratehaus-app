from fastapi import APIRouter, HTTPException, status

from app.api.deps import DbSession
from app.schemas.dienstbuch import TeilnehmerOut
from app.schemas.dienstbuch_reservierung import (
    DienstbuchReservierungEinloesen,
    DienstbuchReservierungInfo,
    DienstbuchReservierungVorschauSetzen,
)
from app.schemas.person import PersonOut
from app.services import dienstbuch_reservierung_service, dienstbuch_service, stammdaten_service

router = APIRouter(prefix="/dienstbuch-reservierungen", tags=["dienstbuch-reservierungen"])


@router.get("/{token}", response_model=DienstbuchReservierungInfo)
async def reservierung_info(db: DbSession, token: str) -> DienstbuchReservierungInfo:
    """Kontext für die mobile Eintragungs-Seite – bewusst ohne Auth, der
    Token selbst ist das Geheimnis (kurzlebig, einmal verwendbar)."""
    reservierung = await dienstbuch_reservierung_service.get_reservierung_by_token(db, token)
    if reservierung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservierung nicht gefunden.")

    dienstbuch = await dienstbuch_service.get_dienstbuch(db, reservierung.dienstbuch_id)
    if dienstbuch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dienstbuch nicht gefunden.")

    vorschau_person_name = None
    vorschau_bild_url = None
    if reservierung.vorschau_person_id is not None:
        vorschau_person = await stammdaten_service.get_person(db, reservierung.vorschau_person_id)
        if vorschau_person is not None:
            vorschau_person_name = vorschau_person.name
            vorschau_bild_url = vorschau_person.bild_url

    return DienstbuchReservierungInfo(
        dienstbuch_titel=dienstbuch.titel,
        abgelaufen=dienstbuch_reservierung_service.ist_abgelaufen(reservierung),
        bereits_eingeloest=reservierung.eingeloest,
        vorschau_person_name=vorschau_person_name,
        vorschau_bild_url=vorschau_bild_url,
    )


@router.put("/{token}/vorschau", status_code=status.HTTP_204_NO_CONTENT)
async def reservierung_vorschau_setzen(
    db: DbSession, token: str, daten: DienstbuchReservierungVorschauSetzen
) -> None:
    reservierung = await dienstbuch_reservierung_service.get_reservierung_by_token(db, token)
    if reservierung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservierung nicht gefunden.")
    try:
        await dienstbuch_reservierung_service.reservierung_vorschau_setzen(
            db, reservierung, daten.person_id, daten.pin
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/{token}/personen", response_model=list[PersonOut])
async def reservierung_personen(db: DbSession, token: str) -> list[PersonOut]:
    reservierung = await dienstbuch_reservierung_service.get_reservierung_by_token(db, token)
    if reservierung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservierung nicht gefunden.")
    return await stammdaten_service.liste_personen(db)


@router.post("/{token}/einloesen", response_model=TeilnehmerOut)
async def reservierung_einloesen(
    db: DbSession, token: str, daten: DienstbuchReservierungEinloesen
) -> TeilnehmerOut:
    reservierung = await dienstbuch_reservierung_service.get_reservierung_by_token(db, token)
    if reservierung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservierung nicht gefunden.")
    if reservierung.eingeloest:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Diese Reservierung wurde bereits genutzt."
        )
    if dienstbuch_reservierung_service.ist_abgelaufen(reservierung):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Diese Reservierung ist abgelaufen.")

    try:
        return await dienstbuch_reservierung_service.reservierung_einloesen(db, reservierung, daten)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
