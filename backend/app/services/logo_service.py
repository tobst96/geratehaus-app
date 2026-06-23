import io
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from PIL import Image

from app.core.config import settings

ERLAUBTE_TYPEN = {"image/png": ".png", "image/svg+xml": ".svg"}
MAX_GROESSE_BYTES = 5 * 1024 * 1024
ICON_GROESSEN = (192, 512)


def _icons_generieren(inhalt: bytes, upload_verzeichnis: Path) -> None:
    """Erzeugt quadratische PWA-Icons aus dem hochgeladenen PNG-Logo (zentriert,
    transparenter Hintergrund). Für SVG-Logos wird das Original direkt als
    Icon referenziert (siehe app/api/v1/manifest.py)."""
    original = Image.open(io.BytesIO(inhalt)).convert("RGBA")
    for groesse in ICON_GROESSEN:
        canvas = Image.new("RGBA", (groesse, groesse), (0, 0, 0, 0))
        kopie = original.copy()
        kopie.thumbnail((groesse, groesse), Image.LANCZOS)
        position = ((groesse - kopie.width) // 2, (groesse - kopie.height) // 2)
        canvas.paste(kopie, position, kopie)
        canvas.save(upload_verzeichnis / f"icon-{groesse}.png")


async def logo_speichern(datei: UploadFile) -> str:
    """Speichert das hochgeladene Logo (PNG/SVG) und gibt die relative URL
    zurück, die in app_config.logo_url abgelegt wird. Bei PNG-Logos werden
    zusätzlich PWA-Icons (192/512px) automatisch generiert."""
    if datei.content_type not in ERLAUBTE_TYPEN:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Logo muss PNG oder SVG sein.",
        )
    inhalt = await datei.read()
    if len(inhalt) > MAX_GROESSE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Logo darf maximal 5 MB groß sein.",
        )

    upload_verzeichnis = Path(settings.upload_dir)
    upload_verzeichnis.mkdir(parents=True, exist_ok=True)
    dateiname = f"logo{ERLAUBTE_TYPEN[datei.content_type]}"
    zielpfad = upload_verzeichnis / dateiname
    zielpfad.write_bytes(inhalt)

    if datei.content_type == "image/png":
        _icons_generieren(inhalt, upload_verzeichnis)

    return f"/uploads/{dateiname}"
