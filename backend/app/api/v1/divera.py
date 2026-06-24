from typing import Any

from fastapi import APIRouter, HTTPException, Request, status

from app.api.deps import CurrentModerator, DbSession
from app.services import divera_service
from app.services.config_service import config_service

router = APIRouter(prefix="/divera", tags=["divera"])


@router.post("/webhook", status_code=status.HTTP_204_NO_CONTENT)
async def webhook(db: DbSession, request: Request, accesskey: str) -> None:
    """Empfängt Alarme per Push, sofern Divera im Webhook-Modus konfiguriert
    ist. Die URL muss bei Divera mit demselben accesskey hinterlegt werden,
    der auch in den Moderator-Einstellungen als Divera API-Key gepflegt ist."""
    divera_aktiv = await config_service.get(db, "divera_aktiv", False)
    divera_modus = await config_service.get(db, "divera_modus", "polling")
    api_key = await config_service.get(db, "divera_api_key", "")
    if not divera_aktiv or divera_modus != "webhook":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Divera-Webhook ist nicht aktiv."
        )
    if accesskey != api_key:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ungültiger accesskey.")

    payload: dict[str, Any] = await request.json()
    alarm = payload.get("alarm", payload)
    await divera_service.importiere_alarm(db, alarm)


@router.post("/synchronisieren")
async def manuell_synchronisieren(db: DbSession, _moderator: CurrentModerator) -> dict[str, int]:
    """Stößt im Polling-Modus eine sofortige Synchronisation an (z. B. zum
    Testen der Konfiguration), unabhängig vom Scheduler-Intervall."""
    anzahl_neu = await divera_service.synchronisiere(db)
    return {"anzahl_neu": anzahl_neu}
