from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select

from app.api.deps import DbSession
from app.core.security import create_access_token, verify_secret
from app.models.moderator import Moderator
from app.schemas.auth import ModeratorToken, NameEintragen
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
