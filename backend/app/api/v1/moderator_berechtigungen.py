from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentAdmin, DbSession
from app.schemas.berechtigung import (
    BerechtigungMatrixOut,
    BerechtigungSetzen,
    ModeratorBerechtigungOut,
    ModulKurz,
)
from app.services import berechtigungs_service

router = APIRouter(prefix="/moderator/berechtigungen", tags=["moderator:berechtigungen"])


@router.get("", response_model=BerechtigungMatrixOut)
async def berechtigungen_matrix(db: DbSession, _admin: CurrentAdmin) -> BerechtigungMatrixOut:
    """Matrix Moderatoren × Module für die Admin-Seite „Berechtigungen"."""
    module, moderatoren, keys_je_moderator = await berechtigungs_service.matrix(db)
    return BerechtigungMatrixOut(
        module=[ModulKurz(key=m.key, name=m.name) for m in module],
        moderatoren=[
            ModeratorBerechtigungOut(
                id=mod.id,
                username=mod.username,
                rolle=mod.rolle,
                ist_admin=berechtigungs_service.ist_admin(mod),
                module=sorted(keys_je_moderator.get(mod.id, set())),
            )
            for mod in moderatoren
        ],
    )


@router.put("/{moderator_id}/{modul_key}", status_code=status.HTTP_204_NO_CONTENT)
async def berechtigung_setzen(
    db: DbSession, _admin: CurrentAdmin, moderator_id: int, modul_key: str, daten: BerechtigungSetzen
) -> None:
    """Erteilt/entzieht einem Moderator den Zugriff auf ein Modul (Admin-only)."""
    ok = await berechtigungs_service.set_berechtigung(db, moderator_id, modul_key, daten.erlaubt)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Moderator oder Modul nicht gefunden."
        )
