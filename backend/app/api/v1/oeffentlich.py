from fastapi import APIRouter

from app.api.deps import DbSession
from app.schemas.oeffentlich import OeffentlicheKonfiguration
from app.services.config_service import config_service

router = APIRouter(tags=["oeffentlich"])


@router.get("/oeffentliche-konfiguration", response_model=OeffentlicheKonfiguration)
async def oeffentliche_konfiguration(db: DbSession) -> OeffentlicheKonfiguration:
    werte = await config_service.get_all(db)
    return OeffentlicheKonfiguration(
        organisation_name=werte.get("organisation_name", "Meine Feuerwehr"),
        logo_url=werte.get("logo_url", ""),
        farbe_primaer=werte.get("farbe_primaer", "#FFA633"),
        farbe_akzent=werte.get("farbe_akzent", "#1A1A1A"),
        pin_laenge=werte.get("pin_laenge", 4),
        modul_einsatztagebuch_aktiv=werte.get("modul_einsatztagebuch_aktiv", True),
        modul_dienstbuch_aktiv=werte.get("modul_dienstbuch_aktiv", True),
        modul_dienststunden_aktiv=werte.get("modul_dienststunden_aktiv", True),
        modul_fahrzeugbuchung_aktiv=werte.get("modul_fahrzeugbuchung_aktiv", True),
    )
