from fastapi import APIRouter, HTTPException, Request, status

from app.api.deps import DbSession
from app.schemas.einsatz import TeilnahmeOut
from app.schemas.person import PersonOut
from app.schemas.reservierung import ReservierungEinloesen, ReservierungInfo
from app.services import einsatz_service, reservierung_service, stammdaten_service

router = APIRouter(prefix="/reservierungen", tags=["reservierungen"])


@router.get("/{token}", response_model=ReservierungInfo)
async def reservierung_info(db: DbSession, token: str) -> ReservierungInfo:
    """Kontext für die mobile Eintragungs-Seite – bewusst ohne Auth, der Token
    selbst ist das Geheimnis (kurzlebig, einmal verwendbar)."""
    reservierung = await reservierung_service.get_reservierung_by_token(db, token)
    if reservierung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservierung nicht gefunden.")

    einsatz = await einsatz_service.get_einsatz(db, reservierung.einsatz_id)
    if einsatz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Einsatz nicht gefunden.")

    fahrzeug_name = None
    if reservierung.fahrzeug_id is not None:
        fahrzeug = await stammdaten_service.get_fahrzeug(db, reservierung.fahrzeug_id)
        fahrzeug_name = fahrzeug.name if fahrzeug else None

    return ReservierungInfo(
        bezeichnung=reservierung.bezeichnung,
        einsatz_titel=einsatz.titel,
        fahrzeug_name=fahrzeug_name,
        abgelaufen=reservierung_service.ist_abgelaufen(reservierung),
        bereits_eingeloest=reservierung.eingeloest,
        nur_geraetehaus=reservierung.nur_geraetehaus,
        auf_anfahrt=reservierung.auf_anfahrt,
    )


@router.get("/{token}/personen", response_model=list[PersonOut])
async def reservierung_personen(db: DbSession, token: str) -> list[PersonOut]:
    """Personen zur Auswahl auf der mobilen Eintragungs-Seite – der Token
    selbst ist auch hier das Geheimnis, das den Zugriff erlaubt."""
    reservierung = await reservierung_service.get_reservierung_by_token(db, token)
    if reservierung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservierung nicht gefunden.")
    return await stammdaten_service.liste_personen(db)


def _client_ip(request: Request) -> str | None:
    weitergeleitet = request.headers.get("x-real-ip") or request.headers.get("x-forwarded-for")
    if weitergeleitet:
        return weitergeleitet.split(",")[0].strip()
    return request.client.host if request.client else None


@router.post("/{token}/einloesen", response_model=TeilnahmeOut)
async def reservierung_einloesen(
    db: DbSession, request: Request, token: str, daten: ReservierungEinloesen
) -> TeilnahmeOut:
    reservierung = await reservierung_service.get_reservierung_by_token(db, token)
    if reservierung is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservierung nicht gefunden.")
    if reservierung.eingeloest:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Diese Reservierung wurde bereits genutzt."
        )
    if reservierung_service.ist_abgelaufen(reservierung):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Diese Reservierung ist abgelaufen.")

    try:
        return await reservierung_service.reservierung_einloesen(
            db,
            reservierung,
            daten,
            ip=_client_ip(request),
            user_agent=request.headers.get("user-agent"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
