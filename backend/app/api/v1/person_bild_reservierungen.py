from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.api.deps import DbSession
from app.schemas.person import PersonOut
from app.schemas.person_bild_reservierung import PersonBildReservierungInfo
from app.services import person_bild_reservierung_service, stammdaten_service

router = APIRouter(prefix="/person-bild-reservierungen", tags=["person-bild-reservierungen"])


@router.get("/{token}", response_model=PersonBildReservierungInfo)
async def reservierung_info(db: DbSession, token: str) -> PersonBildReservierungInfo:
    """Kontext für die mobile Foto-Upload-Seite – bewusst ohne Auth, der
    Token selbst ist das Geheimnis (kurzlebig, einmal verwendbar)."""
    reservierung = await person_bild_reservierung_service.get_reservierung_by_token(db, token)
    if reservierung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservierung nicht gefunden.")

    person = await stammdaten_service.get_person(db, reservierung.person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")

    return PersonBildReservierungInfo(
        abgelaufen=person_bild_reservierung_service.ist_abgelaufen(reservierung),
        bereits_eingeloest=reservierung.eingeloest,
        person_name=person.name,
        person_bild_url=person.bild_url,
    )


@router.post("/{token}/upload", response_model=PersonOut)
async def reservierung_einloesen(
    db: DbSession, token: str, datei: UploadFile = File(...)
) -> PersonOut:
    reservierung = await person_bild_reservierung_service.get_reservierung_by_token(db, token)
    if reservierung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservierung nicht gefunden.")
    if reservierung.eingeloest:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Diese Reservierung wurde bereits genutzt."
        )
    if person_bild_reservierung_service.ist_abgelaufen(reservierung):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Diese Reservierung ist abgelaufen.")

    try:
        person = await person_bild_reservierung_service.reservierung_einloesen(db, reservierung, datei)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return await stammdaten_service.person_zu_out(db, person)
