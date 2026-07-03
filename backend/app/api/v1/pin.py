"""Öffentliche Endpunkte für PIN-Self-Service und Moderator-Freigabe.

Alle bewusst ohne Login – der jeweilige Token in der URL ist das Geheimnis
(einmalig, ablaufend), analog zu den „Barcode vergessen"-Reservierungen und
den Buchungs-Aktions-Tokens.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import DbSession
from app.core.rate_limit import rate_limit
from app.schemas.auth import (
    FreigabeEinloesen,
    FreigabeTokenInfo,
    PinSetzen,
    PinTokenInfo,
)
from app.services import pin_service, stammdaten_service

router = APIRouter(tags=["pin"])


@router.get("/pin-setzen/{token}", response_model=PinTokenInfo, dependencies=[Depends(rate_limit(20, 60))])
async def pin_setzen_info(db: DbSession, token: str) -> PinTokenInfo:
    eintrag = await pin_service.get_pin_setzen_token(db, token)
    if eintrag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link nicht gefunden.")
    person = await stammdaten_service.get_person(db, eintrag.person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")
    return PinTokenInfo(name=person.name, gueltig=pin_service.pin_setzen_token_gueltig(eintrag))


@router.post("/pin-setzen/{token}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(rate_limit(10, 60))])
async def pin_setzen(db: DbSession, token: str, daten: PinSetzen) -> None:
    eintrag = await pin_service.get_pin_setzen_token(db, token)
    if eintrag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link nicht gefunden.")
    if not pin_service.pin_setzen_token_gueltig(eintrag):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Der Link ist abgelaufen oder wurde bereits genutzt.")
    await pin_service.pin_setzen_per_token(db, eintrag, daten.pin)


@router.get(
    "/person-freigabe/{token}", response_model=FreigabeTokenInfo, dependencies=[Depends(rate_limit(20, 60))]
)
async def freigabe_info(db: DbSession, token: str) -> FreigabeTokenInfo:
    eintrag = await pin_service.get_freigabe_token(db, token)
    if eintrag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Freigabe nicht gefunden.")
    person = await stammdaten_service.get_person(db, eintrag.person_id)
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")
    return FreigabeTokenInfo(
        name=person.name, offen=pin_service.freigabe_token_offen(eintrag), email=person.email
    )


@router.post(
    "/person-freigabe/{token}/freigeben",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(rate_limit(10, 60))],
)
async def freigabe_freigeben(db: DbSession, token: str, daten: FreigabeEinloesen) -> None:
    eintrag = await pin_service.get_freigabe_token(db, token)
    if eintrag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Freigabe nicht gefunden.")
    if not pin_service.freigabe_token_offen(eintrag):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Diese Freigabe ist nicht mehr offen.")
    await pin_service.freigabe_einloesen(db, eintrag, daten.email, daten.pin)


@router.post(
    "/person-freigabe/{token}/ablehnen",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(rate_limit(10, 60))],
)
async def freigabe_ablehnen(db: DbSession, token: str) -> None:
    eintrag = await pin_service.get_freigabe_token(db, token)
    if eintrag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Freigabe nicht gefunden.")
    if not pin_service.freigabe_token_offen(eintrag):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Diese Freigabe ist nicht mehr offen.")
    await pin_service.freigabe_ablehnen(db, eintrag)
