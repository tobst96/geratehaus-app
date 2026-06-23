from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select

from app.api.deps import CurrentPerson, DbSession
from app.core.geofence import innerhalb_geofence
from app.core.pin_session import PIN_SESSION_COOKIE, PIN_SESSION_MAX_AGE_SECONDS, erstelle_pin_session
from app.core.security import create_access_token, verify_secret
from app.models.moderator import Moderator
from app.schemas.auth import ModeratorToken, NameEintragen, PinEinrichten, PinVerifizieren
from app.services import auth_service
from app.services.config_service import config_service

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
    """Trägt den Namen dauerhaft im Cookie ein. Weicht der neue Name vom
    bisherigen Cookie-Wert ab, wird das für die Moderator-Auswertung
    protokolliert (DSGVO-Hinweis ist in der App sichtbar)."""
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


@router.post("/pin/einrichten", status_code=status.HTTP_204_NO_CONTENT)
async def pin_einrichten(
    db: DbSession, person: CurrentPerson, daten: PinEinrichten
) -> None:
    """PIN-Einrichtung ist nur im Gerätehaus möglich (Standort-Check)."""
    geofence_lat = await config_service.get(db, "geofence_lat", 0.0)
    geofence_lon = await config_service.get(db, "geofence_lon", 0.0)
    radius = await config_service.get(db, "geofence_radius_meter", 150)
    if not innerhalb_geofence(daten.lat, daten.lon, geofence_lat, geofence_lon, radius):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="PIN-Einrichtung ist nur im Gerätehaus möglich.",
        )
    pin_laenge = await config_service.get(db, "pin_laenge", 4)
    if len(daten.pin) != pin_laenge or not daten.pin.isdigit():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"PIN muss aus genau {pin_laenge} Ziffern bestehen.",
        )
    await auth_service.pin_einrichten(db, person, daten.pin)


@router.post("/pin/verifizieren", status_code=status.HTTP_204_NO_CONTENT)
async def pin_verifizieren(
    response: Response, person: CurrentPerson, daten: PinVerifizieren
) -> None:
    """Stellt nach erfolgreicher PIN-Prüfung ein signiertes Session-Cookie
    aus, das den Außenzugriff auf freigegebene Bereiche ermöglicht."""
    if not person.pin_gesetzt or not person.pin_hash or not verify_secret(
        daten.pin, person.pin_hash
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Falscher PIN.")
    token = erstelle_pin_session(person.id)
    response.set_cookie(
        PIN_SESSION_COOKIE,
        token,
        max_age=PIN_SESSION_MAX_AGE_SECONDS,
        httponly=True,
        samesite="lax",
    )


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
