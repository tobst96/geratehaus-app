from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pin_session import PIN_SESSION_COOKIE, lese_pin_session
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.moderator import Moderator
from app.models.person import Person
from app.services.config_service import config_service

DbSession = Annotated[AsyncSession, Depends(get_db)]

_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/moderator/login", auto_error=False)


async def get_current_moderator(
    db: DbSession, token: Annotated[str | None, Depends(_oauth2_scheme)] = None
) -> Moderator:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Nicht angemeldet.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token is None:
        raise credentials_error
    payload = decode_access_token(token)
    if payload is None or "sub" not in payload:
        raise credentials_error
    result = await db.execute(select(Moderator).where(Moderator.username == payload["sub"]))
    moderator = result.scalar_one_or_none()
    if moderator is None:
        raise credentials_error
    return moderator


CurrentModerator = Annotated[Moderator, Depends(get_current_moderator)]


async def get_current_person(
    db: DbSession, geraetehaus_name: Annotated[str | None, Cookie()] = None
) -> Person:
    """Liest den im Cookie gespeicherten Namen und lädt/erstellt die Person.
    Kein Login – die Identität basiert allein auf dem Namens-Cookie."""
    if not geraetehaus_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kein Name gesetzt. Bitte zunächst einen Namen eintragen.",
        )
    result = await db.execute(select(Person).where(Person.name == geraetehaus_name))
    person = result.scalar_one_or_none()
    if person is None:
        person = Person(name=geraetehaus_name)
        db.add(person)
        await db.commit()
        await db.refresh(person)
    return person


CurrentPerson = Annotated[Person, Depends(get_current_person)]


async def get_current_person_via_pin_session(
    db: DbSession, pin_session: Annotated[str | None, Cookie(alias=PIN_SESSION_COOKIE)] = None
) -> Person:
    """Für den Außenzugriff (Fahrzeugkalender, eigene Dienststunden) ohne
    Standort-Check. Setzt voraus, dass zuvor /auth/pin/verifizieren erfolgreich
    aufgerufen wurde und das signierte Session-Cookie vorliegt."""
    if pin_session is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Kein gültiger PIN-Zugang. Bitte zunächst den PIN verifizieren.",
        )
    person_id = lese_pin_session(pin_session)
    if person_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="PIN-Sitzung abgelaufen. Bitte erneut verifizieren.",
        )
    result = await db.execute(select(Person).where(Person.id == person_id))
    person = result.scalar_one_or_none()
    if person is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unbekannte Person.")
    return person


CurrentPersonViaPin = Annotated[Person, Depends(get_current_person_via_pin_session)]


def require_modul_aktiv(config_schluessel: str):
    """Dependency-Factory: sperrt eine Route, wenn das zugehörige Modul über
    den Moderator-Bereich deaktiviert wurde (z. B. 'modul_dienstbuch_aktiv')."""

    async def _check(db: DbSession) -> None:
        aktiv = await config_service.get(db, config_schluessel, True)
        if not aktiv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dieses Modul ist auf dieser Instanz deaktiviert.",
            )

    return _check
