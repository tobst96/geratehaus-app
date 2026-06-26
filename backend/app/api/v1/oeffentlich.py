from fastapi import APIRouter, Depends

from app.api.deps import DbSession
from app.core.rate_limit import rate_limit
from app.schemas.kiosk_token import KioskTokenValidierung
from app.schemas.oeffentlich import OeffentlicheKonfiguration
from app.services import kiosk_token_service
from app.services.config_service import config_service

router = APIRouter(tags=["oeffentlich"])


@router.get(
    "/kiosk-tokens/{token}/validieren",
    response_model=KioskTokenValidierung,
    dependencies=[Depends(rate_limit(20, 60))],
)
async def kiosk_token_validieren(db: DbSession, token: str) -> KioskTokenValidierung:
    """Bewusst ohne Auth – der Token selbst ist das Geheimnis und steckt nur
    in der vom Admin generierten URL, die auf dem Tablet hinterlegt wird."""
    kiosk_token = await kiosk_token_service.get_by_token(db, token)
    if kiosk_token is None:
        return KioskTokenValidierung(gueltig=False)
    await kiosk_token_service.markiere_genutzt(db, kiosk_token)
    return KioskTokenValidierung(gueltig=True)


@router.get("/oeffentliche-konfiguration", response_model=OeffentlicheKonfiguration)
async def oeffentliche_konfiguration(db: DbSession) -> OeffentlicheKonfiguration:
    werte = await config_service.get_all(db)
    return OeffentlicheKonfiguration(
        organisation_name=werte.get("organisation_name", "Meine Feuerwehr"),
        oeffentliche_basis_url=werte.get("oeffentliche_basis_url", ""),
        logo_url=werte.get("logo_url", ""),
        farbe_primaer=werte.get("farbe_primaer", "#FFA633"),
        farbe_akzent=werte.get("farbe_akzent", "#1A1A1A"),
        einsatz_countdown_minuten=werte.get("einsatz_countdown_minuten", 30),
        einsatz_alle_eingetragen_minuten=werte.get("einsatz_alle_eingetragen_minuten", 30),
        modul_einsatztagebuch_aktiv=werte.get("modul_einsatztagebuch_aktiv", True),
        modul_dienstbuch_aktiv=werte.get("modul_dienstbuch_aktiv", True),
        modul_dienststunden_aktiv=werte.get("modul_dienststunden_aktiv", True),
        modul_fahrzeugbuchung_aktiv=werte.get("modul_fahrzeugbuchung_aktiv", True),
        modul_einsatztagebuch_startseite=werte.get("modul_einsatztagebuch_startseite", True),
        modul_dienstbuch_startseite=werte.get("modul_dienstbuch_startseite", True),
        modul_dienststunden_startseite=werte.get("modul_dienststunden_startseite", True),
        modul_fahrzeugbuchung_startseite=werte.get("modul_fahrzeugbuchung_startseite", False),
        modul_einsatztagebuch_aussenzugriff=werte.get("modul_einsatztagebuch_aussenzugriff", False),
        modul_dienstbuch_aussenzugriff=werte.get("modul_dienstbuch_aussenzugriff", False),
        modul_dienststunden_aussenzugriff=werte.get("modul_dienststunden_aussenzugriff", False),
        modul_fahrzeugbuchung_aussenzugriff=werte.get("modul_fahrzeugbuchung_aussenzugriff", False),
    )
