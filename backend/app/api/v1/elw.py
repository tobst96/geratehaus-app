"""Öffentlicher ELW-Upload-Endpunkt (Login-los, token-gestützt).

Bewusst KEIN `require_zugriff`/Login: das HMAC-signierte Token im Pfad IST die
Berechtigung. Zusätzlich rate-limitiert und nur gültig, solange der zugehörige
Einsatz offen ist (sonst 410). Uploads werden vom Server (mit dessen MinIO-
Credentials) in den Einsatz-Ordner gelegt – der Client sieht die Zugangsdaten nie.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.deps import DbSession
from app.core.rate_limit import rate_limit
from app.services import elw_service

router = APIRouter(prefix="/elw", tags=["elw"])


def _fehler_zu_http(exc: Exception) -> HTTPException:
    if isinstance(exc, elw_service.ElwEinsatzGeschlossen):
        return HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Der Einsatz ist abgeschlossen – der Upload-Link ist nicht mehr gültig.",
        )
    if isinstance(exc, elw_service.ElwTokenUngueltig):
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Ungültiger oder abgelaufener Link."
        )
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/{token}", dependencies=[Depends(rate_limit(60, 60))])
async def elw_einsatz_info(db: DbSession, token: str) -> dict:
    """Basisdaten des Einsatzes für die Upload-Seite (nur bei gültigem Token + offenem
    Einsatz)."""
    try:
        return await elw_service.einsatz_info(db, token)
    except (elw_service.ElwTokenUngueltig, elw_service.ElwEinsatzGeschlossen) as exc:
        raise _fehler_zu_http(exc) from exc


@router.post("/{token}/upload", dependencies=[Depends(rate_limit(30, 60))])
async def elw_upload(
    db: DbSession, token: str, datei: Annotated[UploadFile, File()]
) -> dict:
    """Login-loser Upload in den Einsatz-Ordner. Token prüft Berechtigung + „Einsatz
    offen?"; Datei wird bereinigt (Magic-Bytes/EXIF) und in MinIO abgelegt."""
    inhalt = await datei.read()
    try:
        name = await elw_service.upload_verarbeiten(db, token, datei.filename, inhalt, datei.content_type)
    except (elw_service.ElwTokenUngueltig, elw_service.ElwEinsatzGeschlossen, elw_service.ElwFehler) as exc:
        raise _fehler_zu_http(exc) from exc
    return {"ok": True, "dateiname": name}
