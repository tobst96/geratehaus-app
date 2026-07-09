from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import DbSession, require_modul_zugriff
from app.schemas.modul import ModulAktivSetzen, ModulOut
from app.services import modul_service

# Phase 4b: granular geschützt – Admins immer (Bypass), sonst Freigabe von
# „einstellungen" nötig (Modulverwaltung gehört zu den Einstellungen).
router = APIRouter(
    prefix="/gruppenfuehrer/module",
    tags=["moderator:module"],
    dependencies=[Depends(require_modul_zugriff("einstellungen"))],
)


@router.get("", response_model=list[ModulOut])
async def module_liste(db: DbSession) -> list[ModulOut]:
    """Alle registrierten Module (Einstellungsseite „Module")."""
    return await modul_service.liste_module(db)


@router.patch("/{key}", response_model=ModulOut)
async def modul_aktiv_setzen(db: DbSession, key: str, daten: ModulAktivSetzen) -> ModulOut:
    """Aktiv-Status eines Moduls umschalten."""
    modul = await modul_service.set_aktiv(db, key, daten.aktiv)
    if modul is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modul nicht gefunden.")
    return modul
