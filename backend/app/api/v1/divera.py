import hmac
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status

from app.api.deps import CurrentModerator, DbSession
from app.core.rate_limit import rate_limit
from app.services import divera_client, divera_service
from app.services.config_service import config_service

router = APIRouter(prefix="/divera", tags=["divera"])


@router.post(
    "/webhook",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(rate_limit(60, 60))],
)
async def webhook(
    db: DbSession,
    request: Request,
    accesskey: str | None = None,
    x_divera_accesskey: str | None = Header(default=None),
) -> None:
    """Empfängt Alarme per Push, sofern Divera im Webhook-Modus konfiguriert
    ist. Der accesskey muss dem in den Moderator-Einstellungen gepflegten Divera
    API-Key entsprechen und kann **entweder** im Header `X-Divera-Accesskey`
    (bevorzugt – hält das Secret aus URL/Access-Logs heraus) **oder** – wie bisher,
    rückwärtskompatibel – als `?accesskey=`-Query-Parameter übergeben werden.

    Der öffentlich erreichbare Endpunkt ist ratenbegrenzt (60/min pro IP), und
    der accesskey wird **zeitkonstant** verglichen (`hmac.compare_digest`), damit
    weder Brute-Force noch ein Timing-Seitenkanal den Divera-API-Key preisgeben."""
    divera_aktiv = await config_service.get(db, "divera_aktiv", False)
    divera_modus = await config_service.get(db, "divera_modus", "polling")
    api_key = await config_service.get(db, "divera_api_key", "")
    if not divera_aktiv or divera_modus != "webhook":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Divera-Webhook ist nicht aktiv."
        )
    # Header bevorzugt (Secret nicht in der URL); Query-Param bleibt kompatibel.
    # Nicht konfigurierter Key darf niemals durch einen leeren accesskey passieren.
    schluessel = x_divera_accesskey or accesskey or ""
    if not api_key or not hmac.compare_digest(schluessel.encode(), api_key.encode()):
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


@router.post("/einsaetze-nachholen")
async def einsaetze_nachholen(
    db: DbSession, _moderator: CurrentModerator, tage: int = 1
) -> dict[str, int]:
    """Holt die Alarm-HISTORIE der letzten `tage` Tage über /api/v2/alarms und
    importiert fehlende Einsätze (Upsert über divera_id). Anders als der
    Polling-Endpoint /pull/all enthält die Historie auch bereits geschlossene
    Alarme – damit lassen sich verpasste Einsätze zuverlässig nachholen."""
    if tage < 1 or tage > 31:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Zeitraum muss zwischen 1 und 31 Tagen liegen."
        )
    # Manuelles Nachholen braucht nur das aktive Modul + API-Key, nicht das
    # automatische Polling.
    modul_aktiv = await config_service.get(db, "modul_divera_aktiv", False)
    api_key = await config_service.get(db, "divera_api_key", "")
    if not modul_aktiv or not api_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Divera-Modul ist nicht aktiv oder kein API-Key konfiguriert.")

    alarme = await divera_client.hole_alarme_historie(api_key, tage=tage)

    anzahl_neu = 0
    for roh in alarme:
        einsatz = await divera_service.importiere_alarm(db, roh)
        if einsatz is not None:
            anzahl_neu += 1

    return {"anzahl_gefunden": len(alarme), "anzahl_neu": anzahl_neu}
