from typing import Annotated

from fastapi import Cookie, Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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


async def get_current_admin(moderator: CurrentModerator) -> Moderator:
    """Wie CurrentModerator, verlangt zusätzlich die Rolle "admin". Personal,
    Einstellungen, Punkte und Barcodes sind Admin-only; Gruppenführer sehen
    nur Einsatzberichte/Dienstbuch/Fahrzeugbuchungen (CurrentModerator)."""
    if moderator.rolle != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur für Admins zugänglich.",
        )
    return moderator


CurrentAdmin = Annotated[Moderator, Depends(get_current_admin)]


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


async def require_zugriff(
    db: DbSession,
    token: Annotated[str | None, Depends(_oauth2_scheme)] = None,
    geraetehaus_name: Annotated[str | None, Cookie()] = None,
    x_kiosk_token: Annotated[str | None, Header()] = None,
) -> None:
    """Zugriffs-Gate für die (sonst öffentlichen) Daten-Endpunkte: lässt durch, wenn
    mindestens EINE Identität vorliegt – Kiosk-Token (Header `X-Kiosk-Token`),
    Moderator (Bearer-JWT) oder Mitglied (Namens-Cookie). Verhindert, dass Einsätze/
    Stammdaten/Buchungen anonym über die offene API abgefragt werden.

    Phase 1: Der Mitglieder-Cookie ist noch nicht kryptografisch gesichert (per Name
    setzbar) – akzeptiert, um den Außenzugriff nicht zu brechen; eine echte, signierte
    Mitglieder-Session folgt separat (Phase 2)."""
    # 1) Kiosk-Token (Tablet im Gerätehaus)
    if x_kiosk_token:
        # lokaler Import vermeidet Import-Zyklen (Service nutzt Models/Config)
        from app.services import kiosk_token_service

        if await kiosk_token_service.get_by_token(db, x_kiosk_token) is not None:
            return
    # 2) Mitglied (Namens-Cookie)
    if geraetehaus_name:
        return
    # 3) Moderator (signiertes Bearer-JWT genügt fürs Gate)
    if token:
        payload = decode_access_token(token)
        if payload is not None and "sub" in payload:
            return
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Nicht angemeldet.",
        headers={"WWW-Authenticate": "Bearer"},
    )


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


def require_modul_zugriff(modul_key: str):
    """Dependency-Factory für das granulare Berechtigungssystem: verlangt, dass der
    angemeldete Moderator Zugriff auf das Modul `modul_key` hat (Admins immer, via
    Admin-Bypass in berechtigungs_service). Gibt den Moderator zurück, sonst 403.

    Phase 4-Werkzeug: bewusst noch NICHT auf bestehende Endpunkte angewandt – die
    schrittweise Umstellung (inkl. Datenmigration Rollen→Rechte) erfolgt separat,
    damit bestehende Zugänge nicht ausgesperrt werden."""

    async def _check(moderator: CurrentModerator, db: DbSession) -> Moderator:
        # lokaler Import vermeidet einen Import-Zyklus (Service nutzt Models/Config)
        from app.services import berechtigungs_service

        if await berechtigungs_service.hat_zugriff(db, moderator, modul_key):
            return moderator
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Kein Zugriff auf dieses Modul.",
        )

    return _check
