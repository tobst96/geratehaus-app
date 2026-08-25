from typing import Annotated

from fastapi import Cookie, Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import mitglied_session
from app.core.security import decode_access_token, sicherheit_stand_claim
from app.db.session import get_db
from app.models.person import Person
from app.services.config_service import config_service

DbSession = Annotated[AsyncSession, Depends(get_db)]

_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/gruppenfuehrer/login", auto_error=False)


async def get_current_gruppenfuehrer(
    db: DbSession, token: Annotated[str | None, Depends(_oauth2_scheme)] = None
) -> Person:
    """Der/die im Gruppenführerbereich angemeldete **Person** (Konto). Das JWT trägt
    im `sub` die stabile `Person.id` (nicht den Namen - der ändert sich bei
    Stammdaten-Bearbeitung und würde ein gültiges Token sonst sofort entwerten);
    zusätzlich muss die Person „elevated" sein (`gruppenfuehrer_rolle` gesetzt), sonst
    401 – eine normale Person ohne erhöhte Rechte kommt so nicht in den
    Gruppenführerbereich. Außerdem muss der `sicherheit_stand`-Claim (Snapshot von
    `sicherheit_geaendert_am` beim Ausstellen) exakt zum aktuellen DB-Wert passen -
    Passwortänderung/2FA-Reset setzen den DB-Wert neu und entwerten damit sofort alle
    zuvor ausgestellten Tokens (sonst blieb ein gestohlenes Token bis zum regulären
    Ablauf, `jwt_expire_minutes`, gültig)."""
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
    try:
        person_id = int(payload["sub"])
    except (TypeError, ValueError):
        raise credentials_error
    result = await db.execute(select(Person).where(Person.id == person_id))
    person = result.scalar_one_or_none()
    if person is None or person.gruppenfuehrer_rolle is None:
        raise credentials_error
    if payload.get("sicherheit_stand") != sicherheit_stand_claim(person.sicherheit_geaendert_am):
        raise credentials_error
    return person


CurrentGruppenfuehrer = Annotated[Person, Depends(get_current_gruppenfuehrer)]


async def get_current_admin(person: CurrentGruppenfuehrer) -> Person:
    """Wie CurrentGruppenfuehrer, verlangt zusätzlich die Rolle "admin". Personal,
    Einstellungen und Verwaltung sind Admin-only; Gruppenführer sehen nur ihre
    freigegebenen Bereiche (CurrentGruppenfuehrer + granulare Rechte)."""
    if person.gruppenfuehrer_rolle != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur für Admins zugänglich.",
        )
    return person


CurrentAdmin = Annotated[Person, Depends(get_current_admin)]


async def get_current_person(
    db: DbSession, geraetehaus_name: Annotated[str | None, Cookie()] = None
) -> Person:
    """Lädt die Person aus dem **signierten** Namens-Cookie. Der Cookie-Wert wird
    ausschließlich nach echter Identifikation (Barcode/Name+PIN) ausgestellt und
    hier über den `cookie_secret_key` verifiziert – ein manipuliertes/fehlendes
    Cookie führt zu 401 (kein Anlegen fremder Identitäten mehr)."""
    name = mitglied_session.lese_name(geraetehaus_name)
    if not name:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nicht angemeldet. Bitte per Barcode oder Name+PIN identifizieren.",
        )
    result = await db.execute(select(Person).where(Person.name == name))
    person = result.scalar_one_or_none()
    if person is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Person nicht gefunden. Bitte erneut identifizieren.",
        )
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
    Gruppenführer (Bearer-JWT) oder Mitglied (Namens-Cookie). Verhindert, dass Einsätze/
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
    # 2) Mitglied (signierter Namens-Cookie – bloße Präsenz genügt nicht mehr)
    if mitglied_session.lese_name(geraetehaus_name) is not None:
        return
    # 3) Gruppenführer (signiertes Bearer-JWT genügt fürs Gate)
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
    den Gruppenführer-Bereich deaktiviert wurde (z. B. 'modul_dienstbuch_aktiv')."""

    async def _check(db: DbSession) -> None:
        aktiv = await config_service.get(db, config_schluessel, True)
        if not aktiv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dieses Modul ist auf dieser Instanz deaktiviert.",
            )

    return _check


def require_modul_zugriff(modul_key: str):
    """Dependency-Factory für das granulare Berechtigungssystem: verlangt, dass die
    angemeldete (elevated) Person Zugriff auf das Modul `modul_key` hat (Admins
    immer, via Admin-Bypass in berechtigungs_service). Gibt die Person zurück, sonst 403."""

    async def _check(person: CurrentGruppenfuehrer, db: DbSession) -> Person:
        # lokaler Import vermeidet einen Import-Zyklus (Service nutzt Models/Config)
        from app.services import berechtigungs_service

        if await berechtigungs_service.hat_zugriff(db, person, modul_key):
            return person
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Kein Zugriff auf dieses Modul.",
        )

    return _check
