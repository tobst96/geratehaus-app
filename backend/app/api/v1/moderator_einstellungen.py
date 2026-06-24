from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile, status

from app.api.deps import CurrentModerator, DbSession
from app.core.security import verify_secret
from app.schemas.auth import PasswortVerifizieren
from app.services import archive_service, logo_service
from app.services.config_service import config_service

router = APIRouter(prefix="/moderator/einstellungen", tags=["moderator:einstellungen"])


@router.post("/verifizieren", status_code=status.HTTP_204_NO_CONTENT)
async def passwort_verifizieren(_db: DbSession, moderator: CurrentModerator, daten: PasswortVerifizieren) -> None:
    """Erneute Passwortabfrage, bevor die Einstellungen (inkl. Divera API-Key)
    angezeigt werden – schützt vor unbeaufsichtigten, eingeloggten Sitzungen."""
    if not verify_secret(daten.passwort, moderator.passwort_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Passwort falsch.")


@router.get("")
async def einstellungen_lesen(db: DbSession, _moderator: CurrentModerator) -> dict[str, Any]:
    """Alle app_config-Werte. Wirkt als einzige Quelle der Wahrheit für die
    Einstellungen-UI im Moderator-Bereich."""
    return await config_service.get_all(db, refresh=True)


@router.put("")
async def einstellungen_schreiben(
    db: DbSession, _moderator: CurrentModerator, werte: dict[str, Any]
) -> dict[str, Any]:
    """Schreibt beliebig viele app_config-Werte auf einmal, sofort wirksam
    ohne Neustart (Cache wird invalidiert)."""
    await config_service.set_many(db, werte)
    return await config_service.get_all(db, refresh=True)


@router.post("/logo")
async def logo_hochladen(
    db: DbSession, _moderator: CurrentModerator, datei: UploadFile
) -> dict[str, str]:
    logo_url = await logo_service.logo_speichern(datei)
    await config_service.set(db, "logo_url", logo_url)
    return {"logo_url": logo_url}


@router.post("/archivierung-ausfuehren")
async def archivierung_ausfuehren(db: DbSession, _moderator: CurrentModerator) -> dict[str, int]:
    """Stößt die tägliche Archivierung sofort an, unabhängig vom
    Scheduler-Zeitpunkt (z. B. zum Testen nach einer Konfigurationsänderung)."""
    return await archive_service.archiviere_alte_eintraege(db)
