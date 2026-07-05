from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentModerator, DbSession, require_modul_zugriff
from app.schemas.berechtigung import (
    BerechtigungMatrixOut,
    BerechtigungSetzen,
    ModeratorBerechtigungOut,
    ModulKurz,
)
from app.services import audit_service, berechtigungs_service

# Phase 4b: dieses Modul ist jetzt granular geschützt – Admins immer (Bypass),
# andere Moderatoren nur mit Freigabe des Moduls „berechtigungen".
router = APIRouter(
    prefix="/moderator/berechtigungen",
    tags=["moderator:berechtigungen"],
    dependencies=[Depends(require_modul_zugriff("berechtigungen"))],
)


@router.get("", response_model=BerechtigungMatrixOut)
async def berechtigungen_matrix(db: DbSession) -> BerechtigungMatrixOut:
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
    db: DbSession, akteur: CurrentModerator, moderator_id: int, modul_key: str, daten: BerechtigungSetzen
) -> None:
    """Erteilt/entzieht einem Moderator den Zugriff auf ein Modul (Admin-only)."""
    ok = await berechtigungs_service.set_berechtigung(db, moderator_id, modul_key, daten.erlaubt)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Moderator oder Modul nicht gefunden."
        )
    verb = "freigegeben" if daten.erlaubt else "entzogen"
    await audit_service.protokolliere(
        db, akteur.username, "berechtigung_geaendert", "moderator", moderator_id,
        f"Modul '{modul_key}' {verb}",
    )
