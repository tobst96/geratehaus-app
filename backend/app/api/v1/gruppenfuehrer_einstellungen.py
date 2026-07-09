from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.api.deps import DbSession, require_modul_zugriff
from app.services import archive_service, druck_service, logo_service
from app.services.config_service import config_service
from app.services.druck_service import DruckFehler
from app.services.notifier.email import EmailNotifier

# Phase 4b: granular geschützt – Admins immer (Bypass), sonst Freigabe von
# „einstellungen" nötig.
router = APIRouter(
    prefix="/gruppenfuehrer/einstellungen",
    tags=["gruppenfuehrer:einstellungen"],
    dependencies=[Depends(require_modul_zugriff("einstellungen"))],
)


@router.get("")
async def einstellungen_lesen(db: DbSession) -> dict[str, Any]:
    """Alle app_config-Werte. Wirkt als einzige Quelle der Wahrheit für die
    Einstellungen-UI im Moderator-Bereich."""
    return await config_service.get_all(db, refresh=True)


@router.put("")
async def einstellungen_schreiben(
    db: DbSession, werte: dict[str, Any]
) -> dict[str, Any]:
    """Schreibt beliebig viele app_config-Werte auf einmal, sofort wirksam
    ohne Neustart (Cache wird invalidiert)."""
    await config_service.set_many(db, werte)
    return await config_service.get_all(db, refresh=True)


@router.post("/logo")
async def logo_hochladen(
    db: DbSession, datei: UploadFile
) -> dict[str, str]:
    logo_url = await logo_service.logo_speichern(datei)
    await config_service.set(db, "logo_url", logo_url)
    return {"logo_url": logo_url}


@router.post("/logo-dark")
async def logo_dark_hochladen(db: DbSession, datei: UploadFile) -> dict[str, str]:
    """Alternatives Logo für den Dark Mode."""
    logo_url = await logo_service.logo_speichern(datei, variante="logo-dark")
    await config_service.set(db, "logo_url_dark", logo_url)
    return {"logo_url_dark": logo_url}


@router.post("/email-testen", status_code=status.HTTP_204_NO_CONTENT)
async def email_testen(db: DbSession) -> None:
    """Sendet eine Testmail mit der aktuell gespeicherten SMTP-Konfiguration,
    damit Fehler in den Einstellungen sofort sichtbar werden (statt erst beim
    nächsten echten Ereignis, dessen Versand bei Fehlern nur geloggt wird)."""
    try:
        await EmailNotifier().test_versenden(db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Versand fehlgeschlagen: {exc}"
        ) from exc


@router.post("/testdruck", status_code=status.HTTP_204_NO_CONTENT)
async def testdruck(db: DbSession) -> None:
    """Druckt eine kleine Test-Seite am konfigurierten Netzwerkdrucker (IPP),
    damit Fehler in der Drucker-Konfiguration sofort sichtbar werden (analog
    zur Testmail)."""
    try:
        await druck_service.test_drucken(db)
    except DruckFehler as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Druck fehlgeschlagen: {exc}"
        ) from exc


@router.post("/archivierung-ausfuehren")
async def archivierung_ausfuehren(db: DbSession) -> dict[str, int]:
    """Stößt die tägliche Archivierung sofort an, unabhängig vom
    Scheduler-Zeitpunkt (z. B. zum Testen nach einer Konfigurationsänderung)."""
    return await archive_service.archiviere_alte_eintraege(db)
