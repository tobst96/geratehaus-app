from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentGruppenfuehrer, DbSession, require_modul_zugriff
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
    prefix="/gruppenfuehrer/berechtigungen",
    tags=["moderator:berechtigungen"],
    dependencies=[Depends(require_modul_zugriff("berechtigungen"))],
)


@router.get("", response_model=BerechtigungMatrixOut)
async def berechtigungen_matrix(db: DbSession) -> BerechtigungMatrixOut:
    """Matrix (elevated) Personen × Module für die Admin-Seite „Berechtigungen"."""
    module, personen, keys_je_person = await berechtigungs_service.matrix(db)
    return BerechtigungMatrixOut(
        module=[ModulKurz(key=m.key, name=m.name) for m in module],
        moderatoren=[
            ModeratorBerechtigungOut(
                id=p.id,
                username=p.name,
                rolle=p.gruppenfuehrer_rolle or "",
                ist_admin=berechtigungs_service.ist_admin(p),
                module=sorted(keys_je_person.get(p.id, set())),
            )
            for p in personen
        ],
    )


@router.put("/{person_id}/{modul_key}", status_code=status.HTTP_204_NO_CONTENT)
async def berechtigung_setzen(
    db: DbSession, akteur: CurrentGruppenfuehrer, person_id: int, modul_key: str, daten: BerechtigungSetzen
) -> None:
    """Erteilt/entzieht einer (elevated) Person den Zugriff auf ein Modul (Admin-only)."""
    ok = await berechtigungs_service.set_berechtigung(db, person_id, modul_key, daten.erlaubt)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Person oder Modul nicht gefunden."
        )
    verb = "freigegeben" if daten.erlaubt else "entzogen"
    await audit_service.protokolliere(
        db, akteur.name, "berechtigung_geaendert", "person", person_id,
        f"Modul '{modul_key}' {verb}",
    )
