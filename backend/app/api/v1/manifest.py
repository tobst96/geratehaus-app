from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import JSONResponse, Response

from app.api.deps import DbSession
from app.core.config import settings
from app.services.config_service import config_service

router = APIRouter(tags=["manifest"])

# Generisches Flammen-Icon als Default, bis ein Logo hochgeladen wurde.
# Als SVG direkt vom Backend ausgeliefert statt als Datei im Frontend-Build,
# damit das Manifest unabhängig davon funktioniert, wie das Frontend gehostet wird.
_STANDARD_ICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<rect width="100" height="100" rx="16" fill="#FFA633"/>
<path d="M50 18c8 12-6 16-6 28 0 8 6 14 14 14 9 0 16-7 16-16 0-10-6-16-10-20 2 8-2 12-6 12-5 0-8-4-8-10 0-4 2-6 0-8z"
      fill="#fff"/>
</svg>"""


@router.get("/standard-icon.svg")
async def standard_icon() -> Response:
    return Response(content=_STANDARD_ICON_SVG, media_type="image/svg+xml")


@router.get("/manifest.webmanifest")
async def manifest(db: DbSession) -> JSONResponse:
    """Generiert das PWA-Manifest dynamisch aus app_config – Name, Icon und
    Theme-Farbe ändern sich sofort mit den Moderator-Einstellungen, ohne
    Neubau des Frontends."""
    organisation_name = await config_service.get(db, "organisation_name", "Meine Feuerwehr")
    farbe_primaer = await config_service.get(db, "farbe_primaer", "#FFA633")
    logo_url = await config_service.get(db, "logo_url", "")

    icons = []
    if logo_url.endswith(".svg"):
        icons.append({"src": logo_url, "sizes": "any", "type": "image/svg+xml"})
    else:
        for groesse in (192, 512):
            icon_pfad = Path(settings.upload_dir) / f"icon-{groesse}.png"
            if icon_pfad.exists():
                icons.append(
                    {"src": f"/uploads/icon-{groesse}.png", "sizes": f"{groesse}x{groesse}", "type": "image/png"}
                )
    if not icons:
        icons.append({"src": "/api/v1/standard-icon.svg", "sizes": "any", "type": "image/svg+xml"})

    return JSONResponse(
        {
            "name": f"{organisation_name} – Gerätehaus.app",
            "short_name": organisation_name,
            "description": "Einsatz-, Dienst- und Fahrzeugverwaltung für Feuerwehren.",
            "start_url": "/",
            "scope": "/",
            "display": "standalone",
            "background_color": "#ffffff",
            "theme_color": farbe_primaer,
            "lang": "de",
            "icons": icons,
        },
        media_type="application/manifest+json",
    )
