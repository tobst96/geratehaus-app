from fastapi import APIRouter, HTTPException, status

from app.api.deps import DbSession
from app.schemas.mitglied_login_reservierung import (
    MitgliedLoginAnmelden,
    MitgliedLoginReservierungInfo,
    MitgliedLoginReservierungOut,
)
from app.schemas.person import PersonOut
from app.services import mitglied_login_reservierung_service, stammdaten_service

router = APIRouter(prefix="/mitglied-login-reservierungen", tags=["mitglied-login-reservierungen"])


@router.post("", response_model=MitgliedLoginReservierungOut, dependencies=[])
async def reservierung_anlegen(db: DbSession) -> MitgliedLoginReservierungOut:
    """Erstellt einen Reservierungs-Token für 'Barcode vergessen' beim
    Mitglieder-Login: QR-Code führt auf eine Seite, auf der man sich per
    Namenssuche (+ PIN falls gesetzt) selbst identifiziert."""
    reservierung = await mitglied_login_reservierung_service.reservierung_anlegen(db)
    return MitgliedLoginReservierungOut(token=reservierung.token, ablauf_am=reservierung.ablauf_am)


@router.get("/{token}", response_model=MitgliedLoginReservierungInfo)
async def reservierung_info(db: DbSession, token: str) -> MitgliedLoginReservierungInfo:
    """Bewusst ohne Auth – der Token selbst ist das Geheimnis. Wird vom
    ursprünglichen Gerät gepollt, um zu erkennen, wann die Auswahl auf dem
    Handy bestätigt wurde."""
    reservierung = await mitglied_login_reservierung_service.get_reservierung_by_token(db, token)
    if reservierung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservierung nicht gefunden.")

    person_name = None
    person_bild_url = None
    if reservierung.person_id is not None:
        person = await stammdaten_service.get_person(db, reservierung.person_id)
        if person is not None:
            person_name = person.name
            person_bild_url = person.bild_url

    return MitgliedLoginReservierungInfo(
        abgelaufen=mitglied_login_reservierung_service.ist_abgelaufen(reservierung),
        bestaetigt=reservierung.bestaetigt,
        eingeloest=reservierung.eingeloest,
        person_name=person_name,
        person_bild_url=person_bild_url,
    )


@router.get("/{token}/personen", response_model=list[PersonOut])
async def reservierung_personen(db: DbSession, token: str) -> list[PersonOut]:
    reservierung = await mitglied_login_reservierung_service.get_reservierung_by_token(db, token)
    if reservierung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservierung nicht gefunden.")
    personen = await stammdaten_service.liste_personen(db)
    return await stammdaten_service.personen_zu_out(db, personen)


@router.post("/{token}/anmelden", status_code=status.HTTP_204_NO_CONTENT)
async def reservierung_anmelden(db: DbSession, token: str, daten: MitgliedLoginAnmelden) -> None:
    reservierung = await mitglied_login_reservierung_service.get_reservierung_by_token(db, token)
    if reservierung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservierung nicht gefunden.")
    if reservierung.eingeloest:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Diese Reservierung wurde bereits genutzt."
        )
    if mitglied_login_reservierung_service.ist_abgelaufen(reservierung):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Diese Reservierung ist abgelaufen.")
    try:
        await mitglied_login_reservierung_service.anmelden(db, reservierung, daten.person_id, daten.pin)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
