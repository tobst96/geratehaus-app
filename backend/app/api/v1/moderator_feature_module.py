from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentModerator, DbSession, require_modul_zugriff
from app.schemas.feature_modul import FeatureModulFlagSetzen, FeatureModulOut, ReihenfolgeSetzen
from app.services import audit_service, feature_modul_service

# Granular geschützt: Admins immer (Bypass), sonst Freigabe „einstellungen".
router = APIRouter(
    prefix="/moderator/feature-module",
    tags=["moderator:feature-module"],
    dependencies=[Depends(require_modul_zugriff("einstellungen"))],
)


@router.get("", response_model=list[FeatureModulOut])
async def feature_module_liste(db: DbSession) -> list[FeatureModulOut]:
    """Feature-Module in konfigurierter Reihenfolge inkl. An/Aus, Kiosk und Außenzugriff."""
    return await feature_modul_service.liste(db)


@router.put("/reihenfolge", response_model=list[FeatureModulOut])
async def reihenfolge_setzen(db: DbSession, daten: ReihenfolgeSetzen) -> list[FeatureModulOut]:
    """Speichert die Modul-Reihenfolge (erwartet alle Feature-Modul-Keys je einmal)."""
    if not await feature_modul_service.set_reihenfolge(db, daten.keys):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ungültige Reihenfolge – es müssen genau alle Modul-Keys je einmal angegeben werden.",
        )
    return await feature_modul_service.liste(db)


@router.patch("/{key}", response_model=FeatureModulOut)
async def flag_setzen(
    db: DbSession, akteur: CurrentModerator, key: str, daten: FeatureModulFlagSetzen
) -> FeatureModulOut:
    """Setzt aktiv/startseite/aussenzugriff eines Moduls (nur gesetzte Felder)."""
    if feature_modul_service.get_def(key) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modul nicht gefunden.")
    gesetzt = daten.model_dump(exclude_unset=True)
    for feld, wert in gesetzt.items():
        if not await feature_modul_service.set_flag(db, key, feld, wert):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Feld {feld} ist für dieses Modul nicht zulässig.",
            )
    if gesetzt:
        aenderungen = ", ".join(f"{feld}={wert}" for feld, wert in gesetzt.items())
        await audit_service.protokolliere(
            db, akteur.name, "modul_flag_geaendert", "feature_modul", None,
            f"{key}: {aenderungen}",
        )
    eintrag = await feature_modul_service.eintrag(db, key)
    assert eintrag is not None
    return eintrag
