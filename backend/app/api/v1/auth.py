from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select

from app.api.deps import DbSession
from app.core.security import create_access_token, verify_secret
from app.models.barcode_token import BarcodeToken
from app.models.moderator import Moderator
from app.models.person import Person
from app.schemas.auth import (
    BarcodeEinscannen,
    BarcodeIdentitaet,
    BarcodeVorschau,
    ModeratorToken,
    NameEintragen,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

NAME_COOKIE = "geraetehaus_name"
NAME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 5  # 5 Jahre


@router.post("/name", status_code=status.HTTP_204_NO_CONTENT)
async def name_eintragen(
    db: DbSession,
    response: Response,
    daten: NameEintragen,
    geraetehaus_name: Annotated[str | None, Cookie()] = None,
) -> None:
    """Trägt den Namen dauerhaft im Cookie ein."""
    if geraetehaus_name and geraetehaus_name != daten.name:
        await auth_service.protokolliere_namensabweichung(db, geraetehaus_name, daten.name)
    await auth_service.get_or_create_person(db, daten.name)
    response.set_cookie(
        NAME_COOKIE,
        daten.name,
        max_age=NAME_COOKIE_MAX_AGE_SECONDS,
        httponly=True,
        samesite="lax",
    )


@router.post("/barcode", response_model=BarcodeIdentitaet)
async def barcode_einscannen(
    db: DbSession, response: Response, daten: BarcodeEinscannen
) -> BarcodeIdentitaet:
    """Löst einen gescannten Personen-Barcode zur Identität auf und trägt sie
    wie /auth/name im Namens-Cookie ein – so identifiziert sich die Person für
    alle nachfolgenden Aktionen (z. B. Sitzplatz-Zuweisung) ohne Tippen."""
    result = await db.execute(select(BarcodeToken).where(BarcodeToken.token == daten.token))
    barcode = result.scalar_one_or_none()
    if barcode is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Barcode nicht erkannt.")

    person_result = await db.execute(select(Person).where(Person.id == barcode.person_id))
    person = person_result.scalar_one_or_none()
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")

    if barcode.ablauf_am is not None and barcode.ablauf_am < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_410_GONE, detail=f"Barcode von {person.name} ist abgelaufen."
        )

    barcode.last_used_at = datetime.utcnow()
    await db.commit()

    response.set_cookie(
        NAME_COOKIE,
        person.name,
        max_age=NAME_COOKIE_MAX_AGE_SECONDS,
        httponly=True,
        samesite="lax",
    )
    return BarcodeIdentitaet(name=person.name)


@router.get("/barcode-vorschau/{token}", response_model=BarcodeVorschau)
async def barcode_vorschau(db: DbSession, token: str) -> BarcodeVorschau:
    """Liefert Name und Bild zu einem Token, ohne Identität/Cookie zu setzen –
    für die Live-Vorschau während des Scannens (z. B. Foto neben dem
    Sitzplatz-Formular). Bewusst ohne Ablaufprüfung, reine Anzeige."""
    result = await db.execute(select(BarcodeToken).where(BarcodeToken.token == token))
    barcode = result.scalar_one_or_none()
    if barcode is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Barcode nicht erkannt.")

    person_result = await db.execute(select(Person).where(Person.id == barcode.person_id))
    person = person_result.scalar_one_or_none()
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person nicht gefunden.")

    return BarcodeVorschau(name=person.name, bild_url=person.bild_url)


@router.post("/moderator/login", response_model=ModeratorToken)
async def moderator_login(
    db: DbSession, form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> ModeratorToken:
    result = await db.execute(select(Moderator).where(Moderator.username == form_data.username))
    moderator = result.scalar_one_or_none()
    if moderator is None or not verify_secret(form_data.password, moderator.passwort_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Benutzername oder Passwort falsch.",
        )
    token = create_access_token(subject=moderator.username, extra_claims={"rolle": moderator.rolle})
    return ModeratorToken(access_token=token)
