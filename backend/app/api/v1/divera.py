from typing import Any

from fastapi import APIRouter, HTTPException, Request, status

from app.api.deps import CurrentModerator, DbSession
from app.core.config import settings
from app.services import divera_service

router = APIRouter(prefix="/divera", tags=["divera"])


@router.post("/webhook", status_code=status.HTTP_204_NO_CONTENT)
async def webhook(db: DbSession, request: Request, accesskey: str) -> None:
    """Empfängt Alarme per Push, sofern Divera im Webhook-Modus konfiguriert
    ist. Die URL muss bei Divera mit demselben accesskey hinterlegt werden,
    der auch für den Polling-Modus in der .env steht."""
    if not settings.divera_enabled or settings.divera_mode != "webhook":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Divera-Webhook ist nicht aktiv."
        )
    if accesskey != settings.divera_api_key:
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
