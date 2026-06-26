from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile, status

from app.api.deps import CurrentAdmin, DbSession
from app.core.security import verify_secret
from app.schemas.auth import PasswortVerifizieren
from app.schemas.moderator import ModeratorAnlegen, ModeratorOut, ModeratorPasswortAendern
from app.services import archive_service, logo_service, moderator_service
from app.services.config_service import config_service
from app.services.notifier.email import EmailNotifier

router = APIRouter(prefix="/moderator/einstellungen", tags=["moderator:einstellungen"])


@router.post("/verifizieren", status_code=status.HTTP_204_NO_CONTENT)
async def passwort_verifizieren(_db: DbSession, admin: CurrentAdmin, daten: PasswortVerifizieren) -> None:
    """Erneute Passwortabfrage, bevor die Einstellungen (inkl. Divera API-Key)
    angezeigt werden – schützt vor unbeaufsichtigten, eingeloggten Sitzungen."""
    if not verify_secret(daten.passwort, admin.passwort_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Passwort falsch.")


@router.get("")
async def einstellungen_lesen(db: DbSession, _admin: CurrentAdmin) -> dict[str, Any]:
    """Alle app_config-Werte. Wirkt als einzige Quelle der Wahrheit für die
    Einstellungen-UI im Moderator-Bereich."""
    return await config_service.get_all(db, refresh=True)


@router.put("")
async def einstellungen_schreiben(
    db: DbSession, _admin: CurrentAdmin, werte: dict[str, Any]
) -> dict[str, Any]:
    """Schreibt beliebig viele app_config-Werte auf einmal, sofort wirksam
    ohne Neustart (Cache wird invalidiert)."""
    await config_service.set_many(db, werte)
    return await config_service.get_all(db, refresh=True)


@router.post("/logo")
async def logo_hochladen(
    db: DbSession, _admin: CurrentAdmin, datei: UploadFile
) -> dict[str, str]:
    logo_url = await logo_service.logo_speichern(datei)
    await config_service.set(db, "logo_url", logo_url)
    return {"logo_url": logo_url}


@router.post("/email-testen", status_code=status.HTTP_204_NO_CONTENT)
async def email_testen(db: DbSession, _admin: CurrentAdmin) -> None:
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


@router.post("/archivierung-ausfuehren")
async def archivierung_ausfuehren(db: DbSession, _admin: CurrentAdmin) -> dict[str, int]:
    """Stößt die tägliche Archivierung sofort an, unabhängig vom
    Scheduler-Zeitpunkt (z. B. zum Testen nach einer Konfigurationsänderung)."""
    return await archive_service.archiviere_alte_eintraege(db)


# --- Moderator-Konten ----------------------------------------------------------


@router.get("/moderatoren", response_model=list[ModeratorOut])
async def moderatoren_liste(db: DbSession, _admin: CurrentAdmin) -> list[ModeratorOut]:
    return await moderator_service.liste_moderatoren(db)


@router.post(
    "/moderatoren", response_model=ModeratorOut, status_code=status.HTTP_201_CREATED
)
async def moderator_anlegen(
    db: DbSession, _admin: CurrentAdmin, daten: ModeratorAnlegen
) -> ModeratorOut:
    if await moderator_service.get_moderator_by_username(db, daten.username) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Benutzername bereits vergeben."
        )
    return await moderator_service.moderator_anlegen(db, daten.username, daten.passwort, daten.rolle)


@router.put("/moderatoren/{moderator_id}/passwort", response_model=ModeratorOut)
async def moderator_passwort_aendern(
    db: DbSession, _admin: CurrentAdmin, moderator_id: int, daten: ModeratorPasswortAendern
) -> ModeratorOut:
    ziel = await moderator_service.get_moderator(db, moderator_id)
    if ziel is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Moderator nicht gefunden.")
    return await moderator_service.moderator_passwort_aendern(db, ziel, daten.passwort)


@router.delete("/moderatoren/{moderator_id}", status_code=status.HTTP_204_NO_CONTENT)
async def moderator_loeschen(db: DbSession, admin: CurrentAdmin, moderator_id: int) -> None:
    ziel = await moderator_service.get_moderator(db, moderator_id)
    if ziel is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Moderator nicht gefunden.")
    if ziel.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Du kannst dich nicht selbst löschen."
        )
    if await moderator_service.anzahl_moderatoren(db) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Der letzte verbleibende Moderator-Zugang kann nicht gelöscht werden.",
        )
    await moderator_service.moderator_loeschen(db, ziel)
