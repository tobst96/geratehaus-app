from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.api.deps import CurrentModerator, DbSession, require_modul_zugriff
from app.schemas.moderator import (
    ModeratorAktualisieren,
    ModeratorAnlegen,
    ModeratorOut,
    ModeratorPasswortAendern,
)
from app.services import archive_service, audit_service, logo_service, moderator_service
from app.services.config_service import config_service
from app.services.notifier.email import EmailNotifier

# Phase 4b: granular geschützt – Admins immer (Bypass), sonst Freigabe von
# „einstellungen" nötig.
router = APIRouter(
    prefix="/moderator/einstellungen",
    tags=["moderator:einstellungen"],
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


@router.post("/archivierung-ausfuehren")
async def archivierung_ausfuehren(db: DbSession) -> dict[str, int]:
    """Stößt die tägliche Archivierung sofort an, unabhängig vom
    Scheduler-Zeitpunkt (z. B. zum Testen nach einer Konfigurationsänderung)."""
    return await archive_service.archiviere_alte_eintraege(db)


# --- Moderator-Konten ----------------------------------------------------------


@router.get("/moderatoren", response_model=list[ModeratorOut])
async def moderatoren_liste(db: DbSession) -> list[ModeratorOut]:
    return await moderator_service.liste_moderatoren(db)


@router.post(
    "/moderatoren", response_model=ModeratorOut, status_code=status.HTTP_201_CREATED
)
async def moderator_anlegen(
    db: DbSession, akteur: CurrentModerator, daten: ModeratorAnlegen
) -> ModeratorOut:
    if await moderator_service.get_moderator_by_username(db, daten.username) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Benutzername bereits vergeben."
        )
    neu = await moderator_service.moderator_anlegen(
        db, daten.username, daten.passwort, daten.rolle, daten.email
    )
    await audit_service.protokolliere(
        db, akteur.username, "moderator_angelegt", "moderator", neu.id,
        f"{neu.username} (Rolle {neu.rolle})",
    )
    return neu


@router.patch("/moderatoren/{moderator_id}", response_model=ModeratorOut)
async def moderator_aktualisieren(
    db: DbSession, akteur: CurrentModerator, moderator_id: int, daten: ModeratorAktualisieren
) -> ModeratorOut:
    ziel = await moderator_service.get_moderator(db, moderator_id)
    if ziel is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Moderator nicht gefunden.")
    ergebnis = await moderator_service.moderator_email_setzen(db, ziel, daten.email)
    await audit_service.protokolliere(
        db, akteur.username, "moderator_email_geaendert", "moderator", moderator_id, ziel.username
    )
    return ergebnis


@router.put("/moderatoren/{moderator_id}/passwort", response_model=ModeratorOut)
async def moderator_passwort_aendern(
    db: DbSession, akteur: CurrentModerator, moderator_id: int, daten: ModeratorPasswortAendern
) -> ModeratorOut:
    ziel = await moderator_service.get_moderator(db, moderator_id)
    if ziel is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Moderator nicht gefunden.")
    ergebnis = await moderator_service.moderator_passwort_aendern(db, ziel, daten.passwort)
    await audit_service.protokolliere(
        db, akteur.username, "moderator_passwort_geaendert", "moderator", moderator_id,
        ziel.username,
    )
    return ergebnis


@router.delete("/moderatoren/{moderator_id}", status_code=status.HTTP_204_NO_CONTENT)
async def moderator_loeschen(db: DbSession, admin: CurrentModerator, moderator_id: int) -> None:
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
    name = ziel.username
    await moderator_service.moderator_loeschen(db, ziel)
    await audit_service.protokolliere(
        db, admin.username, "moderator_geloescht", "moderator", moderator_id, name
    )
