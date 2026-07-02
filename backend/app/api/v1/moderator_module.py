from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentAdmin, DbSession
from app.schemas.modul import ModulAktivSetzen, ModulOut
from app.services import modul_service

router = APIRouter(prefix="/moderator/module", tags=["moderator:module"])


@router.get("", response_model=list[ModulOut])
async def module_liste(db: DbSession, _admin: CurrentAdmin) -> list[ModulOut]:
    """Alle registrierten Module (Einstellungsseite „Module"). Admin-only."""
    return await modul_service.liste_module(db)


@router.patch("/{key}", response_model=ModulOut)
async def modul_aktiv_setzen(
    db: DbSession, _admin: CurrentAdmin, key: str, daten: ModulAktivSetzen
) -> ModulOut:
    """Aktiv-Status eines Moduls umschalten. Admin-only."""
    modul = await modul_service.set_aktiv(db, key, daten.aktiv)
    if modul is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modul nicht gefunden.")
    return modul
